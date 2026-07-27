"""Load recorded DataHub fixtures for offline demos and CI."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.datahub.models import (
    Assertion,
    AssertionType,
    BlastRadius,
    BlastRadiusEntity,
    ContextDocument,
    DatasetRef,
    EntityType,
    GlossaryTerm,
    Incident,
    IncidentStatus,
    LineageEdge,
    MLModelRef,
    Owner,
    QueryRecord,
    SchemaField,
)
from app.errors import DataHubError

FIXTURES_ROOT = Path(__file__).resolve().parents[3] / "data" / "fixtures"
ML_FIXTURES_ROOT = Path(__file__).resolve().parents[3] / "ml" / "fixtures"
WRITEBACK_PATH = FIXTURES_ROOT / "writeback.jsonl"


def load_json(path: Path) -> Any:
    """Load JSON from an absolute path."""
    if not path.exists():
        raise FileNotFoundError(f"Fixture not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_queries() -> list[dict[str, Any]]:
    """Return recorded query-history entries."""
    data = load_json(FIXTURES_ROOT / "queries.json")
    if not isinstance(data, list):
        raise ValueError("queries fixture must be a list")
    return data


def load_schemas() -> dict[str, Any]:
    """Return recorded dataset schema payloads."""
    data = load_json(FIXTURES_ROOT / "schemas.json")
    if not isinstance(data, dict):
        raise ValueError("schemas fixture must be a dict")
    return data


def load_lineage() -> list[dict[str, Any]]:
    """Return recorded lineage edges."""
    data = load_json(FIXTURES_ROOT / "lineage.json")
    if not isinstance(data, list):
        raise ValueError("lineage fixture must be a list")
    return data


def load_ml_lineage() -> dict[str, Any]:
    """Return recorded ML lineage payload from H02."""
    data = load_json(ML_FIXTURES_ROOT / "ml_lineage.json")
    if not isinstance(data, dict):
        raise ValueError("ml_lineage fixture must be a dict")
    return data


def dataset_urn(name: str) -> str:
    """Build a canonical dataset URN from a table name."""
    return f"urn:li:dataset:(urn:li:dataPlatform:duckdb,{name},PROD)"


def parse_table_urn(urn_or_name: str) -> str:
    """Normalize a URN or table name to schema.table form."""
    if urn_or_name.startswith("urn:li:dataset:"):
        inner = urn_or_name.split(",", 2)[1]
        return inner
    if "." in urn_or_name and not urn_or_name.startswith("urn:"):
        return urn_or_name
    raise DataHubError(f"Cannot parse dataset identifier: {urn_or_name}")


def parse_column_ref(ref: str) -> tuple[str, str | None]:
    """Parse schema.table or schema.table.column into parts."""
    if ref.startswith("urn:"):
        table = parse_table_urn(ref)
        return table, None
    parts = ref.split(".")
    if len(parts) == 2:
        return ref, None
    if len(parts) == 3:
        return f"{parts[0]}.{parts[1]}", parts[2]
    raise DataHubError(f"Invalid column reference: {ref}")


class FixtureBackend:
    """Offline backend implementing DataHub reads/writes from recorded fixtures."""

    def __init__(self) -> None:
        self._schemas = load_schemas()
        self._lineage = load_lineage()
        self._queries = load_queries()
        self._ml = load_ml_lineage()
        self._incidents: dict[str, Incident] = {}
        self._context_docs: dict[str, ContextDocument] = {}
        self._glossary: dict[str, GlossaryTerm] = {
            "urn:li:glossaryTerm:revenue": GlossaryTerm(
                urn="urn:li:glossaryTerm:revenue",
                name="Gross Revenue",
                definition="Total completed order line revenue",
            ),
            "urn:li:glossaryTerm:demand": GlossaryTerm(
                urn="urn:li:glossaryTerm:demand",
                name="Demand Forecast",
                definition="Predicted next-day quantity per product",
            ),
            "urn:li:glossaryTerm:HIPAA": GlossaryTerm(
                urn="urn:li:glossaryTerm:HIPAA",
                name="HIPAA",
                definition="Protected health information governed by HIPAA",
            ),
            "urn:li:glossaryTerm:PII": GlossaryTerm(
                urn="urn:li:glossaryTerm:PII",
                name="PII",
                definition="Personally identifiable information",
            ),
        }
        WRITEBACK_PATH.parent.mkdir(parents=True, exist_ok=True)

    def _append_writeback(self, operation: str, payload: dict[str, Any]) -> None:
        """Append a write operation to the fixture writeback log."""
        entry = {
            "operation": operation,
            "timestamp": datetime.now(UTC).isoformat(),
            "payload": payload,
        }
        with WRITEBACK_PATH.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry) + "\n")

    async def get_dataset(self, urn_or_name: str) -> DatasetRef:
        """Return dataset metadata from fixtures."""
        table = parse_table_urn(urn_or_name) if urn_or_name.startswith("urn:") else urn_or_name
        schema = self._schemas.get(table)
        if schema is None:
            raise DataHubError(f"Dataset not found: {table}")
        return DatasetRef(
            urn=dataset_urn(table),
            name=table,
            platform=schema.get("platform", "duckdb"),
            tags=schema.get("tags", []),
        )

    async def get_schema(self, urn_or_name: str) -> list[SchemaField]:
        """Return column schema for a dataset."""
        table, _ = parse_column_ref(urn_or_name)
        schema = self._schemas.get(table)
        if schema is None:
            raise DataHubError(f"Schema not found: {table}")
        return [SchemaField.model_validate(col) for col in schema.get("columns", [])]

    async def get_upstreams(
        self,
        urn_or_name: str,
        *,
        depth: int = 1,
        column_level: bool = False,
    ) -> list[LineageEdge]:
        """Return upstream lineage edges."""
        table, column = parse_column_ref(urn_or_name)
        edges: list[LineageEdge] = []
        for edge in self._lineage:
            if edge["downstream"] == table or edge["downstream"] == urn_or_name:
                edges.append(
                    LineageEdge(
                        upstream=edge["upstream"],
                        downstream=edge["downstream"],
                        edge_type=edge.get("type", "dbt_model"),
                        column_level=column_level,
                        downstream_column=column,
                    )
                )
        if depth > 1:
            upstream_tables = {e.upstream for e in edges}
            for up_table in list(upstream_tables):
                nested = await self.get_upstreams(
                    up_table, depth=depth - 1, column_level=column_level
                )
                edges.extend(nested)
        return edges

    async def get_downstreams(
        self,
        urn_or_name: str,
        *,
        depth: int = 1,
        column_level: bool = False,
    ) -> list[LineageEdge]:
        """Return downstream lineage edges."""
        table, column = parse_column_ref(urn_or_name)
        edges: list[LineageEdge] = []
        source = table if not urn_or_name.startswith("urn:") else urn_or_name
        for edge in self._lineage:
            if edge["upstream"] == source or edge["upstream"] == table:
                edges.append(
                    LineageEdge(
                        upstream=edge["upstream"],
                        downstream=edge["downstream"],
                        edge_type=edge.get("type", "dbt_model"),
                        column_level=column_level,
                        upstream_column=column,
                    )
                )
        ml_edges = self._ml.get("edges", [])
        dataset_urn_val = dataset_urn(table)
        for edge in ml_edges:
            if edge["upstream"] == dataset_urn_val or edge["upstream"] == table:
                edges.append(
                    LineageEdge(
                        upstream=edge["upstream"],
                        downstream=edge["downstream"],
                        edge_type=edge.get("type", "ml"),
                        column_level=column_level,
                    )
                )
        if column and column_level:
            for feature in self._ml.get("mlFeature", []):
                for upstream in feature.get("upstream", []):
                    if upstream.get("column") == column:
                        model_urn = self._ml["mlModel"]["urn"]
                        edges.append(
                            LineageEdge(
                                upstream=feature["urn"],
                                downstream=model_urn,
                                edge_type="mlFeatureToModel",
                                column_level=True,
                                upstream_column=column,
                            )
                        )
        if depth > 1:
            downstream_targets = {e.downstream for e in edges}
            for target in list(downstream_targets):
                if target.startswith("urn:li:mlModel:") or target.startswith(
                    "urn:li:mlModelDeployment:"
                ):
                    continue
                nested = await self.get_downstreams(
                    target, depth=depth - 1, column_level=column_level
                )
                edges.extend(nested)
        return edges

    async def get_blast_radius(self, urn_or_name: str) -> BlastRadius:
        """Compute downstream blast radius including ML deployments via column lineage."""
        table, column = parse_column_ref(urn_or_name)
        source = urn_or_name if urn_or_name.startswith("urn:") else dataset_urn(table)
        if column:
            source = f"{table}.{column}"

        result = BlastRadius(source_urn=source)
        seen: set[str] = set()

        def add_entity(
            urn: str, name: str, entity_type: EntityType, via: str | None = None
        ) -> None:
            if urn in seen:
                return
            seen.add(urn)
            entity = BlastRadiusEntity(
                urn=urn, name=name, entity_type=entity_type, via_column=via
            )
            if entity_type == EntityType.DATASET:
                result.datasets.append(entity)
            elif entity_type == EntityType.DASHBOARD:
                result.dashboards.append(entity)
            elif entity_type == EntityType.ML_MODEL:
                result.ml_models.append(entity)
            elif entity_type == EntityType.ML_DEPLOYMENT:
                result.ml_deployments.append(entity)

        downstream = await self.get_downstreams(
            urn_or_name if column else table,
            depth=3,
            column_level=bool(column),
        )
        for edge in downstream:
            downstream_id = edge.downstream
            if downstream_id.startswith("urn:li:mlModel:"):
                model = self._ml.get("mlModel", {})
                add_entity(
                    downstream_id,
                    model.get("name", downstream_id),
                    EntityType.ML_MODEL,
                    column,
                )
            elif downstream_id.startswith("urn:li:mlModelDeployment:"):
                deployment = self._ml.get("mlModelDeployment", {})
                add_entity(
                    downstream_id,
                    deployment.get("name", downstream_id),
                    EntityType.ML_DEPLOYMENT,
                    column,
                )
            elif not downstream_id.startswith("urn:"):
                add_entity(dataset_urn(downstream_id), downstream_id, EntityType.DATASET, column)

        if table == "main_marts.mart_demand_features" or (
            table == "main_marts.mart_demand_features" and column
        ):
            model = self._ml.get("mlModel", {})
            deployment = self._ml.get("mlModelDeployment", {})
            add_entity(model["urn"], model["name"], EntityType.ML_MODEL, column)
            add_entity(
                deployment["urn"],
                deployment["name"],
                EntityType.ML_DEPLOYMENT,
                column or "next_day_qty",
            )

        if table == "main_marts.mart_daily_revenue":
            result.dashboards.append(
                BlastRadiusEntity(
                    urn="urn:li:dashboard:(looker,revenue_ops,PROD)",
                    name="Revenue Ops Dashboard",
                    entity_type=EntityType.DASHBOARD,
                )
            )

        return result

    async def get_dataset_queries(self, urn_or_name: str) -> list[QueryRecord]:
        """Return query history for a dataset."""
        table = parse_table_urn(urn_or_name) if urn_or_name.startswith("urn:") else urn_or_name
        urn_val = dataset_urn(table)
        records: list[QueryRecord] = []
        for item in self._queries:
            if item.get("dataset") == urn_val or table in item.get("dataset", ""):
                records.append(
                    QueryRecord(
                        query=item["query"],
                        dataset_urn=item["dataset"],
                        user=item["user"],
                        frequency=item.get("frequency"),
                    )
                )
        return records

    async def get_ml_model(self, urn: str) -> MLModelRef:
        """Return ML model metadata."""
        model = self._ml.get("mlModel", {})
        if urn != model.get("urn") and urn != model.get("name"):
            raise DataHubError(f"ML model not found: {urn}")
        return MLModelRef(
            urn=model["urn"],
            name=model["name"],
            description=model.get("description"),
            training_data=model.get("trainingData"),
            input_features=model.get("inputFeatures", []),
        )

    async def get_owners(self, urn_or_name: str) -> list[Owner]:
        """Return owners for a dataset."""
        table = parse_table_urn(urn_or_name) if urn_or_name.startswith("urn:") else urn_or_name
        schema = self._schemas.get(table)
        if schema is None:
            return []
        owner_email = schema.get("owner")
        if not owner_email:
            return []
        return [
            Owner(
                urn=f"urn:li:corpuser:{owner_email}",
                owner_type="user",
                email=owner_email,
            )
        ]

    async def search(self, query: str, *, limit: int = 10) -> list[DatasetRef]:
        """Simple text search across fixture datasets."""
        query_lower = query.lower()
        results: list[DatasetRef] = []
        for table, schema in self._schemas.items():
            haystack = f"{table} {' '.join(schema.get('tags', []))}".lower()
            if query_lower in haystack:
                results.append(
                    DatasetRef(
                        urn=dataset_urn(table),
                        name=table,
                        platform=schema.get("platform", "duckdb"),
                        tags=schema.get("tags", []),
                    )
                )
            if len(results) >= limit:
                break
        return results

    async def save_context_document(self, doc: ContextDocument) -> ContextDocument:
        """Persist a context document to writeback."""
        if not doc.urn:
            doc = doc.model_copy(update={"urn": f"urn:li:contextDocument:{uuid4()}"})
        self._context_docs[doc.urn] = doc
        self._append_writeback("save_context_document", doc.model_dump(mode="json"))
        return doc

    async def add_tags(self, urn: str, tags: list[str]) -> dict[str, Any]:
        """Add tags to an entity."""
        payload = {"urn": urn, "tags": tags}
        self._append_writeback("add_tags", payload)
        return payload

    async def update_description(self, urn: str, description: str) -> dict[str, Any]:
        """Update entity description."""
        payload = {"urn": urn, "description": description}
        self._append_writeback("update_description", payload)
        return payload

    async def create_incident(
        self,
        title: str,
        description: str,
        affected_entities: list[str],
    ) -> Incident:
        """Create a new incident."""
        incident = Incident(
            urn=f"urn:li:incident:{uuid4()}",
            title=title,
            description=description,
            affected_entities=affected_entities,
            status=IncidentStatus.OPEN,
        )
        self._incidents[incident.urn] = incident
        self._append_writeback("create_incident", incident.model_dump(mode="json"))
        return incident

    async def update_incident(self, urn: str, *, status: IncidentStatus) -> Incident:
        """Update incident status."""
        incident = self._incidents.get(urn)
        if incident is None:
            raise DataHubError(f"Incident not found: {urn}")
        updated = incident.model_copy(update={"status": status})
        self._incidents[urn] = updated
        self._append_writeback("update_incident", updated.model_dump(mode="json"))
        return updated

    async def resolve_incident(self, urn: str) -> Incident:
        """Resolve an open incident."""
        return await self.update_incident(urn, status=IncidentStatus.RESOLVED)

    async def emit_assertion(
        self,
        dataset_urn_val: str,
        assertion_type: AssertionType,
        description: str,
    ) -> Assertion:
        """Emit a data quality assertion entity."""
        assertion = Assertion(
            urn=f"urn:li:assertion:{uuid4()}",
            dataset_urn=dataset_urn_val,
            assertion_type=assertion_type,
            description=description,
        )
        self._append_writeback("emit_assertion", assertion.model_dump(mode="json"))
        return assertion

    async def add_terms(self, entity_urn: str, term_urns: list[str]) -> dict[str, Any]:
        """Attach glossary terms to an entity (ACK/MCP add_terms)."""
        terms = []
        for term_urn in term_urns:
            term = self._glossary.get(term_urn)
            if term is None:
                raise DataHubError(f"Glossary term not found: {term_urn}")
            terms.append(term.model_dump(mode="json"))
        payload = {"entity_urn": entity_urn, "terms": terms}
        self._append_writeback("add_terms", payload)
        return payload

    async def add_glossary_term(self, entity_urn: str, term_urn: str) -> dict[str, Any]:
        """Backward-compatible alias for add_terms (single term)."""
        return await self.add_terms(entity_urn, [term_urn])

    async def set_domains(self, entity_urn: str, domain_urns: list[str]) -> dict[str, Any]:
        """Assign domain membership (MCP set_domains)."""
        payload = {"entity_urn": entity_urn, "domains": domain_urns}
        self._append_writeback("set_domains", payload)
        return payload

    async def add_owners(self, entity_urn: str, owners: list[str]) -> dict[str, Any]:
        """Attach ownership (MCP add_owners)."""
        payload = {"entity_urn": entity_urn, "owners": owners}
        self._append_writeback("add_owners", payload)
        return payload

    async def find_sql_context(self, query_text: str) -> dict[str, Any]:
        """Fixture fallback for MCP find_sql_context."""
        matches = [
            item
            for item in self._queries
            if query_text.lower() in str(item.get("query", "")).lower()
            or query_text.lower() in str(item.get("dataset", "")).lower()
        ]
        return {
            "query_text": query_text,
            "tables": list({m.get("dataset") for m in matches if m.get("dataset")}),
            "sample_queries": [m.get("query") for m in matches[:5]],
        }

    async def draft_sql_for_tables(
        self, table_urns: list[str], prompt: str
    ) -> dict[str, Any]:
        """Fixture fallback for MCP draft_sql_for_tables."""
        tables = ", ".join(table_urns) if table_urns else "unknown_table"
        sql = f"-- drafted offline for: {prompt}\nSELECT * FROM {tables} LIMIT 100"
        return {"prompt": prompt, "table_urns": table_urns, "sql": sql}
