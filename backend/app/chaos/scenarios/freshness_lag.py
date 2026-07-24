"""Freshness lag scenario — stale orders feed."""

from __future__ import annotations

from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


class FreshnessLagScenario:
    """Lag the orders feed so mart_daily_revenue goes stale."""

    meta = ScenarioMeta(
        name="freshness_lag",
        root_cause="Orders feed stopped updating; mart_daily_revenue freshness exceeded SLA",
        summary="mart_daily_revenue freshness lag detected on orders feed",
        affected_tables=("raw.orders", "main_marts.mart_daily_revenue"),
        blast_radius_entities=("main_marts.mart_daily_revenue", "Revenue Ops Dashboard"),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        del seed
        warehouse.execute(
            """
            DELETE FROM raw.orders
            WHERE cast(order_date as date) >= (
                SELECT max(cast(order_date as date)) - INTERVAL '7 days'
                FROM raw.orders
            )
            """
        )
        warehouse.rebuild_marts()

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        warehouse.restore_snapshot_simple({"raw.orders": snapshot["raw.orders"]})
        warehouse.rebuild_marts()

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.FRESHNESS,
            description="mart_daily_revenue last updated > 24h ago",
            dataset="main_marts.mart_daily_revenue",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
