"""Fixer agent — remediation plan stub (H06 adds codegen)."""

from __future__ import annotations

from pathlib import Path

from app.agents.context import AgentContext
from app.agents.llm import parse_fix_plan
from app.agents.state import AgentName, IncidentState, Severity

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "fixer.md").read_text(
    encoding="utf-8"
)


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Generate a FixPlan; include safeguards when ML Guardian flagged critical risk."""
    safeguard = state.ml_risk == Severity.CRITICAL or state.ml_hold_recommended
    prompt = f"{PROMPT}\nRoot cause: {state.root_cause}\nSafeguard required: {safeguard}"
    raw = await ctx.llm.complete(AgentName.FIXER, prompt)
    plan = parse_fix_plan(raw, safeguard=safeguard)
    state.fix_plan = plan
    await ctx.emit(
        state,
        AgentName.FIXER,
        "fix_plan_ready",
        plan.summary,
        steps=plan.steps,
        safeguard=plan.safeguard_assertion,
    )
    return state
