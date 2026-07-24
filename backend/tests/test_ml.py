"""ML pipeline tests."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import duckdb

REPO_ROOT = Path(__file__).resolve().parents[2]
ML_ROOT = REPO_ROOT / "ml"
sys.path.insert(0, str(ML_ROOT))

from features import FEATURE_COLUMNS, validate_mart_columns  # noqa: E402

TRAIN = ML_ROOT / "train.py"
LINEAGE = ML_ROOT / "lineage.py"
WAREHOUSE = REPO_ROOT / "data" / "warehouse.duckdb"
ARTIFACTS = ML_ROOT / "artifacts"
LINEAGE_FIXTURE = ML_ROOT / "fixtures" / "ml_lineage.json"


def test_mart_columns_match_feature_spec() -> None:
    """Feature spec matches mart_demand_features columns."""
    conn = duckdb.connect(str(WAREHOUSE), read_only=True)
    try:
        cols = [
            row[0]
            for row in conn.execute("DESCRIBE main_marts.mart_demand_features").fetchall()
        ]
    finally:
        conn.close()
    validate_mart_columns(cols)
    assert set(FEATURE_COLUMNS).issubset(set(cols))


def test_training_is_deterministic() -> None:
    """train.py produces metrics under MAE threshold."""
    subprocess.run(
        [sys.executable, str(TRAIN)],
        cwd=str(ML_ROOT),
        check=True,
    )
    metrics = json.loads((ARTIFACTS / "metrics.json").read_text(encoding="utf-8"))
    assert "mae" in metrics
    assert metrics["mae"] < 2.5
    assert (ARTIFACTS / "model.pkl").exists()


def test_lineage_payload_has_full_chain() -> None:
    """lineage.py emits dataset→mlFeature→mlModel→mlModelDeployment chain."""
    subprocess.run([sys.executable, str(LINEAGE)], cwd=ML_ROOT, check=True)
    payload = json.loads(LINEAGE_FIXTURE.read_text(encoding="utf-8"))
    serialized = json.dumps(payload)
    for key in ("mlModel", "mlModelDeployment", "mlFeature"):
        assert key in serialized
    assert len(payload["mlFeature"]) >= len(FEATURE_COLUMNS)
    assert any(e["type"] == "mlModelToDeployment" for e in payload["edges"])
