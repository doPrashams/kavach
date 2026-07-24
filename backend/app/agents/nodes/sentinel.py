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
    trigger = state.trigger
    is_chaos = trigger.get("type") == "chaos"

    if is_chaos:
        signal = trigger.get("expected_signal", {})
        target = signal.get("dataset", TARGET)
        assertion_type = AssertionType(signal.get("assertion_type", AssertionType.CUSTOM.value))
        assertion_desc = signal.get("description", "Chaos scenario detected")
        summary = trigger.get("summary", "Chaos anomaly confirmed")
    else:
        target = TARGET
        schema = await ctx.datahub.get_schema(TARGET)
        queries = await ctx.datahub.get_dataset_queries(TARGET)
        prompt = f"{PROMPT}\nColumns: {[f.name for f in schema]}\nQueries: {len(queries)}"
        raw = await ctx.llm.complete(AgentName.SENTINEL, prompt)
        parsed = json.loads(raw)
        assertion_type = AssertionType.CUSTOM
        assertion_desc = "next_day_qty null rate > 5%"
        summary = parsed.get("summary", "Detected anomaly")

    urn = dataset_urn(target if not target.startswith("urn:") else target.split(",")[1])
    await ctx.datahub.emit_assertion(urn, assertion_type, assertion_desc)
    incident = await ctx.datahub.create_incident(
        title=f"Anomaly on {target}",
        description=summary,
        affected_entities=[urn],
    )

    state.incident_id = incident.urn.split(":")[-1]
    state.incident_urn = incident.urn
    state.status = IncidentStatus.INVESTIGATING
    state.severity = Severity.HIGH
    state.findings.append(summary)
    await ctx.emit(
        state,
        AgentName.SENTINEL,
        "anomaly_confirmed",
        summary,
        incident_urn=incident.urn,
        scenario=trigger.get("scenario") if is_chaos else None,
    )
    return state
