"""Async MCP Streamable HTTP / JSON-RPC 2.0 client for DataHub."""

from __future__ import annotations

import itertools
import json
from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception, stop_after_attempt, wait_exponential

from app.config import Settings
from app.errors import DataHubError

logger = structlog.get_logger(__name__)

DEFAULT_TIMEOUT = 30.0
PROTOCOL_VERSION = "2025-06-18"
CLIENT_INFO = {"name": "kavach", "version": "0.1.0"}


def _is_retryable(exc: BaseException) -> bool:
    """Retry transport/timeouts and 5xx; never retry client protocol/4xx errors."""
    if isinstance(exc, DataHubError):
        return False
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code >= 500
    return isinstance(exc, (httpx.TransportError, httpx.TimeoutException))


class DataHubMCPClient:
    """Connect to a DataHub MCP Streamable HTTP endpoint via JSON-RPC 2.0."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        base = (settings.datahub_gms_url or "").rstrip("/")
        self._endpoint = f"{base}/mcp" if base else ""
        self._token = settings.datahub_token
        self._session_id: str | None = None
        self._initialized = False
        self._ids = itertools.count(1)
        self._protocol_version = PROTOCOL_VERSION

    @property
    def is_configured(self) -> bool:
        """Return True when live MCP endpoint credentials are present."""
        return bool(self._endpoint and self._token)

    def _headers(self, *, with_session: bool = True) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "MCP-Protocol-Version": self._protocol_version,
        }
        if with_session and self._session_id:
            headers["Mcp-Session-Id"] = self._session_id
        return headers

    @staticmethod
    def _parse_sse_payload(body: str) -> dict[str, Any]:
        """Extract the last JSON-RPC object from an SSE response body."""
        data_lines: list[str] = []
        last: dict[str, Any] | None = None
        for line in body.splitlines():
            if line.startswith("data:"):
                data_lines.append(line[5:].lstrip())
            elif line.strip() == "" and data_lines:
                chunk = "\n".join(data_lines)
                data_lines = []
                try:
                    parsed = json.loads(chunk)
                except json.JSONDecodeError:
                    continue
                if isinstance(parsed, dict):
                    last = parsed
        if data_lines:
            chunk = "\n".join(data_lines)
            try:
                parsed = json.loads(chunk)
                if isinstance(parsed, dict):
                    last = parsed
            except json.JSONDecodeError:
                pass
        if last is None:
            raise DataHubError("MCP SSE response missing JSON-RPC payload")
        return last

    def _decode_response(self, response: httpx.Response) -> dict[str, Any]:
        content_type = response.headers.get("content-type", "")
        if "text/event-stream" in content_type:
            return self._parse_sse_payload(response.text)
        try:
            payload = response.json()
        except json.JSONDecodeError as exc:
            raise DataHubError("MCP response is not valid JSON") from exc
        if not isinstance(payload, dict):
            raise DataHubError("Unexpected MCP JSON-RPC envelope")
        return payload

    def _raise_for_status(self, response: httpx.Response) -> None:
        if response.status_code == 404:
            raise DataHubError(
                f"MCP endpoint not found (HTTP 404): {self._endpoint}"
            )
        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise DataHubError(
                f"MCP HTTP {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc

    async def _post(
        self,
        payload: dict[str, Any],
        *,
        with_session: bool = True,
        client: httpx.AsyncClient,
    ) -> tuple[httpx.Response, dict[str, Any] | None]:
        response = await client.post(
            self._endpoint,
            headers=self._headers(with_session=with_session),
            content=json.dumps(payload),
        )
        # Notifications may return 202 with empty body.
        if response.status_code == 202:
            return response, None
        self._raise_for_status(response)
        session = response.headers.get("mcp-session-id") or response.headers.get(
            "Mcp-Session-Id"
        )
        if session:
            self._session_id = session
        return response, self._decode_response(response)

    async def _rpc(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        *,
        with_session: bool = True,
        client: httpx.AsyncClient,
    ) -> Any:
        req_id = next(self._ids)
        body: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": req_id,
            "method": method,
        }
        if params is not None:
            body["params"] = params
        _, envelope = await self._post(body, with_session=with_session, client=client)
        if envelope is None:
            raise DataHubError(f"MCP method {method} returned empty response")
        if "error" in envelope:
            err = envelope["error"]
            raise DataHubError(f"MCP JSON-RPC error on {method}: {err}")
        if "result" not in envelope:
            raise DataHubError(f"MCP JSON-RPC response missing result for {method}")
        return envelope["result"]

    async def initialize(self) -> dict[str, Any]:
        """Perform the MCP initialize handshake (and optional session header)."""
        if not self.is_configured:
            raise DataHubError("MCP client not configured")
        self._session_id = None
        self._initialized = False
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            result = await self._rpc(
                "initialize",
                {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {}},
                    "clientInfo": CLIENT_INFO,
                },
                with_session=False,
                client=client,
            )
            if isinstance(result, dict):
                negotiated = result.get("protocolVersion")
                if isinstance(negotiated, str) and negotiated:
                    self._protocol_version = negotiated
            # notifications/initialized (JSON-RPC notification — no id)
            await self._post(
                {
                    "jsonrpc": "2.0",
                    "method": "notifications/initialized",
                },
                with_session=True,
                client=client,
            )
        self._initialized = True
        logger.info(
            "datahub.mcp.initialized",
            endpoint=self._endpoint,
            session=bool(self._session_id),
            protocol=self._protocol_version,
        )
        return result if isinstance(result, dict) else {"result": result}

    async def _ensure_initialized(self, client: httpx.AsyncClient) -> None:
        if self._initialized:
            return
        # Inline initialize using the shared client (avoid nested clients).
        self._session_id = None
        result = await self._rpc(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "clientInfo": CLIENT_INFO,
            },
            with_session=False,
            client=client,
        )
        if isinstance(result, dict):
            negotiated = result.get("protocolVersion")
            if isinstance(negotiated, str) and negotiated:
                self._protocol_version = negotiated
        await self._post(
            {"jsonrpc": "2.0", "method": "notifications/initialized"},
            with_session=True,
            client=client,
        )
        self._initialized = True

    @staticmethod
    def _unwrap_tool_result(result: Any) -> Any:
        """Normalize tools/call result content for Kavach backends."""
        if not isinstance(result, dict):
            return result
        if result.get("isError"):
            raise DataHubError(f"MCP tool error: {result}")
        content = result.get("content")
        if isinstance(content, list) and content:
            texts: list[str] = []
            for item in content:
                if isinstance(item, dict) and item.get("type") == "text":
                    texts.append(str(item.get("text", "")))
            if len(texts) == 1:
                text = texts[0]
                try:
                    return json.loads(text)
                except (json.JSONDecodeError, TypeError):
                    return text
            if texts:
                return texts
        if "structuredContent" in result:
            return result["structuredContent"]
        return result.get("result", result)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_is_retryable),
        reraise=True,
    )
    async def list_tools(self) -> list[dict[str, Any]]:
        """List MCP tools via JSON-RPC tools/list."""
        if not self.is_configured:
            raise DataHubError("MCP client not configured")
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            await self._ensure_initialized(client)
            result = await self._rpc("tools/list", {}, client=client)
        tools = result.get("tools", result) if isinstance(result, dict) else result
        if not isinstance(tools, list):
            raise DataHubError("Unexpected MCP tools/list response")
        return [t for t in tools if isinstance(t, dict)]

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        retry=retry_if_exception(_is_retryable),
        reraise=True,
    )
    async def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> Any:
        """Invoke an MCP tool via JSON-RPC tools/call."""
        if not self.is_configured:
            raise DataHubError("MCP client not configured")
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            await self._ensure_initialized(client)
            try:
                result = await self._rpc(
                    "tools/call",
                    {"name": name, "arguments": arguments or {}},
                    client=client,
                )
            except DataHubError as exc:
                # Stale session → re-handshake once per call_tool attempt.
                if "404" in str(exc) and self._session_id:
                    logger.warning("datahub.mcp.session_reset", tool=name)
                    self._initialized = False
                    self._session_id = None
                    await self._ensure_initialized(client)
                    result = await self._rpc(
                        "tools/call",
                        {"name": name, "arguments": arguments or {}},
                        client=client,
                    )
                else:
                    raise
        return self._unwrap_tool_result(result)
