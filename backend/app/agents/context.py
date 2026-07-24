"""Shared runtime context for agent nodes."""

from __future__ import annotations

from dataclasses import dataclass, field

from app.agents.llm import LLMClient, get_llm
from app.agents.state import AgentEvent, AgentName, IncidentState
from app.config import Settings, get_settings
from app.datahub.service import DataHubContextService
from app.events.bus import EventBus
from app.events.recorder import RunRecorder


@dataclass
class AgentContext:
    """Dependencies injected into every agent node."""

    datahub: DataHubContextService
    llm: LLMClient
    bus: EventBus
    recorder: RunRecorder
    settings: Settings = field(default_factory=get_settings)

    async def emit(
        self,
        state: IncidentState,
        agent: AgentName,
        event_type: str,
        message: str,
        **payload: object,
    ) -> AgentEvent:
        """Publish and record an agent timeline event."""
        event = AgentEvent(
            run_id=state.run_id,
            agent=agent,
            event_type=event_type,
            message=message,
            payload={k: v for k, v in payload.items() if v is not None},
        )
        await self.bus.publish(event)
        self.recorder.record(event)
        state.timeline.append(event)
        return event


def build_context(
    bus: EventBus,
    recorder: RunRecorder | None = None,
    settings: Settings | None = None,
) -> AgentContext:
    """Construct a default agent context."""
    cfg = settings or get_settings()
    return AgentContext(
        datahub=DataHubContextService(settings=cfg),
        llm=get_llm(cfg),
        bus=bus,
        recorder=recorder or RunRecorder(),
        settings=cfg,
    )
