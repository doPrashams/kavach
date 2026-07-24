"""Event bus record and replay tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.agents.graph import run_incident
from app.agents.state import AgentEvent, AgentName
from app.config import Settings
from app.events.bus import EventBus
from app.events.recorder import RunRecorder
from app.events.replay import RunReplayer

SOURCE_RUN = "replay-source-run"


@pytest.fixture
def stub_settings() -> Settings:
    return Settings(
        datahub_gms_url=None,
        datahub_token=None,
        llm_provider="stub",
    )


@pytest.mark.asyncio
async def test_record_then_replay_is_deterministic(
    stub_settings: Settings,
    tmp_path: Path,
) -> None:
    source_bus = EventBus()
    recorder = RunRecorder(base_dir=tmp_path / "recordings")

    state = await run_incident(
        {"type": "test"},
        bus=source_bus,
        recorder=recorder,
        settings=stub_settings,
    )
    original = recorder.load(state.run_id)
    assert len(original) >= 6

    replay_bus = EventBus()
    replayer = RunReplayer(recorder=recorder, bus=replay_bus)
    replayed = await replayer.replay(state.run_id, speed="fast", bus=replay_bus)

    assert len(replayed) == len(original)
    for src, rep in zip(original, replayed, strict=True):
        assert src.agent == rep.agent
        assert src.event_type == rep.event_type
        assert src.message == rep.message


@pytest.mark.asyncio
async def test_replay_without_llm_or_api_keys(tmp_path: Path) -> None:
    """Replay publishes canned events with zero external calls."""
    recorder = RunRecorder(base_dir=tmp_path / "recordings")
    events = [
        AgentEvent(run_id=SOURCE_RUN, agent=AgentName.SENTINEL, event_type="test", message="one"),
        AgentEvent(run_id=SOURCE_RUN, agent=AgentName.COMMS, event_type="test", message="two"),
    ]
    for event in events:
        recorder.record(event)

    bus = EventBus()
    replayer = RunReplayer(recorder=recorder)
    replayed = await replayer.replay(SOURCE_RUN, bus=bus)
    assert len(replayed) == 2
    assert bus.get_history(SOURCE_RUN)
