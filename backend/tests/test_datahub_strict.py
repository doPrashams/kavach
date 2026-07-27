"""Strict-mode DataHubClient must not silently fall back to fixtures."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from app.config import Settings
from app.datahub.client import DataHubClient
from app.errors import DataHubError


@pytest.mark.asyncio
async def test_strict_client_raises_on_mcp_404(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, text="missing")

    transport = httpx.MockTransport(handler)
    real = httpx.AsyncClient

    def factory(*args: Any, **kwargs: Any) -> httpx.AsyncClient:
        kwargs["transport"] = transport
        return real(*args, **kwargs)

    monkeypatch.setattr(httpx, "AsyncClient", factory)

    settings = Settings(
        datahub_gms_url="http://mcp.test:8080",
        datahub_token="tok",
        kavach_strict_datahub=True,
    )
    client = DataHubClient(settings=settings)
    with pytest.raises(DataHubError):
        await client.search("mart")
