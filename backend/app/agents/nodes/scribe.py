"""Scribe agent — postmortem writeback to DataHub."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState, IncidentStatus
from app.datahub.fixtures import dataset_urn
from app.datahub.models import ContextDocument
from app.flywheel.store import STORE

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "scribe.md").read_text(
    encoding="utf-8"
)
TARGET = "main_marts.mart_demand_features"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Write postmortem context document and resolve the incident."""
    prompt = (
        f"{PROMPT}\nRoot cause: {state.root_cause}\n"
        f"Fix plan: {state.fix_plan.summary if state.fix_plan else 'n/a'}"
    )
    raw = await ctx.llm.complete(AgentName.SCRIBE, prompt)
    parsed = json.loads(raw)
    if state.trigger.get("type") == "chaos":
        scenario = state.trigger.get("scenario", "incident")
        postmortem = (
            f"## Incident: {scenario}\n"
            f"Root cause: {state.root_cause}\n"
            f"Blast radius: demand forecast pipeline\n"
            f"Fix: {state.fix_plan.summary if state.fix_plan else 'applied dbt patch'}\n"
            f"Scenario tag: {scenario}\n"
        )
    else:
        postmortem = parsed.get("postmortem", "Incident postmortem")
    state.postmortem = postmortem
    urn = dataset_urn(TARGET)

    doc = await ctx.datahub.save_context_document(
        ContextDocument(
            urn="",
            title=f"Postmortem {state.run_id[:8]}",
            body=postmortem,
            related_entities=[urn],
            tags=[
                "postmortem",
                "incident",
                *(
                    [str(state.trigger.get("scenario"))]
                    if state.trigger.get("scenario")
                    else []
                ),
            ],
        )
    )
    STORE.index_document(
        doc,
        scenario=str(state.trigger.get("scenario")) if state.trigger.get("scenario") else None,
    )
    await ctx.datahub.add_tags(urn, ["incident-resolved"])
    await ctx.datahub.update_description(urn, "Demand features mart — post-incident")
    if state.incident_urn:
        await ctx.datahub.resolve_incident(state.incident_urn)

    state.status = IncidentStatus.RESOLVED
    await ctx.emit(state, AgentName.SCRIBE, "postmortem_written", "Postmortem saved to DataHub")
    return state
