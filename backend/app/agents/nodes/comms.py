"""Comms agent — owner notifications."""

from __future__ import annotations

import json
from pathlib import Path

import httpx
import structlog

from app.agents.context import AgentContext
from app.agents.state import AgentName, IncidentState

logger = structlog.get_logger(__name__)
PROMPT = (Path(__file__).resolve().parents[1] / "prompts" / "comms.md").read_text(
    encoding="utf-8"
)
TARGET = "main_marts.mart_demand_features"


async def run(state: IncidentState, ctx: AgentContext) -> IncidentState:
    """Emit in-UI notification; optionally post to Slack webhook."""
    owners = await ctx.datahub.get_owners(TARGET)
    owner_emails = [o.email for o in owners if o.email]
    prompt = f"{PROMPT}\nOwners: {owner_emails}\nStatus: {state.status.value}"
    raw = await ctx.llm.complete(AgentName.COMMS, prompt)
    parsed = json.loads(raw)
    message = parsed.get("message", "Incident update")

    if ctx.settings.slack_webhook_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(
                    ctx.settings.slack_webhook_url,
                    json={"text": message},
                )
        except Exception as exc:  # noqa: BLE001
            logger.warning("comms.slack_failed", error=str(exc))

    state.notification_sent = True
    await ctx.emit(
        state,
        AgentName.COMMS,
        "notification_sent",
        message,
        owners=owner_emails,
        channel="slack" if ctx.settings.slack_webhook_url else "ui",
    )
    return state
