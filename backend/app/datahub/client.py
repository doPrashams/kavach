"""Async DataHub client — live MCP/SDK or fixture fallback."""

from __future__ import annotations

from typing import Any, Protocol, cast

import structlog

from app.config import Settings, get_settings
from app.datahub.fixtures import FixtureBackend
from app.datahub.mcp import DataHubMCPClient
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
from app.errors import DataHubError

logger = structlog.get_logger(__name__)


class DataHubBackend(Protocol):
    """Protocol shared by live and fixture backends."""

    async def get_dataset(self, urn_or_name: str) -> DatasetRef: ...
    async def get_schema(self, urn_or_name: str) -> list[SchemaField]: ...
    async def get_upstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]: ...
    async def get_downstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]: ...
    async def get_blast_radius(self, urn_or_name: str) -> BlastRadius: ...
    async def get_dataset_queries(self, urn_or_name: str) -> list[QueryRecord]: ...
    async def get_ml_model(self, urn: str) -> MLModelRef: ...
    async def get_owners(self, urn_or_name: str) -> list[Owner]: ...
    async def search(self, query: str, *, limit: int = 10) -> list[DatasetRef]: ...
    async def save_context_document(self, doc: ContextDocument) -> ContextDocument: ...
    async def add_tags(self, urn: str, tags: list[str]) -> dict[str, Any]: ...
    async def update_description(self, urn: str, description: str) -> dict[str, Any]: ...
    async def create_incident(
        self, title: str, description: str, affected_entities: list[str]
    ) -> Incident: ...
    async def update_incident(self, urn: str, *, status: IncidentStatus) -> Incident: ...
    async def resolve_incident(self, urn: str) -> Incident: ...
    async def emit_assertion(
        self, dataset_urn_val: str, assertion_type: AssertionType, description: str
    ) -> Assertion: ...
    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]: ...
    async def set_domains(self, entity_urn: str, domain_urns: list[str]) -> dict[str, Any]: ...
    async def add_owners(self, entity_urn: str, owners: list[str]) -> dict[str, Any]: ...
    async def find_sql_context(self, query_text: str) -> Any: ...
    async def draft_sql_for_tables(self, table_urns: list[str], prompt: str) -> Any: ...


class LiveDataHubBackend:
    """Live DataHub backend delegating to MCP tools and GraphQL."""

    def __init__(self, settings: Settings, mcp: DataHubMCPClient) -> None:
        self._settings = settings
        self._mcp = mcp
        self._fixture = FixtureBackend()

    async def _call(self, tool: str, args: dict[str, Any]) -> Any:
        return await self._mcp.call_tool(tool, args)

    async def get_dataset(self, urn_or_name: str) -> DatasetRef:
        raw = await self._call("get_dataset", {"urn": urn_or_name})
        return DatasetRef.model_validate(raw)

    async def get_schema(self, urn_or_name: str) -> list[SchemaField]:
        raw = await self._call("get_schema", {"urn": urn_or_name})
        return [SchemaField.model_validate(item) for item in raw]

    async def get_upstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]:
        raw = await self._call(
            "get_upstreams",
            {"urn": urn_or_name, "depth": depth, "column_level": column_level},
        )
        return [LineageEdge.model_validate(item) for item in raw]

    async def get_downstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]:
        raw = await self._call(
            "get_downstreams",
            {"urn": urn_or_name, "depth": depth, "column_level": column_level},
        )
        return [LineageEdge.model_validate(item) for item in raw]

    async def get_blast_radius(self, urn_or_name: str) -> BlastRadius:
        raw = await self._call("get_blast_radius", {"urn": urn_or_name})
        return BlastRadius.model_validate(raw)

    async def get_dataset_queries(self, urn_or_name: str) -> list[QueryRecord]:
        raw = await self._call("get_dataset_queries", {"urn": urn_or_name})
        return [QueryRecord.model_validate(item) for item in raw]

    async def get_ml_model(self, urn: str) -> MLModelRef:
        raw = await self._call("get_ml_model", {"urn": urn})
        return MLModelRef.model_validate(raw)

    async def get_owners(self, urn_or_name: str) -> list[Owner]:
        raw = await self._call("get_owners", {"urn": urn_or_name})
        return [Owner.model_validate(item) for item in raw]

    async def search(self, query: str, *, limit: int = 10) -> list[DatasetRef]:
        raw = await self._call("search", {"query": query, "limit": limit})
        return [DatasetRef.model_validate(item) for item in raw]

    async def save_context_document(self, doc: ContextDocument) -> ContextDocument:
        raw = await self._call("save_context_document", doc.model_dump(mode="json"))
        return ContextDocument.model_validate(raw)

    async def add_tags(self, urn: str, tags: list[str]) -> dict[str, Any]:
        result = await self._call("add_tags", {"urn": urn, "tags": tags})
        return dict(result) if isinstance(result, dict) else {"urn": urn, "tags": tags}

    async def update_description(self, urn: str, description: str) -> dict[str, Any]:
        result = await self._call("update_description", {"urn": urn, "description": description})
        return (
            dict(result)
            if isinstance(result, dict)
            else {"urn": urn, "description": description}
        )

    async def create_incident(
        self, title: str, description: str, affected_entities: list[str]
    ) -> Incident:
        raw = await self._call(
            "create_incident",
            {
                "title": title,
                "description": description,
                "affected_entities": affected_entities,
            },
        )
        return Incident.model_validate(raw)

    async def update_incident(self, urn: str, *, status: IncidentStatus) -> Incident:
        raw = await self._call("update_incident", {"urn": urn, "status": status.value})
        return Incident.model_validate(raw)

    async def resolve_incident(self, urn: str) -> Incident:
        return await self.update_incident(urn, status=IncidentStatus.RESOLVED)

    async def emit_assertion(
        self, dataset_urn_val: str, assertion_type: AssertionType, description: str
    ) -> Assertion:
        raw = await self._call(
            "emit_assertion",
            {
                "dataset_urn": dataset_urn_val,
                "assertion_type": assertion_type.value,
                "description": description,
            },
        )
        return Assertion.model_validate(raw)

    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]:
        result = await self._call(
            "add_terms", {"entity_urn": entity_urn, "terms": term_urns}
        )
        return (
            dict(result)
            if isinstance(result, dict)
            else {"entity_urn": entity_urn, "terms": term_urns}
        )

    async def set_domains(self, entity_urn: str, domain_urns: list[str]) -> dict[str, Any]:
        result = await self._call(
            "set_domains", {"entity_urn": entity_urn, "domains": domain_urns}
        )
        return (
            dict(result)
            if isinstance(result, dict)
            else {"entity_urn": entity_urn, "domains": domain_urns}
        )

    async def add_owners(self, entity_urn: str, owners: list[str]) -> dict[str, Any]:
        result = await self._call(
            "add_owners", {"entity_urn": entity_urn, "owners": owners}
        )
        return (
            dict(result)
            if isinstance(result, dict)
            else {"entity_urn": entity_urn, "owners": owners}
        )

    async def find_sql_context(self, query_text: str) -> Any:
        return await self._call("find_sql_context", {"query_text": query_text})

    async def draft_sql_for_tables(self, table_urns: list[str], prompt: str) -> Any:
        return await self._call(
            "draft_sql_for_tables", {"table_urns": table_urns, "prompt": prompt}
        )


class DataHubClient:
    """Unified async client — live when configured, fixture fallback on failure."""

    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()
        self._mcp = DataHubMCPClient(self._settings)
        self._fixture = FixtureBackend()
        self._live: LiveDataHubBackend | None = None
        if self._settings.datahub_gms_url and self._settings.datahub_token:
            logger.info("datahub.client.live_mode")
            self._live = LiveDataHubBackend(self._settings, self._mcp)
        else:
            logger.info("datahub.client.fixture_mode")

    @property
    def is_live(self) -> bool:
        """Whether live DataHub credentials are configured."""
        return self._live is not None

    @property
    def backend(self) -> DataHubBackend:
        """Primary backend (live when configured, else fixtures)."""
        return self._live or self._fixture

    async def _with_fallback(self, method: str, *args: Any, **kwargs: Any) -> Any:
        """Try live backend first; degrade to fixtures when live calls fail.

        When ``KAVACH_STRICT_DATAHUB=1``, protocol/HTTP failures (404, JSON-RPC
        errors, etc.) raise instead of silently returning fixtures.
        """
        if self._live is None:
            fn = getattr(self._fixture, method)
            return await fn(*args, **kwargs)
        try:
            fn = getattr(self._live, method)
            return await fn(*args, **kwargs)
        except Exception as exc:  # noqa: BLE001
            if self._settings.kavach_strict_datahub:
                logger.error(
                    "datahub.strict_failure",
                    method=method,
                    error=str(exc),
                )
                if isinstance(exc, DataHubError):
                    raise
                raise DataHubError(f"strict DataHub failure on {method}: {exc}") from exc
            logger.warning("datahub.live_fallback", method=method, error=str(exc))
            fn = getattr(self._fixture, method)
            return await fn(*args, **kwargs)

    async def get_dataset(self, urn_or_name: str) -> DatasetRef:
        return cast(DatasetRef, await self._with_fallback("get_dataset", urn_or_name))

    async def get_schema(self, urn_or_name: str) -> list[SchemaField]:
        return cast(list[SchemaField], await self._with_fallback("get_schema", urn_or_name))

    async def get_upstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]:
        return cast(
            list[LineageEdge],
            await self._with_fallback(
                "get_upstreams", urn_or_name, depth=depth, column_level=column_level
            ),
        )

    async def get_downstreams(
        self, urn_or_name: str, *, depth: int = 1, column_level: bool = False
    ) -> list[LineageEdge]:
        return cast(
            list[LineageEdge],
            await self._with_fallback(
                "get_downstreams", urn_or_name, depth=depth, column_level=column_level
            ),
        )

    async def get_blast_radius(self, urn_or_name: str) -> BlastRadius:
        return cast(BlastRadius, await self._with_fallback("get_blast_radius", urn_or_name))

    async def get_dataset_queries(self, urn_or_name: str) -> list[QueryRecord]:
        return cast(
            list[QueryRecord], await self._with_fallback("get_dataset_queries", urn_or_name)
        )

    async def get_ml_model(self, urn: str) -> MLModelRef:
        return cast(MLModelRef, await self._with_fallback("get_ml_model", urn))

    async def get_owners(self, urn_or_name: str) -> list[Owner]:
        return cast(list[Owner], await self._with_fallback("get_owners", urn_or_name))

    async def search(self, query: str, *, limit: int = 10) -> list[DatasetRef]:
        return cast(list[DatasetRef], await self._with_fallback("search", query, limit=limit))

    async def save_context_document(self, doc: ContextDocument) -> ContextDocument:
        return cast(
            ContextDocument, await self._with_fallback("save_context_document", doc)
        )

    async def add_tags(self, urn: str, tags: list[str]) -> dict[str, Any]:
        return cast(dict[str, Any], await self._with_fallback("add_tags", urn, tags))

    async def update_description(self, urn: str, description: str) -> dict[str, Any]:
        return cast(
            dict[str, Any],
            await self._with_fallback("update_description", urn, description),
        )

    async def create_incident(
        self, title: str, description: str, affected_entities: list[str]
    ) -> Incident:
        return cast(
            Incident,
            await self._with_fallback("create_incident", title, description, affected_entities),
        )

    async def update_incident(self, urn: str, *, status: IncidentStatus) -> Incident:
        return cast(
            Incident, await self._with_fallback("update_incident", urn, status=status)
        )

    async def resolve_incident(self, urn: str) -> Incident:
        return cast(Incident, await self._with_fallback("resolve_incident", urn))

    async def emit_assertion(
        self, dataset_urn_val: str, assertion_type: AssertionType, description: str
    ) -> Assertion:
        return cast(
            Assertion,
            await self._with_fallback(
                "emit_assertion", dataset_urn_val, assertion_type, description
            ),
        )

    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]:
        return cast(
            dict[str, Any],
            await self._with_fallback("add_terms", entity_urn, term_urns),
        )

    async def set_domains(self, entity_urn: str, domain_urns: list[str]) -> dict[str, Any]:
        return cast(
            dict[str, Any],
            await self._with_fallback("set_domains", entity_urn, domain_urns),
        )

    async def add_owners(self, entity_urn: str, owners: list[str]) -> dict[str, Any]:
        return cast(
            dict[str, Any],
            await self._with_fallback("add_owners", entity_urn, owners),
        )

    async def find_sql_context(self, query_text: str) -> Any:
        return await self._with_fallback("find_sql_context", query_text)

    async def draft_sql_for_tables(self, table_urns: list[str], prompt: str) -> Any:
        return await self._with_fallback("draft_sql_for_tables", table_urns, prompt)

    async def add_glossary_term(self, entity_urn: str, term_urn: str) -> dict[str, Any]:
        """Backward-compatible alias for add_terms (single term)."""
        return await self.add_terms(entity_urn, [term_urn])
