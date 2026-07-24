"""Replay recorded runs through the event bus without LLM/API calls."""

from __future__ import annotations

import asyncio
from typing import Literal

from app.agents.state import AgentEvent
from app.events.bus import EventBus
from app.events.recorder import RunRecorder

Speed = Literal["original", "fast"]


class RunReplayer:
    """Replay JSONL recordings at original or accelerated cadence."""

    def __init__(
        self,
        recorder: RunRecorder | None = None,
        bus: EventBus | None = None,
    ) -> None:
        self._recorder = recorder or RunRecorder()
        self._bus = bus

    async def replay(
        self,
        run_id: str,
        *,
        speed: Speed = "fast",
        bus: EventBus | None = None,
    ) -> list[AgentEvent]:
        """Publish recorded events to the bus and return the sequence."""
        target_bus = bus or self._bus
        if target_bus is None:
            raise ValueError("Event bus required for replay")

        events = self._recorder.load(run_id)
        if not events:
            return []

        previous_ts = events[0].timestamp
        for event in events:
            if speed == "original" and len(events) > 1:
                delta = (event.timestamp - previous_ts).total_seconds()
                if delta > 0:
                    await asyncio.sleep(min(delta, 1.0))
            await target_bus.publish(event)
            previous_ts = event.timestamp

        target_bus.close_run(run_id)
        return events
