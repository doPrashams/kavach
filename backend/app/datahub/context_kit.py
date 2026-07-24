"""Agent Context Kit helpers for grounding agent prompts."""

from __future__ import annotations

from typing import Any

import structlog

from app.config import Settings
from app.datahub.models import ContextDocument
from app.errors import DataHubError

logger = structlog.get_logger(__name__)


class AgentContextKit:
    """Retrieve and format context documents for agent grounding."""

    def __init__(self, settings: Settings, mcp_call: Any | None = None) -> None:
        self._settings = settings
        self._mcp_call = mcp_call

    async def retrieve_context(
        self,
        entity_urn: str,
        *,
        query: str | None = None,
        limit: int = 5,
    ) -> list[ContextDocument]:
        """Fetch context documents related to an entity via Agent Context Kit."""
        if self._mcp_call is not None and self._settings.datahub_gms_url:
            try:
                raw = await self._mcp_call(
                    "get_context_documents",
                    {"entity_urn": entity_urn, "query": query, "limit": limit},
                )
                return [ContextDocument.model_validate(item) for item in raw]
            except Exception as exc:  # noqa: BLE001
                logger.warning("context_kit.retrieve_failed", error=str(exc))
                raise DataHubError("Failed to retrieve context documents") from exc
        return []

    def format_for_prompt(self, documents: list[ContextDocument]) -> str:
        """Render context documents as a grounding block for LLM prompts."""
        if not documents:
            return ""
        parts = ["## Relevant DataHub Context"]
        for doc in documents:
            parts.append(f"### {doc.title}\n{doc.body}")
        return "\n\n".join(parts)
