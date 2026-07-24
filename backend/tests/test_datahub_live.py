"""Live DataHub integration tests — skipped unless DATAHUB_GMS_URL is set."""

from __future__ import annotations

import os

import pytest

from app.datahub.service import DataHubContextService

pytestmark = pytest.mark.integration


@pytest.fixture
def live_service() -> DataHubContextService:
    return DataHubContextService()


@pytest.mark.skipif(not os.getenv("DATAHUB_GMS_URL"), reason="DATAHUB_GMS_URL not set")
@pytest.mark.asyncio
async def test_live_search(live_service: DataHubContextService) -> None:
    results = await live_service.search("mart")
    assert isinstance(results, list)
