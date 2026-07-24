"""In-process async event bus for agent runs."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

from app.agents.state import AgentEvent


class EventBus:
    """Async pub/sub bus for AgentEvent streaming."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[asyncio.Queue[AgentEvent | None]]] = {}
        self._history: dict[str, list[AgentEvent]] = {}

    def _ensure_run(self, run_id: str) -> None:
        if run_id not in self._subscribers:
            self._subscribers[run_id] = []
        if run_id not in self._history:
            self._history[run_id] = []

    async def publish(self, event: AgentEvent) -> None:
        """Publish an event to all subscribers of the run."""
        self._ensure_run(event.run_id)
        self._history[event.run_id].append(event)
        for queue in list(self._subscribers[event.run_id]):
            await queue.put(event)

    async def subscribe(self, run_id: str) -> AsyncIterator[AgentEvent]:
        """Yield events for a run until a terminal None sentinel."""
        self._ensure_run(run_id)
        queue: asyncio.Queue[AgentEvent | None] = asyncio.Queue()
        self._subscribers[run_id].append(queue)
        try:
            while True:
                event = await queue.get()
                if event is None:
                    break
                yield event
        finally:
            self._subscribers[run_id].remove(queue)

    def close_run(self, run_id: str) -> None:
        """Signal subscribers that the run is complete."""
        for queue in self._subscribers.get(run_id, []):
            queue.put_nowait(None)

    def get_history(self, run_id: str) -> list[AgentEvent]:
        """Return recorded events for a run."""
        return list(self._history.get(run_id, []))

    def list_runs(self) -> list[str]:
        """Return run ids with history."""
        return list(self._history.keys())


# Module-level singleton used by FastAPI and graph runner.
BUS = EventBus()
