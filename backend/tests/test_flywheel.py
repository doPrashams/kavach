"""Flywheel retrieval and MTTR tests."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from app.agents.graph import run_incident
from app.chaos.engine import ChaosEngine
from app.config import Settings
from app.datahub.models import ContextDocument
from app.events.bus import EventBus
from app.events.recorder import RunRecorder
from app.flywheel.mttr import MTTR_PATH, compute_mttr, load_records, mttr_trend, record_mttr
from app.flywheel.retriever import find_similar
from app.flywheel.store import STORE, deterministic_embed

REPO_ROOT = Path(__file__).resolve().parents[2]
WRITEBACK = REPO_ROOT / "data" / "fixtures" / "writeback.jsonl"
PIPELINE = REPO_ROOT / "data" / "pipeline.py"


@pytest.fixture(scope="module")
def built_warehouse() -> None:
    """Ensure warehouse is in a good state."""
    subprocess.run(
        [sys.executable, str(PIPELINE), "build"],
        cwd=REPO_ROOT / "data",
        check=True,
    )


@pytest.fixture
def stub_settings() -> Settings:
    return Settings(
        datahub_gms_url=None,
        datahub_token=None,
        llm_provider="stub",
        openai_api_key=None,
        anthropic_api_key=None,
        github_pat=None,
    )


@pytest.fixture(autouse=True)
def reset_flywheel(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Isolate flywheel state per test."""
    STORE.clear()
    metrics = tmp_path / "metrics"
    metrics.mkdir()
    mttr_file = metrics / "mttr.jsonl"
    monkeypatch.setattr("app.flywheel.mttr.MTTR_PATH", mttr_file)
    monkeypatch.setattr("app.flywheel.mttr.METRICS_DIR", metrics)
    if WRITEBACK.exists():
        WRITEBACK.unlink()


def test_deterministic_embedding() -> None:
    """Embeddings are stable in test mode."""
    a = deterministic_embed("schema drift order_items quantity")
    b = deterministic_embed("schema drift order_items quantity")
    assert a == b


def test_store_and_retrieve_top_hit() -> None:
    """Stored postmortem is top hit for same scenario incident."""
    from app.agents.state import IncidentState

    STORE.index_document(
        ContextDocument(
            urn="urn:li:contextDocument:pm1",
            title="Postmortem schema_drift",
            body="Root cause: supplier renamed qty column\nFix: coalesce guard",
            tags=["postmortem", "schema_drift"],
        ),
        scenario="schema_drift",
    )
    incident = IncidentState(
        run_id="run-2",
        trigger={"type": "chaos", "scenario": "schema_drift", "root_cause": "schema drift"},
    )
    hits = find_similar(incident, k=1)
    assert hits
    assert hits[0].scenario == "schema_drift"
    assert hits[0].similarity > 0


@pytest.mark.asyncio
async def test_repeated_scenario_flywheel(
    built_warehouse: None,
    stub_settings: Settings,
    tmp_path: Path,
) -> None:
    """Second run cites prior postmortem and has lower MTTR."""
    engine = ChaosEngine()
    scenario = "schema_drift"
    seed = 21

    engine.inject(scenario, seed)
    trigger = engine.build_trigger(scenario, seed)
    first_rec = RunRecorder(base_dir=tmp_path / "first")
    first = await run_incident(
        trigger,
        bus=EventBus(),
        recorder=first_rec,
        settings=stub_settings,
    )
    first_events = first_rec.load(first.run_id)
    first_mttr = compute_mttr(first, events=first_events)
    assert not any(e.event_type == "prior_postmortem_cited" for e in first_events)

    engine.heal(scenario)
    engine.inject(scenario, seed)
    trigger2 = engine.build_trigger(scenario, seed)
    second_rec = RunRecorder(base_dir=tmp_path / "second")
    second = await run_incident(
        trigger2,
        bus=EventBus(),
        recorder=second_rec,
        settings=stub_settings,
    )
    second_events = second_rec.load(second.run_id)
    second_mttr = compute_mttr(second, events=second_events)
    assert any(e.event_type == "prior_postmortem_cited" for e in second_events)
    assert second_mttr < first_mttr

    trend = mttr_trend(scenario=scenario)
    assert len(trend) >= 2
    assert trend[-1] < trend[-2]

    engine.heal(scenario)


@pytest.mark.asyncio
async def test_mttr_recorded_to_jsonl(
    built_warehouse: None,
    stub_settings: Settings,
    tmp_path: Path,
) -> None:
    """MTTR records persist to jsonl."""
    engine = ChaosEngine()
    scenario = "schema_drift"
    engine.inject(scenario, 3)
    state = await run_incident(
        engine.build_trigger(scenario, 3),
        bus=EventBus(),
        recorder=RunRecorder(base_dir=tmp_path / "rec"),
        settings=stub_settings,
    )
    record_mttr(state, cited_prior=False)
    records = load_records(scenario=scenario)
    assert records
    assert records[-1].run_id == state.run_id
    engine.heal(scenario)
