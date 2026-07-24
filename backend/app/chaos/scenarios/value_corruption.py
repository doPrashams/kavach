"""Value corruption scenario — corrupt line totals affecting ML features."""

from __future__ import annotations

import random
from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType

ML_DEPLOYMENT = "kavach.demand_forecast.prod"


class ValueCorruptionScenario:
    """Corrupt order_items.line_total with negative / 100x values."""

    meta = ScenarioMeta(
        name="value_corruption",
        root_cause=(
            "Corrupted order_items.line_total values (negative and 100x spikes) "
            "skewing mart_demand_features"
        ),
        summary="Value corruption on order_items.line_total threatening demand forecast model",
        affected_tables=("raw.order_items", "main_marts.mart_demand_features"),
        blast_radius_entities=(
            "main_marts.mart_demand_features",
            "kavach.demand_forecast",
            ML_DEPLOYMENT,
        ),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        rng = random.Random(seed)
        conn = warehouse.connect()
        try:
            rows = conn.execute(
                "SELECT order_item_id, line_total FROM raw.order_items"
            ).fetchall()
            for order_item_id, line_total in rows:
                roll = rng.random()
                if roll < 0.05:
                    new_val = -abs(float(line_total))
                elif roll < 0.10:
                    new_val = float(line_total) * 100
                else:
                    continue
                conn.execute(
                    "UPDATE raw.order_items SET line_total = ? WHERE order_item_id = ?",
                    [new_val, order_item_id],
                )
        finally:
            conn.close()
        warehouse.rebuild_marts()

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        warehouse.restore_snapshot_simple(
            {"raw.order_items": snapshot["raw.order_items"]}
        )
        warehouse.rebuild_marts()

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.CUSTOM,
            description="order_items.line_total contains negative or extreme outliers",
            dataset="raw.order_items",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
