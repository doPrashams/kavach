"""Fixer agent — codegen + GitHub PR flow."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.llm import parse_fix_plan
from app.agents.state import AgentName, IncidentState, Severity
from app.fixer.codegen import generate_fix
from app.fixer.github import open_pr, store_fix

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "fixer.md").read_text(
    encoding="utf-8"
)


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Generate fix artifacts, open PR (or dry-run), and attach FixPlan."""
    artifacts = generate_fix(state)
    pr_ref = await open_pr(artifacts, ctx.settings)
    store_fix(state.run_id, artifacts, pr_ref)

    safeguard = state.ml_risk == Severity.CRITICAL or state.ml_hold_recommended
    if artifacts.scenario == "value_corruption":
        safeguard = True

    plan = parse_fix_plan(
        json.dumps(
            {
                "summary": artifacts.pr_title,
                "steps": [f"Apply {path}" for path in artifacts.files],
                "safeguard_assertion": "line_total range guard" if safeguard else None,
            }
        ),
        safeguard=safeguard,
    )
    state.fix_plan = plan

    await ctx.emit(
        state,
        AgentName.FIXER,
        "fix_plan_ready",
        plan.summary,
        steps=plan.steps,
        pr_ref=pr_ref,
        scenario=artifacts.scenario,
        safeguard=plan.safeguard_assertion,
    )
    return state
