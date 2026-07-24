"""Agent graph state models."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field

from app.datahub.models import BlastRadius


class Severity(StrEnum):
    """Incident severity levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(StrEnum):
    """Agent-run incident lifecycle."""

    DETECTED = "detected"
    INVESTIGATING = "investigating"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"


class AgentName(StrEnum):
    """Named agents in the LangGraph team."""

    SENTINEL = "sentinel"
    INVESTIGATOR = "investigator"
    IMPACT_ANALYST = "impact_analyst"
    ML_GUARDIAN = "ml_guardian"
    FIXER = "fixer"
    SCRIBE = "scribe"
    COMMS = "comms"


class AgentEvent(BaseModel):
    """Timeline event emitted during a run."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    run_id: str
    agent: AgentName
    event_type: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class FixPlan(BaseModel):
    """Proposed remediation plan (H06 plugs in real codegen)."""

    summary: str
    steps: list[str]
    target_entities: list[str] = Field(default_factory=list)
    safeguard_assertion: str | None = None
    hold_recommendation: bool = False


class IncidentState(BaseModel):
    """Shared LangGraph state for an incident run."""

    run_id: str = ""
    incident_id: str | None = None
    incident_urn: str | None = None
    trigger: dict[str, Any] = Field(default_factory=dict)
    status: IncidentStatus = IncidentStatus.DETECTED
    severity: Severity = Severity.MEDIUM
    root_cause: str | None = None
    findings: list[str] = Field(default_factory=list)
    blast_radius: BlastRadius | None = None
    ml_risk: Severity = Severity.LOW
    ml_hold_recommended: bool = False
    fix_plan: FixPlan | None = None
    postmortem: str | None = None
    timeline: list[AgentEvent] = Field(default_factory=list)
    notification_sent: bool = False

    model_config = {"arbitrary_types_allowed": True}
