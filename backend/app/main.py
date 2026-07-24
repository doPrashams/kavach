"""FastAPI application entrypoint."""

from __future__ import annotations

import asyncio
import json
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app import __version__
from app.agents.graph import get_run_state, run_incident
from app.config import get_settings
from app.events.bus import BUS
from app.events.recorder import RunRecorder
from app.events.replay import RunReplayer
from app.logging import configure_logging

configure_logging()

settings = get_settings()
recorder = RunRecorder()
replayer = RunReplayer(recorder=recorder, bus=BUS)

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
