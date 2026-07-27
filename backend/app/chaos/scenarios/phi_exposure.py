"""PHI exposure scenario — protected health info leaks into analytics mart."""

from __future__ import annotations

from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


class PhiExposureScenario:
    """Expose patient_ssn into mart_patient_analytics without masking."""

    meta = ScenarioMeta(
        name="phi_exposure",
        root_cause=(
            "Staging transform selected PHI columns into mart_patient_analytics "
            "without masking or glossary governance tags"
        ),
        summary="PHI column leak from raw.patients into mart_patient_analytics",
        affected_tables=("raw.patients", "main_marts.mart_patient_analytics"),
        blast_radius_entities=(
            "raw.patients",
            "main_staging.stg_patients",
            "main_marts.mart_patient_analytics",
        ),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        del seed
        # Healthcare warehouse seed lands in H25; no-op until tables exist.
        if not warehouse.table_exists("raw.patients"):
            return
        conn = warehouse.connect()
        try:
            cols = {row[0] for row in conn.execute("DESCRIBE raw.patients").fetchall()}
            if "patient_ssn" not in cols and "ssn" not in cols:
                return
            ssn_col = "patient_ssn" if "patient_ssn" in cols else "ssn"
            if warehouse.table_exists("main_marts.mart_patient_analytics"):
                mart_cols = {
                    row[0]
                    for row in conn.execute(
                        "DESCRIBE main_marts.mart_patient_analytics"
                    ).fetchall()
                }
                if ssn_col not in mart_cols:
                    conn.execute(
                        f"""
                        CREATE OR REPLACE TABLE main_marts.mart_patient_analytics AS
                        SELECT m.*, p.{ssn_col} AS patient_ssn
                        FROM main_marts.mart_patient_analytics m
                        CROSS JOIN (SELECT {ssn_col} FROM raw.patients LIMIT 1) p
                        """
                    )
            else:
                conn.execute(
                    f"""
                    CREATE OR REPLACE TABLE main_marts.mart_patient_analytics AS
                    SELECT * FROM raw.patients
                    """
                )
        finally:
            conn.close()

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        if "raw.patients" in snapshot and snapshot["raw.patients"]:
            warehouse.restore_snapshot_simple({"raw.patients": snapshot["raw.patients"]})
        if warehouse.table_exists("raw.patients"):
            try:
                warehouse.rebuild_marts()
            except Exception:
                pass

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.CUSTOM,
            description="unmasked PHI (patient_ssn) present in mart_patient_analytics",
            dataset="main_marts.mart_patient_analytics",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
