"""Provider-agnostic LLM factory with deterministic stub for tests."""

from __future__ import annotations

import json
from typing import Any, Protocol

import structlog

from app.agents.state import AgentName, FixPlan, Severity
from app.config import Settings, get_settings

logger = structlog.get_logger(__name__)


class LLMClient(Protocol):
    """Minimal async LLM interface."""

    async def complete(self, agent: AgentName, prompt: str) -> str: ...


class StubLLM:
    """Deterministic LLM returning canned outputs for CI and replay."""

    async def complete(self, agent: AgentName, prompt: str) -> str:
        """Return agent-specific canned JSON/text."""
        del prompt
        payloads: dict[AgentName, dict[str, Any]] = {
            AgentName.SENTINEL: {
                "confirmed": True,
                "summary": "next_day_qty null rate exceeded threshold on mart_demand_features",
            },
            AgentName.INVESTIGATOR: {
                "root_cause": (
                    "Upstream stg_order_items join dropped rows after supplier feed delay"
                ),
                "confidence": 0.87,
            },
            AgentName.IMPACT_ANALYST: {
                "summary": "Downstream demand forecast deployment at risk",
            },
            AgentName.ML_GUARDIAN: {
                "severity": Severity.CRITICAL.value,
                "recommendation": "hold",
            },
            AgentName.FIXER: {
                "summary": "Backfill stg_order_items and add null guard on next_day_qty",
                "steps": [
                    "Re-run stg_order_items incremental with widened lookback",
                    "Add not-null assertion on mart_demand_features.next_day_qty",
                    "Notify ml-platform owners",
                ],
            },
            AgentName.SCRIBE: {
                "postmortem": (
                    "## Incident: corrupted next_day_qty\n"
                    "Root cause: delayed supplier feed caused join drops.\n"
                    "Blast radius: demand forecast prod deployment.\n"
                    "Fix: backfill staging + assertion safeguard."
                ),
            },
            AgentName.COMMS: {
                "message": "Incident resolved — owners notified in war room",
            },
        }
        return json.dumps(payloads.get(agent, {"ok": True}))


class OpenAILLM:
    """OpenAI chat completion wrapper."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(self, agent: AgentName, prompt: str) -> str:
        del agent
        if not self._settings.openai_api_key:
            raise RuntimeError("OPENAI_API_KEY not configured")
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {self._settings.openai_api_key}"},
                json={
                    "model": self._settings.llm_model,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            return str(data["choices"][0]["message"]["content"])


class AnthropicLLM:
    """Anthropic messages API wrapper."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(self, agent: AgentName, prompt: str) -> str:
        del agent
        if not self._settings.anthropic_api_key:
            raise RuntimeError("ANTHROPIC_API_KEY not configured")
        import httpx

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": self._settings.anthropic_api_key,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": self._settings.llm_model,
                    "max_tokens": 1024,
                    "messages": [{"role": "user", "content": prompt}],
                },
            )
            response.raise_for_status()
            data = response.json()
            return str(data["content"][0]["text"])


def get_llm(settings: Settings | None = None) -> LLMClient:
    """Return an LLM client based on env configuration."""
    cfg = settings or get_settings()
    if cfg.llm_provider == "stub":
        return StubLLM()
    if cfg.llm_provider == "anthropic":
        if not cfg.anthropic_api_key:
            logger.warning("llm.fallback_stub", reason="missing ANTHROPIC_API_KEY")
            return StubLLM()
        return AnthropicLLM(cfg)
    if not cfg.openai_api_key:
        logger.warning("llm.fallback_stub", reason="missing OPENAI_API_KEY")
        return StubLLM()
    return OpenAILLM(cfg)


def parse_fix_plan(raw: str, *, safeguard: bool = False) -> FixPlan:
    """Parse LLM JSON into a FixPlan."""
    data = json.loads(raw)
    return FixPlan(
        summary=data.get("summary", "Remediation plan"),
        steps=data.get("steps", []),
        target_entities=data.get("target_entities", []),
        safeguard_assertion=(
            "not_null(next_day_qty)" if safeguard else data.get("safeguard_assertion")
        ),
        hold_recommendation=safeguard or bool(data.get("hold_recommendation")),
    )
