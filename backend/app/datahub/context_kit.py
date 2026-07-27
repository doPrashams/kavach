"""Agent Context Kit — real datahub-agent-context LangChain tools + MCP helpers.

Uses ACK tools for grounding and mutations:
search_documents, grep_documents, save_document (and mutations via
build_langchain_tools(..., include_mutations=True)).

When DATAHUB_GMS_URL/token are unset, all methods degrade to empty/fixture-safe
no-ops so StubLLM offline tests keep working.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog

from app.config import Settings
from app.datahub.models import ContextDocument
from app.errors import DataHubError

logger = structlog.get_logger(__name__)

# Real ACK / MCP tool names used on the agent path.
ACK_DOCUMENT_TOOLS = ("search_documents", "grep_documents", "save_document")
ACK_SQL_TOOLS = ("get_dataset_queries", "find_sql_context", "draft_sql_for_tables")
ACK_MUTATION_TOOLS = ("add_terms", "add_tags", "update_description")


def _parse_tool_payload(raw: Any) -> Any:
    """Normalize LangChain / MCP tool return values into Python objects."""
    if raw is None:
        return None
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return None
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"text": raw}
    return raw


def _documents_from_search(payload: Any, *, limit: int) -> list[ContextDocument]:
    """Map search_documents / grep_documents payloads into ContextDocument models."""
    docs: list[ContextDocument] = []
    if payload is None:
        return docs

    items: list[Any]
    if isinstance(payload, list):
        items = payload
    elif isinstance(payload, dict):
        for key in ("documents", "results", "items", "matches"):
            candidate = payload.get(key)
            if isinstance(candidate, list):
                items = candidate
                break
        else:
            items = [payload]
    else:
        return docs

    for item in items[:limit]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or item.get("name") or item.get("urn") or "Document")
        body = str(
            item.get("body")
            or item.get("content")
            or item.get("snippet")
            or item.get("text")
            or json.dumps(item, default=str)
        )
        urn = str(item.get("urn") or "")
        related = item.get("related_entities") or item.get("related_assets") or []
        if not isinstance(related, list):
            related = []
        tags = item.get("tags") or item.get("topics") or []
        if not isinstance(tags, list):
            tags = []
        docs.append(
            ContextDocument(
                urn=urn,
                title=title,
                body=body,
                related_entities=[str(x) for x in related],
                tags=[str(x) for x in tags],
            )
        )
    return docs


class AgentContextKit:
    """Build and invoke real Agent Context Kit tools for agent grounding."""

    def __init__(self, settings: Settings, mcp_call: Any | None = None) -> None:
        self._settings = settings
        self._mcp_call = mcp_call
        self._tools_by_name: dict[str, Any] = {}
        self._sdk_client: Any | None = None
        self._configured = bool(settings.datahub_gms_url and settings.datahub_token)
        if self._configured:
            self._try_build_langchain_tools()

    def _try_build_langchain_tools(self) -> None:
        """Construct LangChain tools via build_langchain_tools when credentials exist."""
        try:
            from datahub.sdk.main_client import DataHubClient
            from datahub_agent_context.langchain_tools import build_langchain_tools

            client = DataHubClient(
                server=self._settings.datahub_gms_url,
                token=self._settings.datahub_token,
            )
            tools = build_langchain_tools(client, include_mutations=True)
            self._sdk_client = client
            self._tools_by_name = {tool.name: tool for tool in tools}
            logger.info(
                "context_kit.tools_ready",
                tool_count=len(self._tools_by_name),
                tools=sorted(self._tools_by_name),
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("context_kit.build_tools_failed", error=str(exc))
            self._sdk_client = None
            self._tools_by_name = {}

    @property
    def is_live(self) -> bool:
        """True when ACK LangChain tools or MCP are available."""
        return bool(self._tools_by_name) or self._mcp_call is not None

    def get_langchain_tools(self) -> list[Any]:
        """Return LangChain BaseTool instances (empty when not configured)."""
        return list(self._tools_by_name.values())

    def has_tool(self, name: str) -> bool:
        """Whether a named ACK or MCP tool is reachable."""
        if name in self._tools_by_name:
            return True
        return self._mcp_call is not None and self._configured

    async def _invoke_langchain_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        tool = self._tools_by_name.get(name)
        if tool is None:
            raise DataHubError(f"ACK tool not available: {name}")

        def _run() -> Any:
            if hasattr(tool, "ainvoke"):
                # Prefer sync invoke for thread safety with asyncio.to_thread.
                pass
            return tool.invoke(arguments)

        return await asyncio.to_thread(_run)

    async def call_tool(self, name: str, arguments: dict[str, Any] | None = None) -> Any:
        """Call an ACK tool by name — LangChain first, then MCP."""
        args = arguments or {}
        if name in self._tools_by_name:
            try:
                raw = await self._invoke_langchain_tool(name, args)
                return _parse_tool_payload(raw)
            except Exception as exc:  # noqa: BLE001
                logger.warning("context_kit.langchain_tool_failed", tool=name, error=str(exc))
                if self._mcp_call is None:
                    raise DataHubError(f"ACK tool failed: {name}") from exc
        if self._mcp_call is not None and self._configured:
            try:
                raw = await self._mcp_call(name, args)
                return _parse_tool_payload(raw)
            except Exception as exc:  # noqa: BLE001
                logger.warning("context_kit.mcp_tool_failed", tool=name, error=str(exc))
                raise DataHubError(f"MCP tool failed: {name}") from exc
        return None

    async def search_documents(
        self,
        query: str = "*",
        *,
        semantic_query: str | None = None,
        limit: int = 10,
    ) -> list[ContextDocument]:
        """Search DataHub documents via ACK search_documents."""
        if not self._configured:
            return []
        payload = await self.call_tool(
            "search_documents",
            {
                "query": query,
                "semantic_query": semantic_query,
                "num_results": limit,
            },
        )
        return _documents_from_search(payload, limit=limit)

    async def grep_documents(
        self,
        urns: list[str],
        pattern: str,
        *,
        context_chars: int = 200,
    ) -> list[ContextDocument]:
        """Grep document bodies via ACK grep_documents."""
        if not self._configured or not urns:
            return []
        payload = await self.call_tool(
            "grep_documents",
            {
                "urns": urns,
                "pattern": pattern,
                "context_chars": context_chars,
            },
        )
        return _documents_from_search(payload, limit=max(len(urns), 1))

    async def save_document(
        self,
        title: str,
        content: str,
        *,
        document_type: str = "Context",
        related_assets: list[str] | None = None,
        topics: list[str] | None = None,
        urn: str | None = None,
    ) -> ContextDocument:
        """Persist a document via ACK save_document (mutations enabled)."""
        if not self._configured:
            return ContextDocument(
                urn=urn or "",
                title=title,
                body=content,
                related_entities=related_assets or [],
                tags=topics or [],
            )
        payload = await self.call_tool(
            "save_document",
            {
                "document_type": document_type,
                "title": title,
                "content": content,
                "urn": urn,
                "topics": topics,
                "related_assets": related_assets,
            },
        )
        docs = _documents_from_search(payload, limit=1)
        if docs:
            return docs[0]
        saved_urn = urn or ""
        if isinstance(payload, dict):
            saved_urn = str(payload.get("urn", saved_urn))
        return ContextDocument(
            urn=saved_urn,
            title=title,
            body=content,
            related_entities=related_assets or [],
            tags=topics or [],
        )

    async def retrieve_context(
        self,
        entity_urn: str,
        *,
        query: str | None = None,
        limit: int = 5,
    ) -> list[ContextDocument]:
        """Ground agents using search_documents (+ grep_documents when useful).

        ACK document tools replace the previous fabricated context helper.
        """
        if not self._configured:
            return []

        search_query = query or entity_urn
        try:
            docs = await self.search_documents(search_query, semantic_query=query, limit=limit)
            if docs and query:
                urns = [d.urn for d in docs if d.urn]
                if urns:
                    grepped = await self.grep_documents(urns[:limit], query)
                    if grepped:
                        return grepped[:limit]
            return docs[:limit]
        except Exception as exc:  # noqa: BLE001
            logger.warning("context_kit.retrieve_failed", error=str(exc))
            if self._settings.kavach_strict_datahub:
                raise DataHubError("Failed to retrieve context documents") from exc
            return []

    async def find_sql_context(self, query_text: str) -> Any:
        """Locate tables/columns/example queries via MCP find_sql_context."""
        if not self._configured:
            return None
        return await self.call_tool("find_sql_context", {"query_text": query_text})

    async def draft_sql_for_tables(
        self,
        table_urns: list[str],
        prompt: str,
    ) -> Any:
        """Draft SQL grounded in DataHub context via MCP draft_sql_for_tables."""
        if not self._configured:
            return None
        return await self.call_tool(
            "draft_sql_for_tables",
            {"table_urns": table_urns, "prompt": prompt},
        )

    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]:
        """Attach glossary terms using MCP add_terms (ACK: add_glossary_terms)."""
        if not self._configured:
            return {"entity_urn": entity_urn, "term_urns": term_urns}
        # Prefer MCP name add_terms; fall back to ACK LangChain add_glossary_terms.
        if "add_glossary_terms" in self._tools_by_name and self._mcp_call is None:
            raw = await self.call_tool(
                "add_glossary_terms",
                {"term_urns": term_urns, "entity_urns": [entity_urn]},
            )
        else:
            try:
                raw = await self.call_tool(
                    "add_terms",
                    {"entity_urn": entity_urn, "terms": term_urns},
                )
            except DataHubError:
                raw = await self.call_tool(
                    "add_glossary_terms",
                    {"term_urns": term_urns, "entity_urns": [entity_urn]},
                )
        if isinstance(raw, dict):
            return dict(raw)
        return {"entity_urn": entity_urn, "term_urns": term_urns}

    def format_for_prompt(self, documents: list[ContextDocument]) -> str:
        """Render context documents as a grounding block for LLM prompts."""
        if not documents:
            return ""
        parts = ["## Relevant DataHub Context"]
        for doc in documents:
            parts.append(f"### {doc.title}\n{doc.body}")
        return "\n\n".join(parts)
