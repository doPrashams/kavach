#!/usr/bin/env python3
"""Record chaos + simulated scenario runs for offline replay (StubLLM, no API keys)."""

from __future__ import annotations

import asyncio
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.agents.graph import run_incident  # noqa: E402
from app.agents.state import AgentEvent, AgentName, IncidentStatus  # noqa: E402
from app.chaos.engine import ChaosEngine  # noqa: E402
from app.chaos.scenarios import SCENARIOS, get_scenario  # noqa: E402
from app.config import Settings  # noqa: E402
from app.events.bus import EventBus  # noqa: E402
from app.events.recorder import RECORDINGS_DIR, RunRecorder  # noqa: E402

SEED = 42
SIMULATED = {
    "healthcare_pii": {
        "base_scenario": "null_spike",
        "summary": "Healthcare PII exposure (simulated)",
        "root_cause": "Simulated PHI column detected in export feed (demo only)",
    },
    "nyc_taxi_freshness": {
        "base_scenario": "freshness_lag",
        "summary": "NYC taxi freshness SLA breach (simulated)",
        "root_cause": "Simulated taxi trip data freshness exceeded 6h SLA (demo only)",
    },
}


def stub_settings() -> Settings:
    return Settings(
        datahub_gms_url=None,
        datahub_token=None,
        llm_provider="stub",
        openai_api_key=None,
        anthropic_api_key=None,
    )


def _append_state_snapshot(recorder: RunRecorder, state) -> None:
    recorder.record(
        AgentEvent(
            run_id=state.run_id,
            agent=AgentName.COMMS,
            event_type="incident_state",
            message="final",
            payload=state.model_dump(mode="json"),
        )
    )


async def record_chaos_scenario(
    scenario: str,
    *,
    engine: ChaosEngine,
    recorder: RunRecorder,
    settings: Settings,
) -> Path:
    try:
        engine.heal(scenario)
    except Exception:
        pass

    engine.inject(scenario, SEED)
    trigger = engine.build_trigger(scenario, SEED)
    bus = EventBus()
    state = await run_incident(trigger, bus=bus, recorder=recorder, settings=settings)
    _append_state_snapshot(recorder, state)

    dest_name = f"chaos_{scenario}_seed{SEED}.jsonl"
    src = recorder.path_for(state.run_id)
    dest = RECORDINGS_DIR / dest_name
    shutil.copy2(src, dest)
    engine.heal(scenario)
    return dest


async def record_simulated(
    name: str,
    meta: dict,
    *,
    engine: ChaosEngine,
    settings: Settings,
) -> Path:
    base = meta["base_scenario"]
    try:
        engine.heal(base)
    except Exception:
        pass
    engine.inject(base, SEED)
    trigger = engine.build_trigger(base, SEED)
    trigger["simulated"] = True
    trigger["display_name"] = name

    recorder = RunRecorder()
    bus = EventBus()
    state = await run_incident(trigger, bus=bus, recorder=recorder, settings=settings)
    state.trigger["scenario"] = name
    state.root_cause = meta["root_cause"]
    state.findings.insert(0, meta["summary"])
    _append_state_snapshot(recorder, state)

    dest_name = f"simulated_{name}_seed{SEED}.jsonl"
    dest = RECORDINGS_DIR / dest_name
    shutil.copy2(recorder.path_for(state.run_id), dest)
    engine.heal(base)
    return dest


async def main() -> None:
    RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    settings = stub_settings()
    engine = ChaosEngine()
    recorder = RunRecorder()

    for scenario in SCENARIOS:
        path = await record_chaos_scenario(
            scenario, engine=engine, recorder=recorder, settings=settings
        )
        print(f"recorded {path.name}")

    for name, meta in SIMULATED.items():
        path = await record_simulated(name, meta, engine=engine, settings=settings)
        print(f"recorded {path.name}")

    print("done")


if __name__ == "__main__":
    asyncio.run(main())
