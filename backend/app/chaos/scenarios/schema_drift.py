"""Schema drift scenario — supplier feed column rename/type change."""

from __future__ import annotations

from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


class SchemaDriftScenario:
    """Rename quantity→qty and cast to VARCHAR, breaking stg_order_items."""

    meta = ScenarioMeta(
        name="schema_drift",
        root_cause=(
            "Supplier feed renamed quantity to qty and changed type to string, "
            "breaking stg_order_items → mart_demand_features"
        ),
        summary="Schema drift on raw.order_items.quantity breaking staging model",
        affected_tables=("raw.order_items", "main_staging.stg_order_items"),
        blast_radius_entities=("main_staging.stg_order_items", "main_marts.mart_demand_features"),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        del seed
        warehouse.execute(
            """
            CREATE OR REPLACE TABLE raw.order_items AS
            SELECT
                order_item_id,
                order_id,
                product_id,
                cast(quantity as varchar) as qty,
                line_total
            FROM raw.order_items
            """
        )
        try:
            warehouse.rebuild_marts()
        except Exception:
            pass

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        warehouse.restore_snapshot_simple(
            {"raw.order_items": snapshot["raw.order_items"]}
        )
        warehouse.rebuild_marts()

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.SCHEMA,
            description="raw.order_items missing expected column quantity (found qty)",
            dataset="raw.order_items",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
