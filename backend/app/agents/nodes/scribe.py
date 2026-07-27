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
PHI_TARGET = "main_marts.mart_patient_analytics"
HIPAA_TERM = "urn:li:glossaryTerm:HIPAA"
PII_TERM = "urn:li:glossaryTerm:PII"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Write postmortem context document and resolve the incident."""
    prompt = (
        f"{PROMPT}\nRoot cause: {state.root_cause}\n"
        f"Fix plan: {state.fix_plan.summary if state.fix_plan else 'n/a'}"
    )
    raw = await ctx.llm.complete(AgentName.SCRIBE, prompt)
    parsed = json.loads(raw)
    scenario = (
        str(state.trigger.get("scenario"))
        if state.trigger.get("type") == "chaos" and state.trigger.get("scenario")
        else None
    )
    if scenario:
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

    is_phi = scenario == "phi_exposure"
    target = PHI_TARGET if is_phi else TARGET
    urn = dataset_urn(target)

    tags = [
        "postmortem",
        "incident",
        *([scenario] if scenario else []),
    ]
    if is_phi:
        tags.extend(["PII", "HIPAA"])

    doc = await ctx.datahub.save_context_document(
        ContextDocument(
            urn="",
            title=f"Postmortem {state.run_id[:8]}",
            body=postmortem,
            related_entities=[urn],
            tags=tags,
        )
    )
    STORE.index_document(
        doc,
        scenario=scenario,
    )
    resolve_tags = ["incident-resolved"]
    if is_phi:
        resolve_tags.extend(["PII", "HIPAA"])
    await ctx.datahub.add_tags(urn, resolve_tags)
    if is_phi:
        await ctx.datahub.add_terms(urn, [HIPAA_TERM, PII_TERM])
        await ctx.datahub.update_description(
            urn, "Patient analytics mart — post-incident (PHI masked, HIPAA/PII tagged)"
        )
    else:
        await ctx.datahub.update_description(urn, "Demand features mart — post-incident")
    if state.incident_urn:
        await ctx.datahub.resolve_incident(state.incident_urn)

    state.status = IncidentStatus.RESOLVED
    await ctx.emit(state, AgentName.SCRIBE, "postmortem_written", "Postmortem saved to DataHub")
    return state
