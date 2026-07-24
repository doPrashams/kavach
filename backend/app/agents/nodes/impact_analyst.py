"""Impact analyst agent — blast radius computation."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState
from app.datahub.models import EntityType

PROMPT = (
    Path(__file__).resolve().parents[1] / "prompts" / "impact_analyst.md"
).read_text(encoding="utf-8")
BLAST_COLUMN = "main_marts.mart_demand_features.next_day_qty"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Compute blast radius including ML deployment via column lineage."""
    radius = await ctx.datahub.get_blast_radius(BLAST_COLUMN)
    state.blast_radius = radius
    ml_deployments = [d.name for d in radius.ml_deployments]
    prompt = f"{PROMPT}\nBlast radius ML deployments: {ml_deployments}"
    raw = await ctx.llm.complete(AgentName.IMPACT_ANALYST, prompt)
    parsed = json.loads(raw)
    summary = parsed.get("summary", "Impact assessed")
    state.findings.append(summary)
    await ctx.emit(
        state,
        AgentName.IMPACT_ANALYST,
        "blast_radius_computed",
        summary,
        ml_deployments=ml_deployments,
        has_ml_deployment=any(
            d.entity_type == EntityType.ML_DEPLOYMENT for d in radius.ml_deployments
        ),
    )
    return state
