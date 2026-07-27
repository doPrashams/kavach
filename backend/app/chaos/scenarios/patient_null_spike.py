"""Patient null spike scenario — burst of NULL medication_code values."""

from __future__ import annotations

import random
from typing import Any

from app.chaos.scenarios.base import ExpectedSignal, ScenarioMeta
from app.chaos.warehouse import Warehouse
from app.datahub.models import AssertionType


class PatientNullSpikeScenario:
    """Inject NULLs into patients.medication_code."""

    meta = ScenarioMeta(
        name="patient_null_spike",
        root_cause=(
            "Upstream EHR feed injected NULL medication_code values into raw.patients"
        ),
        summary="Null rate spike on patients.medication_code propagating to adherence mart",
        affected_tables=("raw.patients", "main_marts.mart_medication_adherence"),
        blast_radius_entities=(
            "raw.patients",
            "main_staging.stg_patients",
            "main_marts.mart_medication_adherence",
        ),
    )

    def inject(self, warehouse: Warehouse, seed: int) -> None:
        # Healthcare warehouse seed lands in H25; no-op until tables exist.
        if not warehouse.table_exists("raw.patients"):
            return
        rng = random.Random(seed)
        conn = warehouse.connect()
        try:
            cols = {row[0] for row in conn.execute("DESCRIBE raw.patients").fetchall()}
            if "medication_code" not in cols:
                return
            id_col = next(
                (c for c in ("patient_id", "id", "mrn") if c in cols),
                None,
            )
            if id_col is None:
                return
            rows = conn.execute(f"SELECT {id_col} FROM raw.patients").fetchall()
            ids = [row[0] for row in rows]
            rng.shuffle(ids)
            target_count = max(1, len(ids) // 10)
            targets = ids[:target_count]
            for patient_id in targets:
                conn.execute(
                    f"UPDATE raw.patients SET medication_code = NULL WHERE {id_col} = ?",
                    [patient_id],
                )
        finally:
            conn.close()
        try:
            warehouse.rebuild_marts()
        except Exception:
            pass

    def heal(
        self, warehouse: Warehouse, snapshot: dict[str, list[dict[str, Any]]]
    ) -> None:
        if "raw.patients" in snapshot:
            warehouse.restore_snapshot_simple({"raw.patients": snapshot["raw.patients"]})
        try:
            warehouse.rebuild_marts()
        except Exception:
            pass

    def expected_signal(self) -> ExpectedSignal:
        return ExpectedSignal(
            assertion_type=AssertionType.CUSTOM,
            description="patients.medication_code null rate > 5%",
            dataset="raw.patients",
        )

    def expected_blast_radius(self) -> list[str]:
        return list(self.meta.blast_radius_entities)
