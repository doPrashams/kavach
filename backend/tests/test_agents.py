"""End-to-end agent graph tests with StubLLM."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.agents.graph import run_incident
from app.agents.state import IncidentStatus
from app.config import Settings
from app.datahub.models import EntityType
from app.events.bus import EventBus
from app.events.recorder import RunRecorder

REPO_ROOT = Path(__file__).resolve().parents[2]
WRITEBACK = REPO_ROOT / "data" / "fixtures" / "writeback.jsonl"


@pytest.fixture
def stub_settings() -> Settings:
    return Settings(
        datahub_gms_url=None,
        datahub_token=None,
        llm_provider="stub",
        openai_api_key=None,
        anthropic_api_key=None,
    )


@pytest.fixture
def isolated_bus() -> EventBus:
    return EventBus()


@pytest.mark.asyncio
async def test_full_graph_run_produces_complete_incident_state(
    stub_settings: Settings,
    isolated_bus: EventBus,
    tmp_path: Path,
) -> None:
    if WRITEBACK.exists():
        WRITEBACK.unlink()

    recorder = RunRecorder(base_dir=tmp_path / "recordings")
    state = await run_incident(
        {"type": "anomaly", "column": "next_day_qty"},
        bus=isolated_bus,
        recorder=recorder,
        settings=stub_settings,
    )

    assert state.root_cause
    assert state.blast_radius is not None
    assert any(
        d.entity_type == EntityType.ML_DEPLOYMENT for d in state.blast_radius.ml_deployments
    )
    assert state.fix_plan is not None
    assert state.fix_plan.safeguard_assertion is not None
    assert state.postmortem
    assert state.notification_sent
    assert state.status == IncidentStatus.RESOLVED

    writeback = WRITEBACK.read_text(encoding="utf-8") if WRITEBACK.exists() else ""
    assert "save_context_document" in writeback
    assert "create_incident" in writeback

    recording = recorder.load(state.run_id)
    assert len(recording) >= 6
