"""Live DataHub integration tests — skipped unless DATAHUB_GMS_URL is set."""

from __future__ import annotations

import os

import pytest

from app.config import Settings
from app.datahub.client import DataHubClient
from app.datahub.mcp import DataHubMCPClient
from app.datahub.service import DataHubContextService
from app.errors import DataHubError

pytestmark = pytest.mark.integration


@pytest.fixture
def live_service() -> DataHubContextService:
    return DataHubContextService()


@pytest.mark.skipif(not os.getenv("DATAHUB_GMS_URL"), reason="DATAHUB_GMS_URL not set")
@pytest.mark.asyncio
async def test_live_search(live_service: DataHubContextService) -> None:
    results = await live_service.search("mart")
    assert isinstance(results, list)


@pytest.mark.skipif(not os.getenv("DATAHUB_GMS_URL"), reason="DATAHUB_GMS_URL not set")
@pytest.mark.skipif(
    os.getenv("KAVACH_STRICT_DATAHUB") != "1",
    reason="KAVACH_STRICT_DATAHUB=1 required",
)
@pytest.mark.asyncio
async def test_strict_mode_protocol_404_fails_loudly() -> None:
    """With strict mode, MCP HTTP 404 / protocol errors must not fall back to fixtures."""
    gms = os.environ["DATAHUB_GMS_URL"].rstrip("/")
    token = os.getenv("DATAHUB_TOKEN") or os.getenv("DATAHUB_GMS_TOKEN") or "strict-test"
    # Deliberately miss the MCP route so protocol failure is deterministic.
    settings = Settings(
        datahub_gms_url=f"{gms}/__kavach_no_mcp__",
        datahub_token=token,
        kavach_strict_datahub=True,
    )
    mcp = DataHubMCPClient(settings)
    assert mcp.is_configured

    with pytest.raises(DataHubError, match="404"):
        await mcp.list_tools()

    client = DataHubClient(settings=settings)
    with pytest.raises(DataHubError):
        await client.search("mart")
