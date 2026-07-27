"""Typed DataHub context service consumed by agents."""

from __future__ import annotations

from typing import Any

from app.config import Settings, get_settings
from app.datahub.client import DataHubClient
from app.datahub.context_kit import AgentContextKit
from app.datahub.models import (
    Assertion,
    AssertionType,
    BlastRadius,
    ContextDocument,
    DatasetRef,
    Incident,
    IncidentStatus,
    LineageEdge,
    MLModelRef,
    Owner,
    QueryRecord,
    SchemaField,
)

DEMO_BLAST_RADIUS_COLUMN = "main_marts.mart_demand_features.next_day_qty"


class DataHubContextService:
    """High-level async API over DataHub — the only entry point for agents."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._client = DataHubClient(self._settings)
        mcp_call = self._client._mcp.call_tool if self._client.is_live else None
        self._context_kit = AgentContextKit(self._settings, mcp_call=mcp_call)

    @property
    def context_kit(self) -> AgentContextKit:
        """Expose Agent Context Kit for nodes that need LangChain tools directly."""
        return self._context_kit

    def get_langchain_tools(self) -> list[Any]:
        """Real ACK tools from build_langchain_tools(include_mutations=True)."""
        return self._context_kit.get_langchain_tools()

    async def get_dataset(self, urn_or_name: str) -> DatasetRef:
        """Fetch dataset metadata."""
        return await self._client.get_dataset(urn_or_name)

    async def get_schema(self, urn_or_name: str) -> list[SchemaField]:
        """Fetch dataset column schema."""
        return await self._client.get_schema(urn_or_name)

    async def get_upstreams(
        self,
        urn_or_name: str,
        *,
        depth: int = 1,
        column_level: bool = False,
    ) -> list[LineageEdge]:
        """Traverse upstream lineage."""
        return await self._client.get_upstreams(
            urn_or_name, depth=depth, column_level=column_level
        )

    async def get_downstreams(
        self,
        urn_or_name: str,
        *,
        depth: int = 1,
        column_level: bool = False,
    ) -> list[LineageEdge]:
        """Traverse downstream lineage."""
        return await self._client.get_downstreams(
            urn_or_name, depth=depth, column_level=column_level
        )

    async def get_blast_radius(self, urn_or_name: str) -> BlastRadius:
        """Compute downstream impact including ML models and deployments."""
        return await self._client.get_blast_radius(urn_or_name)

    async def get_blast_radius_demo(self) -> dict[str, Any]:
        """Return blast radius for the demo corrupted column (ML-Guardian moment)."""
        radius = await self.get_blast_radius(DEMO_BLAST_RADIUS_COLUMN)
        return radius.model_dump(mode="json")

    async def get_dataset_queries(self, urn_or_name: str) -> list[QueryRecord]:
        """Fetch historical queries for a dataset (ACK/MCP get_dataset_queries)."""
        return await self._client.get_dataset_queries(urn_or_name)

    async def find_sql_context(self, query_text: str) -> Any:
        """Locate tables/columns/example queries (MCP find_sql_context)."""
        if self._client.is_live:
            try:
                result = await self._context_kit.find_sql_context(query_text)
                if result is not None:
                    return result
            except Exception:  # noqa: BLE001
                pass
        return await self._client.find_sql_context(query_text)

    async def draft_sql_for_tables(self, table_urns: list[str], prompt: str) -> Any:
        """Draft SQL grounded in catalog context (MCP draft_sql_for_tables)."""
        if self._client.is_live:
            try:
                result = await self._context_kit.draft_sql_for_tables(table_urns, prompt)
                if result is not None:
                    return result
            except Exception:  # noqa: BLE001
                pass
        return await self._client.draft_sql_for_tables(table_urns, prompt)

    async def get_ml_model(self, urn: str) -> MLModelRef:
        """Fetch ML model metadata and feature lineage."""
        return await self._client.get_ml_model(urn)

    async def get_owners(self, urn_or_name: str) -> list[Owner]:
        """Fetch entity owners."""
        return await self._client.get_owners(urn_or_name)

    async def search(self, query: str, *, limit: int = 10) -> list[DatasetRef]:
        """Search datasets by name or tag."""
        return await self._client.search(query, limit=limit)

    async def retrieve_context(
        self, entity_urn: str, *, query: str | None = None
    ) -> list[ContextDocument]:
        """Retrieve context via ACK search_documents / grep_documents."""
        return await self._context_kit.retrieve_context(entity_urn, query=query)

    async def search_documents(
        self, query: str = "*", *, limit: int = 10
    ) -> list[ContextDocument]:
        """Search DataHub documents (ACK search_documents)."""
        return await self._context_kit.search_documents(query, limit=limit)

    async def grep_documents(
        self, urns: list[str], pattern: str
    ) -> list[ContextDocument]:
        """Grep document content (ACK grep_documents)."""
        return await self._context_kit.grep_documents(urns, pattern)

    async def save_document(
        self,
        title: str,
        content: str,
        *,
        related_assets: list[str] | None = None,
        topics: list[str] | None = None,
    ) -> ContextDocument:
        """Write a document via ACK save_document."""
        return await self._context_kit.save_document(
            title,
            content,
            related_assets=related_assets,
            topics=topics,
        )

    async def save_context_document(self, doc: ContextDocument) -> ContextDocument:
        """Write a context document back to DataHub (fixture path + ACK save_document)."""
        if self._client.is_live:
            try:
                saved = await self._context_kit.save_document(
                    doc.title,
                    doc.body,
                    related_assets=doc.related_entities,
                    topics=doc.tags,
                    urn=doc.urn or None,
                )
                if saved.urn:
                    return saved
            except Exception:  # noqa: BLE001
                pass
        return await self._client.save_context_document(doc)

    async def add_tags(self, urn: str, tags: list[str]) -> dict[str, Any]:
        """Add tags to an entity."""
        return await self._client.add_tags(urn, tags)

    async def update_description(self, urn: str, description: str) -> dict[str, Any]:
        """Update an entity description."""
        return await self._client.update_description(urn, description)

    async def create_incident(
        self,
        title: str,
        description: str,
        affected_entities: list[str],
    ) -> Incident:
        """Open a DataHub incident."""
        return await self._client.create_incident(title, description, affected_entities)

    async def update_incident(self, urn: str, *, status: IncidentStatus) -> Incident:
        """Update incident lifecycle status."""
        return await self._client.update_incident(urn, status=status)

    async def resolve_incident(self, urn: str) -> Incident:
        """Resolve an incident."""
        return await self._client.resolve_incident(urn)

    async def emit_assertion(
        self,
        dataset_urn: str,
        assertion_type: AssertionType,
        description: str,
    ) -> Assertion:
        """Emit a data quality assertion entity."""
        return await self._client.emit_assertion(dataset_urn, assertion_type, description)

    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]:
        """Attach glossary terms (MCP/ACK add_terms)."""
        return await self._client.add_terms(entity_urn, term_urns)

    async def add_glossary_term(self, entity_urn: str, term_urn: str) -> dict[str, Any]:
        """Backward-compatible alias for add_terms (single term)."""
        return await self.add_terms(entity_urn, [term_urn])
