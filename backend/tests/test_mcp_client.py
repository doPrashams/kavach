"""Unit tests for the DataHub MCP JSON-RPC / Streamable HTTP client."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from app.config import Settings
from app.datahub.mcp import DataHubMCPClient
from app.errors import DataHubError


def _settings() -> Settings:
    return Settings(
        datahub_gms_url="http://mcp.test:8080",
        datahub_token="test-token",
    )


def _jsonrpc_result(req_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": req_id, "result": result}


def _patch_transport(monkeypatch: pytest.MonkeyPatch, handler: Any) -> None:
    transport = httpx.MockTransport(handler)
    real_async_client = httpx.AsyncClient

    def factory(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return real_async_client(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)


@pytest.mark.asyncio
async def test_initialize_list_and_call_tool(monkeypatch: pytest.MonkeyPatch) -> None:
    """Offline handshake + tools/list + tools/call against a mock transport."""

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert str(request.url) == "http://mcp.test:8080/mcp"
        assert request.headers["authorization"] == "Bearer test-token"
        assert "application/json" in request.headers["accept"]
        body = json.loads(request.content.decode())
        method = body.get("method")

        if method == "initialize":
            assert body["jsonrpc"] == "2.0"
            assert body["params"]["protocolVersion"]
            return httpx.Response(
                200,
                headers={"Mcp-Session-Id": "sess-1", "Content-Type": "application/json"},
                json=_jsonrpc_result(body["id"], {"protocolVersion": "2025-06-18"}),
            )
        if method == "notifications/initialized":
            assert request.headers.get("mcp-session-id") == "sess-1"
            return httpx.Response(202)

        assert request.headers.get("mcp-session-id") == "sess-1"
        if method == "tools/list":
            return httpx.Response(
                200,
                json=_jsonrpc_result(
                    body["id"],
                    {"tools": [{"name": "search", "description": "Search catalog"}]},
                ),
            )
        if method == "tools/call":
            assert body["params"]["name"] == "search"
            payload = {"datasets": [{"name": "mart_orders"}]}
            return httpx.Response(
                200,
                json=_jsonrpc_result(
                    body["id"],
                    {
                        "content": [
                            {"type": "text", "text": json.dumps(payload)},
                        ]
                    },
                ),
            )
        raise AssertionError(f"unexpected method {method}")

    _patch_transport(monkeypatch, handler)
    client = DataHubMCPClient(_settings())

    init = await client.initialize()
    assert init["protocolVersion"] == "2025-06-18"
    tools = await client.list_tools()
    assert tools[0]["name"] == "search"
    result = await client.call_tool("search", {"query": "mart"})
    assert result == {"datasets": [{"name": "mart_orders"}]}


@pytest.mark.asyncio
async def test_http_404_raises_datahub_error(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="not found")

    _patch_transport(monkeypatch, handler)
    client = DataHubMCPClient(_settings())
    with pytest.raises(DataHubError, match="404"):
        await client.list_tools()


@pytest.mark.asyncio
async def test_sse_tools_list_parsing(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        body = json.loads(request.content.decode())
        method = body.get("method")
        if method == "initialize":
            return httpx.Response(
                200,
                headers={"Content-Type": "application/json"},
                json=_jsonrpc_result(body["id"], {"protocolVersion": "2025-06-18"}),
            )
        if method == "notifications/initialized":
            return httpx.Response(202)
        if method == "tools/list":
            tool_payload = {"tools": [{"name": "get_entities"}]}
            data = json.dumps(_jsonrpc_result(body["id"], tool_payload))
            sse = f"event: message\ndata: {data}\n\n"
            return httpx.Response(
                200,
                headers={"Content-Type": "text/event-stream"},
                text=sse,
            )
        raise AssertionError(method)

    _patch_transport(monkeypatch, handler)
    client = DataHubMCPClient(_settings())
    tools = await client.list_tools()
    assert tools[0]["name"] == "get_entities"


def test_is_configured() -> None:
    assert DataHubMCPClient(_settings()).is_configured is True
    assert (
        DataHubMCPClient(Settings(datahub_gms_url=None, datahub_token=None)).is_configured
        is False
    )
