"""Chaos engine and scenario tests."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

from app.agents.graph import run_incident
from app.chaos.engine import ChaosEngine
from app.chaos.scenarios import SCENARIOS, get_scenario, list_scenarios
from app.chaos.warehouse import Warehouse
from app.config import Settings
from app.datahub.models import EntityType
from app.events.bus import EventBus
from app.events.recorder import RunRecorder

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = REPO_ROOT / "data"
PIPELINE = DATA_ROOT / "pipeline.py"
WRITEBACK = DATA_ROOT / "fixtures" / "writeback.jsonl"

SCENARIO_NAMES = (
    "freshness_lag",
    "schema_drift",
    "null_spike",
    "value_corruption",
)


@pytest.fixture(scope="module")
def built_warehouse() -> None:
    """Ensure the default warehouse is built."""
    result = subprocess.run(
        [sys.executable, str(PIPELINE), "build"],
        cwd=DATA_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        pytest.skip(f"pipeline build failed: {result.stderr}")


@pytest.fixture
def engine(built_warehouse: None) -> ChaosEngine:
    """Fresh chaos engine bound to the default warehouse."""
    return ChaosEngine()


@pytest.fixture
def stub_settings() -> Settings:
    return Settings(
        datahub_gms_url=None,
        datahub_token=None,
        llm_provider="stub",
        openai_api_key=None,
        anthropic_api_key=None,
    )


def test_four_scenarios_registered() -> None:
    """All four chaos scenarios are registered."""
    assert list_scenarios() == sorted(SCENARIO_NAMES)
    for name in SCENARIO_NAMES:
        assert name in SCENARIOS


@pytest.mark.parametrize("scenario_name", SCENARIO_NAMES)
def test_inject_is_deterministic(engine: ChaosEngine, scenario_name: str) -> None:
    """Same (scenario, seed) yields identical post-injection checksum."""
    sc = get_scenario(scenario_name)
    tables = list(sc.meta.affected_tables)
    raw_tables = [t for t in tables if t.startswith("raw.")]
    key_tables = raw_tables or tables[:1]

    event_a = engine.inject(scenario_name, seed=7)
    checksum_a = dict(event_a.checksum_after)

    engine.heal(scenario_name)
    event_b = engine.inject(scenario_name, seed=7)
    checksum_b = dict(event_b.checksum_after)

    for table in key_tables:
        if table in checksum_a and table in checksum_b:
            assert checksum_a[table] == checksum_b[table]

    engine.heal(scenario_name)


@pytest.mark.parametrize("scenario_name", SCENARIO_NAMES)
def test_heal_restores_checksum(engine: ChaosEngine, scenario_name: str) -> None:
    """Heal restores pre-injection table checksums."""
    sc = get_scenario(scenario_name)
    raw_tables = [t for t in sc.meta.affected_tables if t.startswith("raw.")]
    if not raw_tables:
        raw_tables = ["raw.orders"]

    before = engine.warehouse.checksum_tables(raw_tables)
    event = engine.inject(scenario_name, seed=99)
    assert event.checksum_after != event.checksum_before

    engine.heal(scenario_name)
    after = engine.warehouse.checksum_tables(raw_tables)
    assert after == before


@pytest.mark.parametrize("scenario_name", SCENARIO_NAMES)
def test_expected_signal_matches_scenario(scenario_name: str) -> None:
    """Each scenario exposes a detectable assertion signal."""
    sc = get_scenario(scenario_name)
    signal = sc.expected_signal()
    assert signal.description
    assert signal.dataset
    assert signal.assertion_type.value in {"freshness", "schema", "custom", "volume"}


def test_value_corruption_blast_radius_includes_ml_deployment() -> None:
    """Value corruption blast radius includes the ML deployment."""
    sc = get_scenario("value_corruption")
    radius = sc.expected_blast_radius()
    assert any("demand_forecast" in entity for entity in radius)
    assert any("prod" in entity for entity in radius)


@pytest.mark.asyncio
async def test_chaos_inject_agent_cycle_identifies_root_cause(
    engine: ChaosEngine,
    stub_settings: Settings,
    tmp_path: Path,
) -> None:
    """Inject → agent run identifies the scenario root cause."""
    if WRITEBACK.exists():
        WRITEBACK.unlink()

    scenario = "value_corruption"
    seed = 42
    engine.inject(scenario, seed)
    trigger = engine.build_trigger(scenario, seed)

    recorder = RunRecorder(base_dir=tmp_path / "recordings")
    bus = EventBus()
    state = await run_incident(
        trigger,
        bus=bus,
        recorder=recorder,
        settings=stub_settings,
    )

    expected = get_scenario(scenario).meta.root_cause
    assert state.root_cause == expected
    assert state.blast_radius is not None
    assert any(
        d.entity_type == EntityType.ML_DEPLOYMENT for d in state.blast_radius.ml_deployments
    )

    engine.heal(scenario)


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario_name", SCENARIO_NAMES)
async def test_each_scenario_agent_cycle(
    scenario_name: str,
    engine: ChaosEngine,
    stub_settings: Settings,
    tmp_path: Path,
) -> None:
    """Each scenario completes an agent run with matching root cause."""
    if WRITEBACK.exists():
        WRITEBACK.unlink()

    engine.inject(scenario_name, seed=11)
    trigger = engine.build_trigger(scenario_name, 11)
    state = await run_incident(
        trigger,
        bus=EventBus(),
        recorder=RunRecorder(base_dir=tmp_path / f"rec-{scenario_name}"),
        settings=stub_settings,
    )
    assert state.root_cause == get_scenario(scenario_name).meta.root_cause
    engine.heal(scenario_name)
