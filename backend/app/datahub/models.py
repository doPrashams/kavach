"""Pydantic models for DataHub context layer responses."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class EntityType(StrEnum):
    """DataHub entity types surfaced by the context layer."""

    DATASET = "dataset"
    ML_MODEL = "mlModel"
    ML_DEPLOYMENT = "mlModelDeployment"
    DASHBOARD = "dashboard"
    ML_FEATURE = "mlFeature"


class DatasetRef(BaseModel):
    """Reference to a DataHub dataset."""

    urn: str
    name: str
    platform: str = "duckdb"
    description: str | None = None
    tags: list[str] = Field(default_factory=list)


class SchemaField(BaseModel):
    """Column metadata for a dataset."""

    name: str
    type: str
    description: str | None = None
    nullable: bool = True


class Owner(BaseModel):
    """Dataset or entity owner."""

    urn: str
    owner_type: str = "user"
    email: str | None = None


class GlossaryTerm(BaseModel):
    """Business glossary term attached to an entity."""

    urn: str
    name: str
    definition: str | None = None


class LineageEdge(BaseModel):
    """Directed lineage edge between two entities."""

    upstream: str
    downstream: str
    edge_type: str = "dbt_model"
    column_level: bool = False
    upstream_column: str | None = None
    downstream_column: str | None = None


class MLModelRef(BaseModel):
    """ML model registered in DataHub."""

    urn: str
    name: str
    description: str | None = None
    training_data: str | None = None
    input_features: list[str] = Field(default_factory=list)


class MLDeploymentRef(BaseModel):
    """Production or staging ML model deployment."""

    urn: str
    name: str
    model_urn: str
    environment: str = "prod"
    description: str | None = None


class QueryRecord(BaseModel):
    """Historical query against a dataset."""

    query: str
    dataset_urn: str
    user: str
    frequency: str | None = None
    last_run: datetime | None = None


class IncidentStatus(StrEnum):
    """Lifecycle status for a DataHub incident."""

    OPEN = "open"
    INVESTIGATING = "investigating"
    RESOLVED = "resolved"


class Incident(BaseModel):
    """DataHub incident entity."""

    urn: str
    title: str
    description: str
    status: IncidentStatus = IncidentStatus.OPEN
    affected_entities: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class AssertionType(StrEnum):
    """Assertion kinds emitted to DataHub."""

    VOLUME = "volume"
    FRESHNESS = "freshness"
    SCHEMA = "schema"
    CUSTOM = "custom"


class Assertion(BaseModel):
    """Data quality assertion entity."""

    urn: str
    dataset_urn: str
    assertion_type: AssertionType
    description: str
    result: str | None = None


class ContextDocument(BaseModel):
    """Agent Context Kit context document."""

    urn: str
    title: str
    body: str
    related_entities: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class BlastRadiusEntity(BaseModel):
    """Single entity in a blast-radius result."""

    urn: str
    name: str
    entity_type: EntityType
    via_column: str | None = None


class BlastRadius(BaseModel):
    """Downstream impact from a dataset or column."""

    source_urn: str
    datasets: list[BlastRadiusEntity] = Field(default_factory=list)
    dashboards: list[BlastRadiusEntity] = Field(default_factory=list)
    ml_models: list[BlastRadiusEntity] = Field(default_factory=list)
    ml_deployments: list[BlastRadiusEntity] = Field(default_factory=list)

    def model_dump_json_compatible(self) -> dict[str, Any]:
        """Return a JSON-serializable dict for assertions."""
        return self.model_dump(mode="json")
