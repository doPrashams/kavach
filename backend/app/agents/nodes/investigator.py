"""Investigator agent — root-cause via lineage and queries."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "investigator.md").read_text(
    encoding="utf-8"
)
TARGET = "main_marts.mart_demand_features"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Walk upstream lineage and historical queries to determine root cause."""
    upstreams = await ctx.datahub.get_upstreams(TARGET, depth=2)
    queries = await ctx.datahub.get_dataset_queries(TARGET)
    prompt = (
        f"{PROMPT}\nUpstreams: {[e.upstream for e in upstreams]}\n"
        f"Sample query: {queries[0].query if queries else 'n/a'}"
    )
    raw = await ctx.llm.complete(AgentName.INVESTIGATOR, prompt)
    parsed = json.loads(raw)
    state.root_cause = parsed.get("root_cause")
    state.findings.append(f"Root cause: {state.root_cause}")
    await ctx.emit(
        state,
        AgentName.INVESTIGATOR,
        "root_cause_identified",
        state.root_cause or "unknown",
        confidence=parsed.get("confidence"),
    )
    return state
