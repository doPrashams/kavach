"""Analytics Agent client with live MCP and fixture-backed offline shim."""

from __future__ import annotations

import re
from typing import Any, Protocol

import structlog
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import Settings, get_settings
from app.datahub.mcp import DataHubMCPClient
from app.datahub.models import ContextDocument, Incident

logger = structlog.get_logger(__name__)

DEFAULT_QUESTION = "what happened to orders data this week?"


def _live_enabled(settings: Settings) -> bool:
    """Return True when live Analytics Agent credentials look usable."""
    token = settings.datahub_token
    return bool(
        settings.datahub_gms_url
        and token
        and token.lower() not in {"none", "null", "placeholder"}
    )


class Answer(BaseModel):
    """Analytics Agent response."""

    text: str
    sources: list[str] = Field(default_factory=list)
    confidence: float = 0.0


class AnalyticsBackend(Protocol):
    """Backend contract for analytics queries."""

    async def ask(self, question: str) -> Answer: ...


class FixtureAnalyticsBackend:
    """Offline analytics shim backed by the fixture writeback store."""

    def __init__(self, writebacks: list[dict[str, Any]] | None = None) -> None:
        self._writebacks = writebacks or []
        self._context_docs: dict[str, ContextDocument] = {}
        self._incidents: dict[str, Incident] = {}
        self._tags: dict[str, list[str]] = {}
        self._reload()

    def clear(self) -> None:
        """Reset writebacks (before-writeback state)."""
        self._writebacks = []
        self._reload()

    def load_writebacks(self, entries: list[dict[str, Any]]) -> None:
        """Load scenario writebacks (after-writeback state)."""
        self._writebacks = list(entries)
        self._reload()

    def _reload(self) -> None:
        self._context_docs.clear()
        self._incidents.clear()
        self._tags.clear()
        for entry in self._writebacks:
            operation = entry.get("operation")
            payload = entry.get("payload", {})
            if operation == "save_context_document":
                doc = ContextDocument.model_validate(payload)
                self._context_docs[doc.urn] = doc
            elif operation == "create_incident":
                incident = Incident.model_validate(payload)
                self._incidents[incident.urn] = incident
            elif operation == "update_incident":
                incident = Incident.model_validate(payload)
                self._incidents[incident.urn] = incident
            elif operation == "add_tags":
                urn = str(payload.get("urn", ""))
                tags = payload.get("tags", [])
                if isinstance(tags, list):
                    self._tags.setdefault(urn, []).extend(str(tag) for tag in tags)

    async def ask(self, question: str) -> Answer:
        """Answer from indexed writeback context or a generic baseline."""
        query = question.lower()
        docs = self._matching_documents(query)
        incidents = self._matching_incidents(query)

        if not docs and not incidents:
            return Answer(
                text=(
                    "Orders datasets look healthy in catalog metadata. "
                    "No recent incident writebacks or resolved tags were found for this week."
                ),
                sources=["catalog:raw.order_items", "catalog:main_marts.mart_demand_features"],
                confidence=0.35,
            )

        parts: list[str] = []
        sources: list[str] = []
        for doc in docs:
            parts.append(doc.body.strip())
            sources.append(doc.urn)
        for incident in incidents:
            parts.append(
                f"Incident '{incident.title}' ({incident.status.value}): {incident.description}"
            )
            sources.append(incident.urn)

        tag_summary = self._tag_summary()
        if tag_summary:
            parts.append(tag_summary)

        return Answer(
            text="\n\n".join(parts),
            sources=sources,
            confidence=0.92 if docs else 0.7,
        )

    def _matching_documents(self, query: str) -> list[ContextDocument]:
        tokens = set(re.findall(r"[a-z0-9_]+", query))
        matches: list[tuple[int, ContextDocument]] = []
        for doc in self._context_docs.values():
            haystack = f"{doc.title} {doc.body} {' '.join(doc.tags)}".lower()
            score = sum(1 for token in tokens if token in haystack)
            if score > 0 or any(key in query for key in ("order", "incident", "week", "data")):
                if "postmortem" in doc.tags or "incident" in doc.tags:
                    matches.append((score, doc))
        matches.sort(key=lambda pair: pair[0], reverse=True)
        return [doc for _, doc in matches]

    def _matching_incidents(self, query: str) -> list[Incident]:
        if not any(token in query for token in ("order", "incident", "week", "data", "happened")):
            return []
        return list(self._incidents.values())

    def _tag_summary(self) -> str:
        tagged = [f"{urn}: {', '.join(tags)}" for urn, tags in self._tags.items()]
        if not tagged:
            return ""
        return "Applied tags — " + "; ".join(tagged)


class LiveAnalyticsBackend:
    """Live DataHub Analytics Agent via MCP when available."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._mcp = DataHubMCPClient(settings)

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=8))
    async def ask(self, question: str) -> Answer:
        """Query the Analytics Agent MCP tool."""
        for tool_name in ("analytics_agent_ask", "ask_analytics_agent", "analytics_ask"):
            try:
                raw = await self._mcp.call_tool(tool_name, {"question": question})
            except Exception:
                continue
            if isinstance(raw, dict):
                text = str(raw.get("answer") or raw.get("text") or raw.get("response", ""))
                sources_raw = raw.get("sources", [])
                sources = (
                    [str(item) for item in sources_raw]
                    if isinstance(sources_raw, list)
                    else []
                )
                confidence = float(raw.get("confidence", 0.8))
                if text:
                    return Answer(text=text, sources=sources, confidence=confidence)
            if isinstance(raw, str) and raw.strip():
                return Answer(text=raw.strip(), confidence=0.8)
        raise RuntimeError("Analytics Agent MCP tool unavailable")


class AnalyticsAgentClient:
    """Facade selecting live Analytics Agent or fixture shim."""

    def __init__(
        self,
        settings: Settings | None = None,
        backend: AnalyticsBackend | None = None,
    ) -> None:
        self._settings = settings or get_settings()
        self._fixture = FixtureAnalyticsBackend()
        self._live = LiveAnalyticsBackend(self._settings) if _live_enabled(self._settings) else None
        self._override = backend

    @property
    def fixture_backend(self) -> FixtureAnalyticsBackend:
        """Expose fixture backend for before/after demos."""
        return self._fixture

    async def ask(self, question: str) -> Answer:
        """Ask the Analytics Agent (live when configured, else fixture)."""
        if self._override is not None:
            return await self._override.ask(question)
        if self._live and _live_enabled(self._settings):
            try:
                return await self._live.ask(question)
            except Exception as exc:
                logger.warning("analytics.live_failed", error=str(exc))
        return await self._fixture.ask(question)
