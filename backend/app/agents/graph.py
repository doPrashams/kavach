"""LangGraph incident response team."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import uuid4

import structlog
from langgraph.graph import END, StateGraph

from app.agents.context import AgentContext, build_context
from app.agents.nodes import comms as comms_mod
from app.agents.nodes import fixer as fixer_mod
from app.agents.nodes import impact_analyst as impact_analyst_mod
from app.agents.nodes import investigator as investigator_mod
from app.agents.nodes import ml_guardian as ml_guardian_mod
from app.agents.nodes import scribe as scribe_mod
from app.agents.nodes import sentinel as sentinel_mod
from app.agents.state import AgentEvent, IncidentState
from app.config import Settings, get_settings
from app.events.bus import BUS, EventBus
from app.events.recorder import RunRecorder

logger = structlog.get_logger(__name__)

_RUN_STATES: dict[str, IncidentState] = {}


def _save_state(state: IncidentState) -> IncidentState:
    _RUN_STATES[state.run_id] = state
    return state


def build_graph(ctx: AgentContext) -> Any:
    """Assemble and compile the incident response StateGraph."""

    async def sentinel_node(state: IncidentState) -> IncidentState:
        return _save_state(await sentinel_mod.run(state, ctx))

    async def investigator_node(state: IncidentState) -> IncidentState:
        return _save_state(await investigator_mod.run(state, ctx))

    async def impact_node(state: IncidentState) -> IncidentState:
        return _save_state(await impact_analyst_mod.run(state, ctx))

    async def ml_node(state: IncidentState) -> IncidentState:
        return _save_state(await ml_guardian_mod.run(state, ctx))

    async def fixer_node(state: IncidentState) -> IncidentState:
        return _save_state(await fixer_mod.run(state, ctx))

    async def scribe_node(state: IncidentState) -> IncidentState:
        return _save_state(await scribe_mod.run(state, ctx))

    async def comms_node(state: IncidentState) -> IncidentState:
        return _save_state(await comms_mod.run(state, ctx))

    graph = StateGraph(IncidentState)
    graph.add_node("sentinel", sentinel_node)
    graph.add_node("investigator", investigator_node)
    graph.add_node("impact_analyst", impact_node)
    graph.add_node("ml_guardian", ml_node)
    graph.add_node("fixer", fixer_node)
    graph.add_node("scribe", scribe_node)
    graph.add_node("comms", comms_node)

    graph.set_entry_point("sentinel")
    graph.add_edge("sentinel", "investigator")
    graph.add_edge("investigator", "impact_analyst")
    graph.add_edge("impact_analyst", "ml_guardian")
    graph.add_edge("ml_guardian", "fixer")
    graph.add_edge("fixer", "scribe")
    graph.add_edge("scribe", "comms")
    graph.add_edge("comms", END)

    return graph.compile()


async def run_incident(
    trigger: dict[str, Any] | None = None,
    *,
    bus: EventBus | None = None,
    recorder: RunRecorder | None = None,
    settings: Settings | None = None,
) -> IncidentState:
    """Execute the full agent graph for an incident trigger."""
    cfg = settings or get_settings()
    fixture_settings = cfg.model_copy(update={"datahub_gms_url": None, "datahub_token": None})
    event_bus = bus or BUS
    rec = recorder or RunRecorder()
    ctx = build_context(event_bus, rec, settings=fixture_settings)

    state = IncidentState(
        run_id=str(uuid4()),
        trigger=trigger or {"type": "anomaly", "column": "next_day_qty"},
    )
    _RUN_STATES[state.run_id] = state

    compiled = build_graph(ctx)
    logger.info("agents.run_started", run_id=state.run_id)
    final = await compiled.ainvoke(state)
    if isinstance(final, IncidentState):
        result = final
    else:
        result = IncidentState.model_validate(final)
    _RUN_STATES[result.run_id] = result
    event_bus.close_run(result.run_id)
    logger.info("agents.run_completed", run_id=result.run_id)
    return result


async def stream_incident(
    trigger: dict[str, Any] | None = None,
    *,
    bus: EventBus | None = None,
    settings: Settings | None = None,
) -> AsyncIterator[AgentEvent]:
    """Run incident graph in background task semantics — yield events from bus."""
    event_bus = bus or BUS
    import asyncio

    state = IncidentState(trigger=trigger or {"type": "anomaly"})
    run_id = state.run_id

    async def _run() -> None:
        await run_incident(trigger, bus=event_bus, settings=settings)

    task = asyncio.create_task(_run())
    async for event in event_bus.subscribe(run_id):
        yield event
    await task


def get_run_state(run_id: str) -> IncidentState | None:
    """Return the latest state for a run id."""
    return _RUN_STATES.get(run_id)
