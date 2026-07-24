"""Thin async client for the DataHub MCP Server."""

from __future__ import annotations

import json
from typing import Any

import httpx
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import Settings
from app.errors import DataHubError

logger = structlog.get_logger(__name__)

DEFAULT_TIMEOUT = 30.0


class DataHubMCPClient:
    """Connect to DataHub MCP Server, list tools, and invoke them."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        base = (settings.datahub_gms_url or "").rstrip("/")
        self._base_url = f"{base}/mcp" if base else ""
        self._token = settings.datahub_token

    @property
    def is_configured(self) -> bool:
        """Return True when live MCP endpoint credentials are present."""
        return bool(self._base_url and self._token)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._token}",
            "Content-Type": "application/json",
        }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def list_tools(self) -> list[dict[str, Any]]:
        """List MCP tools exposed by the DataHub server."""
        if not self.is_configured:
            raise DataHubError("MCP client not configured")
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.get(f"{self._base_url}/tools", headers=self._headers())
            response.raise_for_status()
            payload = response.json()
            tools = payload.get("tools", payload)
            if not isinstance(tools, list):
                raise DataHubError("Unexpected MCP tools response")
            return tools

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> Any:
        """Invoke an MCP tool by name."""
        if not self.is_configured:
            raise DataHubError("MCP client not configured")
        body = {"name": name, "arguments": arguments or {}}
        async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT) as client:
            response = await client.post(
                f"{self._base_url}/tools/call",
                headers=self._headers(),
                content=json.dumps(body),
            )
            response.raise_for_status()
            payload = response.json()
            return payload.get("result", payload)
