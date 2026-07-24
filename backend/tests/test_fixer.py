"""Fixer codegen and PR flow tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.agents.graph import run_incident
from app.agents.state import IncidentState
from app.chaos.engine import ChaosEngine
from app.chaos.scenarios import SCENARIOS
from app.config import Settings
from app.events.bus import EventBus
from app.events.recorder import RunRecorder
from app.fixer.codegen import generate_fix
from app.fixer.github import EXAMPLES_ROOT, get_fix_artifacts, open_pr

REPO_ROOT = Path(__file__).resolve().parents[2]
WRITEBACK = REPO_ROOT / "data" / "fixtures" / "writeback.jsonl"

SCENARIOS_LIST = ("freshness_lag", "schema_drift", "null_spike", "value_corruption")


def _incident_for(scenario: str) -> IncidentState:
    sc = SCENARIOS[scenario]
    return IncidentState(
        run_id=f"test-{scenario}-run",
        incident_id=f"inc-{scenario}",
        incident_urn=f"urn:li:incident:{scenario}",
        trigger={"type": "chaos", "scenario": scenario},
        root_cause=sc.meta.root_cause,
    )


@pytest.fixture
def stub_settings() -> Settings:
    return Settings(
        llm_provider="stub",
        github_pat=None,
        openai_api_key=None,
        anthropic_api_key=None,
    )


@pytest.mark.parametrize("scenario", SCENARIOS_LIST)
def test_generate_fix_produces_valid_artifacts(scenario: str) -> None:
    """Each scenario yields parseable dbt SQL and schema content."""
    incident = _incident_for(scenario)
    artifacts = generate_fix(incident)
    assert artifacts.scenario == scenario
    assert artifacts.pr_body
    assert "DataHub incident" in artifacts.pr_body
    assert "Blast radius" in artifacts.pr_body
    assert artifacts.diff

    assert artifacts.files

    for path, content in artifacts.files.items():
        if path.endswith(".sql"):
            assert "select" in content.lower()
            assert "from" in content.lower()


@pytest.mark.parametrize("scenario", SCENARIOS_LIST)
def test_value_corruption_includes_ml_note(scenario: str) -> None:
    """Value corruption PR body references ML Guardian safeguard."""
    incident = _incident_for(scenario)
    incident.ml_hold_recommended = scenario == "value_corruption"
    artifacts = generate_fix(incident)
    if scenario == "value_corruption":
        assert "ML Guardian" in artifacts.pr_body
        assert "demand_forecast" in artifacts.pr_body


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", SCENARIOS_LIST)
async def test_dry_run_writes_examples(stub_settings: Settings, scenario: str) -> None:
    """Dry-run populates examples/prs/<scenario>/ completely."""
    incident = _incident_for(scenario)
    artifacts = generate_fix(incident)
    ref = await open_pr(artifacts, stub_settings)
    assert ref.startswith("dry-run://")

    out_dir = EXAMPLES_ROOT / scenario
    assert (out_dir / "branch.txt").exists()
    assert (out_dir / "diff.patch").exists()
    assert (out_dir / "pr_body.md").exists()
    assert (out_dir / "files").is_dir()
    assert list((out_dir / "files").rglob("*"))


@pytest.mark.asyncio
async def test_fixer_wired_in_graph(stub_settings: Settings, tmp_path: Path) -> None:
    """Full graph run stores fix artifacts retrievable by run_id."""
    if WRITEBACK.exists():
        WRITEBACK.unlink()

    engine = ChaosEngine()
    scenario = "schema_drift"
    engine.inject(scenario, seed=5)
    trigger = engine.build_trigger(scenario, 5)
    state = await run_incident(
        trigger,
        bus=EventBus(),
        recorder=RunRecorder(base_dir=tmp_path / "rec"),
        settings=stub_settings,
    )
    stored = get_fix_artifacts(state.run_id)
    assert stored is not None
    assert stored.scenario == scenario
    engine.heal(scenario)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_live_pr_skipped_without_pat(stub_settings: Settings) -> None:
    """Live PR path requires GITHUB_PAT."""
    if stub_settings.github_pat:
        pytest.skip("dry-run only in CI")
    incident = _incident_for("null_spike")
    artifacts = generate_fix(incident)
    ref = await open_pr(artifacts, stub_settings)
    assert ref.startswith("dry-run://")
