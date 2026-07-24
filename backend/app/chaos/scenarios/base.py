"""Chaos scenario protocol and shared types."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


@dataclass(frozen=True)
class ExpectedSignal:
    """Assertion Sentinel should emit for a scenario."""

    assertion_type: AssertionType
    description: str
    dataset: str


@dataclass(frozen=True)
class ScenarioMeta:
    """Static metadata used by agents and tests."""

    name: str
    root_cause: str
    summary: str
    affected_tables: tuple[str, ...]
    blast_radius_entities: tuple[str, ...]


class Scenario(Protocol):
    """Protocol for deterministic chaos scenarios."""

    meta: ScenarioMeta

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        """Inject a fault into the warehouse."""

    def heal(self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]) -> None:
        """Restore warehouse state from a pre-injection snapshot."""

    def expected_signal(self) -> ExpectedSignal:
        """Return the assertion Sentinel should detect."""

    def expected_blast_radius(self) -> list[str]:
        """Return entity names/urn fragments in the blast radius."""
