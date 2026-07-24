"""Null spike scenario — burst of NULL customer_id values."""

from __future__ import annotations

import random
from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


class NullSpikeScenario:
    """Inject NULLs into orders.customer_id."""

    meta = ScenarioMeta(
        name="null_spike",
        root_cause="Upstream orders feed injected NULL customer_id values",
        summary="Null rate spike on orders.customer_id propagating to revenue mart",
        affected_tables=("raw.orders", "main_marts.mart_daily_revenue"),
        blast_radius_entities=("raw.orders", "main_marts.mart_daily_revenue"),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        rng = random.Random(seed)
        conn = warehouse.connect()
        try:
            rows = conn.execute("SELECT order_id FROM raw.orders").fetchall()
            order_ids = [row[0] for row in rows]
            rng.shuffle(order_ids)
            target_count = max(1, len(order_ids) // 10)
            targets = order_ids[:target_count]
            for order_id in targets:
                conn.execute(
                    "UPDATE raw.orders SET customer_id = NULL WHERE order_id = ?",
                    [order_id],
                )
        finally:
            conn.close()
        warehouse.rebuild_marts()

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        warehouse.restore_snapshot_simple({"raw.orders": snapshot["raw.orders"]})
        warehouse.rebuild_marts()

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.CUSTOM,
            description="orders.customer_id null rate > 5%",
            dataset="raw.orders",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
