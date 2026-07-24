"""Deploy artifact and replay recording tests (H11)."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest
import yaml

from app.agents.state import AgentName, IncidentState, IncidentStatus
from app.chaos.scenarios import SCENARIOS, get_scenario
from app.events.bus import EventBus
from app.events.recorder import RECORDINGS_DIR, RunRecorder
from app.events.replay import RunReplayer

REPO_ROOT = Path(__file__).resolve().parents[2]
COMPOSE_FILE = REPO_ROOT / "deploy" / "docker-compose.yml"
SEED_DEMO = REPO_ROOT / "deploy" / "scripts" / "seed_demo.sh"
SMOKE = REPO_ROOT / "deploy" / "scripts" / "smoke.sh"
RECORD_SCRIPT = REPO_ROOT / "deploy" / "scripts" / "record_scenarios.py"

SCENARIO_NAMES = ("freshness_lag", "schema_drift", "null_spike", "value_corruption")


def test_compose_config_valid() -> None:
    """docker-compose.yml parses and defines core services."""
    assert COMPOSE_FILE.is_file()
    data = yaml.safe_load(COMPOSE_FILE.read_text(encoding="utf-8"))
    services = data.get("services", {})
    for name in ("mlflow", "backend"):
        assert name in services
    if subprocess.run(["which", "docker"], capture_output=True).returncode == 0:
        result = subprocess.run(
            ["docker", "compose", "-f", str(COMPOSE_FILE), "config"],
            capture_output=True,
            text=True,
            check=False,
        )
        assert result.returncode == 0, result.stderr


def test_seed_demo_scripts_exist() -> None:
    """seed_demo.sh references pipeline, ML, and record scripts."""
    assert SEED_DEMO.is_file() and SEED_DEMO.stat().st_mode & 0o111
    assert SMOKE.is_file() and SMOKE.stat().st_mode & 0o111
    assert RECORD_SCRIPT.is_file()
    text = SEED_DEMO.read_text(encoding="utf-8")
    assert "pipeline.py" in text
    assert "train.py" in text
    assert "record_scenarios.py" in text


def _find_recording(scenario: str) -> Path:
    matches = sorted(RECORDINGS_DIR.glob(f"*{scenario}*.jsonl"))
    assert matches, f"no recording for scenario {scenario}"
    return matches[0]


def _final_state_from_recording(path: Path) -> IncidentState:
    events = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            events.append(json.loads(line))
    snapshot = next((e for e in reversed(events) if e.get("event_type") == "incident_state"), None)
    assert snapshot is not None, f"missing incident_state snapshot in {path.name}"
    return IncidentState.model_validate(snapshot["payload"])


@pytest.mark.parametrize("scenario", SCENARIO_NAMES)
def test_recording_present_and_complete(scenario: str) -> None:
    """Each chaos scenario has a committed recording with resolved state."""
    path = _find_recording(scenario)
    state = _final_state_from_recording(path)
    expected = get_scenario(scenario).meta.root_cause
    assert state.root_cause == expected
    assert state.status == IncidentStatus.RESOLVED
    assert state.postmortem
    assert state.fix_plan is not None


@pytest.mark.asyncio
@pytest.mark.parametrize("scenario", SCENARIO_NAMES)
async def test_recording_replays_offline(scenario: str) -> None:
    """Replay publishes all events without LLM/API keys."""
    path = _find_recording(scenario)
    run_id = path.stem
    recorder = RunRecorder(base_dir=RECORDINGS_DIR)
    source = recorder.load(run_id)
    if not source:
        # load by copying stem as run_id inside file
        lines = path.read_text(encoding="utf-8").splitlines()
        first = json.loads(lines[0])
        run_id = first["run_id"]
        source = [
            __import__("app.agents.state", fromlist=["AgentEvent"]).AgentEvent.model_validate_json(
                line
            )
            for line in lines
            if line.strip()
        ]

    bus = EventBus()
    replayer = RunReplayer(recorder=recorder, bus=bus)
    replayed = await replayer.replay(run_id, speed="fast", bus=bus)
    assert len(replayed) >= 6
    agents = {e.agent for e in replayed}
    assert AgentName.SENTINEL in agents
    assert AgentName.COMMS in agents

    final = _final_state_from_recording(path)
    assert final.status == IncidentStatus.RESOLVED


def test_simulated_extras_recorded() -> None:
    """Two simulated scenario recordings exist for the war room library."""
    for name in ("healthcare_pii", "nyc_taxi_freshness"):
        matches = list(RECORDINGS_DIR.glob(f"*{name}*.jsonl"))
        assert matches, f"missing simulated recording for {name}"
