"""Chaos engine — inject, heal, and track scenario state."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import structlog
from pydantic import BaseModel, Field

from app.chaos.scenarios import get_scenario, list_scenarios
from app.chaos.scenarios.base import Scenario
from app.chaos.warehouse import Warehouse
from app.errors import KavachError

logger = structlog.get_logger(__name__)


class ChaosEvent(BaseModel):
    """Recorded chaos injection event."""

    id: str = Field(default_factory=lambda: str(uuid4()))
    scenario: str
    seed: int
    injected_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    checksum_before: dict[str, str] = Field(default_factory=dict)
    checksum_after: dict[str, str] = Field(default_factory=dict)
    healed: bool = False


class ChaosStatus(BaseModel):
    """Current chaos engine state."""

    active_scenario: str | None = None
    active_seed: int | None = None
    events: list[ChaosEvent] = Field(default_factory=list)


class ChaosEngine:
    """Controlled failure injection with snapshot-based heal."""

    def __init__(self, warehouse: Warehouse | None = None) -> None:
        self._warehouse = warehouse or Warehouse()
        self._snapshots: dict[str, dict[str, list[dict[str, Any]]]] = {}
        self._events: list[ChaosEvent] = []
        self._active: tuple[str, int] | None = None

    @property
    def warehouse(self) -> Warehouse:
        """Return the bound warehouse."""
        return self._warehouse

    def _scenario(self, name: str) -> Scenario:
        return get_scenario(name)

    def inject(self, scenario: str, seed: int) -> ChaosEvent:
        """Inject a scenario fault deterministically."""
        sc = self._scenario(scenario)
        tables = list(sc.meta.affected_tables)
        raw_tables = [t for t in tables if t.startswith("raw.")]
        if not raw_tables:
            raw_tables = [t for t in tables if "raw." in t] or ["raw.orders"]

        snapshot_tables = list(
            dict.fromkeys(
                [
                    *raw_tables,
                    *[t for t in tables if t.startswith("raw.")],
                ]
            )
        )
        if scenario == "schema_drift":
            snapshot_tables = ["raw.order_items"]
        elif scenario == "null_spike" or scenario == "freshness_lag":
            snapshot_tables = ["raw.orders"]
        elif scenario == "value_corruption":
            snapshot_tables = ["raw.order_items"]

        snapshot = self._warehouse.snapshot_tables(snapshot_tables)
        checksum_before = self._warehouse.checksum_tables(snapshot_tables)

        sc.inject(self._warehouse, seed)
        checksum_after = self._warehouse.checksum_tables(snapshot_tables)

        event = ChaosEvent(
            scenario=scenario,
            seed=seed,
            checksum_before=checksum_before,
            checksum_after=checksum_after,
        )
        self._snapshots[scenario] = snapshot
        self._events.append(event)
        self._active = (scenario, seed)
        logger.info(
            "chaos.injected",
            scenario=scenario,
            seed=seed,
            event_id=event.id,
        )
        return event

    def heal(self, scenario: str) -> ChaosEvent:
        """Revert a prior injection using the stored snapshot."""
        if scenario not in self._snapshots:
            raise KavachError(f"No snapshot for scenario: {scenario}")
        sc = self._scenario(scenario)
        snapshot = self._snapshots[scenario]
        tables = list(snapshot.keys())
        checksum_before = self._warehouse.checksum_tables(tables)

        sc.heal(self._warehouse, snapshot)
        checksum_after = self._warehouse.checksum_tables(tables)

        event = ChaosEvent(
            scenario=scenario,
            seed=self._active[1] if self._active and self._active[0] == scenario else 0,
            checksum_before=checksum_before,
            checksum_after=checksum_after,
            healed=True,
        )
        stored = next((e for e in reversed(self._events) if e.scenario == scenario), None)
        if stored and stored.checksum_before:
            for table, expected in stored.checksum_before.items():
                if table in checksum_after and checksum_after[table] != expected:
                    logger.warning(
                        "chaos.heal_checksum_mismatch",
                        table=table,
                        expected=expected,
                        actual=checksum_after[table],
                    )

        if self._active and self._active[0] == scenario:
            self._active = None
        self._events.append(event)
        logger.info("chaos.healed", scenario=scenario)
        return event

    def status(self) -> ChaosStatus:
        """Return engine status."""
        active_scenario = self._active[0] if self._active else None
        active_seed = self._active[1] if self._active else None
        return ChaosStatus(
            active_scenario=active_scenario,
            active_seed=active_seed,
            events=list(self._events),
        )

    def list_scenario_names(self) -> list[str]:
        """Return registered scenario ids."""
        return list_scenarios()

    def build_trigger(self, scenario: str, seed: int) -> dict[str, Any]:
        """Build an agent trigger payload for a chaos injection."""
        sc = self._scenario(scenario)
        signal = sc.expected_signal()
        return {
            "type": "chaos",
            "scenario": scenario,
            "seed": seed,
            "summary": sc.meta.summary,
            "root_cause": sc.meta.root_cause,
            "expected_signal": {
                "assertion_type": signal.assertion_type.value,
                "description": signal.description,
                "dataset": signal.dataset,
            },
            "blast_radius_entities": sc.expected_blast_radius(),
        }
