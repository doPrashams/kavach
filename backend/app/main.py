"""FastAPI application entrypoint."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app import __version__
from app.agents.graph import get_run_state, run_incident
from app.chaos.engine import ChaosEngine
from app.chaos.scenarios import list_scenarios
from app.config import get_settings
from app.events.bus import BUS
from app.events.recorder import RunRecorder
from app.events.replay import RunReplayer
from app.logging import configure_logging

configure_logging()

settings = get_settings()
recorder = RunRecorder()
replayer = RunReplayer(recorder=recorder, bus=BUS)
chaos_engine = ChaosEngine()

app = FastAPI(title="Kavach", version=__version__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunTrigger(BaseModel):
    """Payload to start an incident run."""

    trigger: dict[str, Any] = {}


class ChaosInjectRequest(BaseModel):
    """Payload to inject a chaos scenario."""

    scenario: str
    seed: int = Field(default=42, ge=0)


class ChaosHealRequest(BaseModel):
    """Payload to heal a chaos scenario."""

    scenario: str


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "version": __version__}


@app.post("/runs")
async def create_run(body: RunTrigger) -> dict[str, Any]:
    """Trigger a new incident response run."""
    state = await run_incident(body.trigger)
    return {"run_id": state.run_id, "status": state.status.value}


@app.get("/runs/{run_id}")
async def get_run(run_id: str) -> dict[str, Any]:
    """Return the current state for a run."""
    state = get_run_state(run_id)
    if state is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return state.model_dump(mode="json")


@app.get("/runs/{run_id}/stream")
async def stream_run(run_id: str) -> StreamingResponse:
    """SSE stream of agent events for a run."""

    async def event_generator() -> Any:
        async for event in BUS.subscribe(run_id):
            payload = event.model_dump(mode="json")
            yield f"data: {json.dumps(payload)}\n\n"
        yield "data: {\"event_type\": \"complete\"}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/recordings")
def list_recordings() -> dict[str, list[str]]:
    """List available recorded runs."""
    return {"recordings": recorder.list_recordings()}


@app.post("/replay/{run_id}")
async def replay_run(run_id: str) -> dict[str, Any]:
    """Replay a recorded run through the event bus (no LLM/API)."""
    events = await replayer.replay(run_id, speed="fast", bus=BUS)
    if not events:
        raise HTTPException(status_code=404, detail="Recording not found")
    return {"run_id": run_id, "events_replayed": len(events)}


@app.get("/chaos/scenarios")
def chaos_scenarios() -> dict[str, list[str]]:
    """List available chaos scenarios."""
    return {"scenarios": list_scenarios()}


@app.post("/chaos/inject")
async def chaos_inject(body: ChaosInjectRequest) -> dict[str, Any]:
    """Inject chaos and kick off an agent run."""
    if body.scenario not in list_scenarios():
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {body.scenario}")
    try:
        event = chaos_engine.inject(body.scenario, body.seed)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    trigger = chaos_engine.build_trigger(body.scenario, body.seed)
    state = await run_incident(trigger, recorder=recorder)
    return {
        "run_id": state.run_id,
        "chaos_event_id": event.id,
        "scenario": body.scenario,
        "seed": body.seed,
        "root_cause": state.root_cause,
    }


@app.post("/chaos/heal")
def chaos_heal(body: ChaosHealRequest) -> dict[str, Any]:
    """Revert a chaos injection."""
    try:
        event = chaos_engine.heal(body.scenario)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"scenario": body.scenario, "healed": True, "chaos_event_id": event.id}


@app.get("/chaos/status")
def chaos_status() -> dict[str, Any]:
    """Return chaos engine status."""
    return chaos_engine.status().model_dump(mode="json")
