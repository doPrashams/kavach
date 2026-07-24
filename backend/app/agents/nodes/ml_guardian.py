"""ML Guardian agent — deployment risk gating."""

from __future__ import annotations

import json
from pathlib import Path

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState, Severity

PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "ml_guardian.md").read_text(
    encoding="utf-8"
)
MODEL_URN = "urn:li:mlModel:(urn:li:dataPlatform:mlflow,kavach.demand_forecast,PROD)"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Classify ML deployment risk and recommend hold/rollback."""
    model = await ctx.datahub.get_ml_model(MODEL_URN)
    deployment_count = len(state.blast_radius.ml_deployments) if state.blast_radius else 0
    prompt = f"{PROMPT}\nModel: {model.name}\nDeployments at risk: {deployment_count}"
    raw = await ctx.llm.complete(AgentName.ML_GUARDIAN, prompt)
    parsed = json.loads(raw)
    severity = Severity(parsed.get("severity", Severity.MEDIUM.value))
    state.ml_risk = severity
    state.ml_hold_recommended = severity in {Severity.HIGH, Severity.CRITICAL}
    recommendation = parsed.get("recommendation", "monitor")
    state.findings.append(f"ML Guardian: {recommendation} ({severity.value})")
    await ctx.emit(
        state,
        AgentName.ML_GUARDIAN,
        "ml_risk_assessed",
        recommendation,
        severity=severity.value,
        hold_recommended=state.ml_hold_recommended,
    )
    return state
