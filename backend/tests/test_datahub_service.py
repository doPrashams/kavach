"""Unit tests for DataHub context service (fixture mode)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.datahub.fixtures import WRITEBACK_PATH, dataset_urn
from app.datahub.models import (
    AssertionType,
    ContextDocument,
    EntityType,
    IncidentStatus,
)
from app.config import Settings
from app.datahub.service import DataHubContextService

REPO_ROOT = Path(__file__).resolve().parents[2]
WRITEBACK = REPO_ROOT / "data" / "fixtures" / "writeback.jsonl"


@pytest.fixture
def service() -> DataHubContextService:
    """Fixture-backed service with a clean writeback log."""
    if WRITEBACK.exists():
        WRITEBACK.unlink()
    settings = Settings(datahub_gms_url=None, datahub_token=None)
    return DataHubContextService(settings=settings)


@pytest.mark.asyncio
async def test_get_dataset_returns_typed_ref(service: DataHubContextService) -> None:
  ds = await service.get_dataset("main_marts.mart_demand_features")
  assert ds.name == "main_marts.mart_demand_features"
  assert "ml" in ds.tags


@pytest.mark.asyncio
async def test_get_schema_returns_fields(service: DataHubContextService) -> None:
  fields = await service.get_schema("main_marts.mart_demand_features")
  names = {f.name for f in fields}
  assert "next_day_qty" in names


@pytest.mark.asyncio
async def test_get_upstreams_and_downstreams(service: DataHubContextService) -> None:
  ups = await service.get_upstreams("main_marts.mart_demand_features")
  downs = await service.get_downstreams("main_marts.mart_demand_features", column_level=True)
  assert any("stg_" in e.upstream for e in ups)
  assert any("mlModel" in e.downstream for e in downs)


@pytest.mark.asyncio
async def test_get_blast_radius_includes_ml_deployment(service: DataHubContextService) -> None:
  radius = await service.get_blast_radius("main_marts.mart_demand_features.next_day_qty")
  assert any(d.entity_type == EntityType.ML_DEPLOYMENT for d in radius.ml_deployments)
  demo = await service.get_blast_radius_demo()
  serialized = json.dumps(demo)
  assert "mlModelDeployment" in serialized or "deployment" in serialized.lower()


@pytest.mark.asyncio
async def test_get_dataset_queries(service: DataHubContextService) -> None:
  queries = await service.get_dataset_queries("main_marts.mart_demand_features")
  assert len(queries) >= 1
  assert "mart_demand_features" in queries[0].query


@pytest.mark.asyncio
async def test_get_ml_model(service: DataHubContextService) -> None:
  model = await service.get_ml_model(
      "urn:li:mlModel:(urn:li:dataPlatform:mlflow,kavach.demand_forecast,PROD)"
  )
  assert model.name == "kavach.demand_forecast"
  assert len(model.input_features) >= 5


@pytest.mark.asyncio
async def test_get_owners_and_search(service: DataHubContextService) -> None:
  owners = await service.get_owners("main_marts.mart_daily_revenue")
  assert owners[0].email == "data-platform@kavach.demo"
  results = await service.search("revenue")
  assert any("revenue" in r.name for r in results)


def _read_writeback() -> list[dict]:
  if not WRITEBACK.exists():
    return []
  return [json.loads(line) for line in WRITEBACK.read_text(encoding="utf-8").splitlines() if line]


@pytest.mark.asyncio
async def test_write_methods_append_to_writeback(service: DataHubContextService) -> None:
  urn = dataset_urn("main_marts.mart_demand_features")

  doc = await service.save_context_document(
      ContextDocument(urn="", title="Postmortem", body="Root cause: bad join")
  )
  assert doc.urn

  await service.add_tags(urn, ["incident", "resolved"])
  await service.update_description(urn, "Demand features mart")
  incident = await service.create_incident(
      "Stale features",
      "next_day_qty null spike",
      [urn],
  )
  await service.update_incident(incident.urn, status=IncidentStatus.INVESTIGATING)
  await service.resolve_incident(incident.urn)
  await service.emit_assertion(urn, AssertionType.CUSTOM, "next_day_qty not null")
  await service.add_glossary_term(urn, "urn:li:glossaryTerm:demand")

  entries = _read_writeback()
  ops = {e["operation"] for e in entries}
  for expected in (
      "save_context_document",
      "add_tags",
      "update_description",
      "create_incident",
      "update_incident",
      "emit_assertion",
      "add_glossary_term",
  ):
    assert expected in ops
