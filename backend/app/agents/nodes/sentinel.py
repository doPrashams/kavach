"""Sentinel agent — detect anomalies and open incidents."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState, IncidentStatus, Severity
from app.datahub.fixtures import dataset_urn
from app.datahub.models import AssertionType

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "sentinel.md").read_text(
    encoding="utf-8"
)
TARGET = "main_marts.mart_demand_features"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Confirm anomaly, emit assertion, and create a DataHub incident."""
    schema = await ctx.datahub.get_schema(TARGET)
    queries = await ctx.datahub.get_dataset_queries(TARGET)
    prompt = f"{PROMPT}\nColumns: {[f.name for f in schema]}\nQueries: {len(queries)}"
    raw = await ctx.llm.complete(AgentName.SENTINEL, prompt)
    parsed = json.loads(raw)

    urn = dataset_urn(TARGET)
    await ctx.datahub.emit_assertion(
        urn,
        AssertionType.CUSTOM,
        "next_day_qty null rate > 5%",
    )
    incident = await ctx.datahub.create_incident(
        title="Anomaly on mart_demand_features.next_day_qty",
        description=parsed.get("summary", "Detected anomaly"),
        affected_entities=[urn],
    )

    state.incident_id = incident.urn.split(":")[-1]
    state.incident_urn = incident.urn
    state.status = IncidentStatus.INVESTIGATING
    state.severity = Severity.HIGH
    state.findings.append(parsed.get("summary", "Anomaly confirmed"))
    await ctx.emit(
        state,
        AgentName.SENTINEL,
        "anomaly_confirmed",
        parsed.get("summary", "Anomaly confirmed"),
        incident_urn=incident.urn,
    )
    return state
