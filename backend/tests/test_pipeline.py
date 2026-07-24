"""Data platform pipeline tests."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import duckdb
import pytest

from app.datahub import fixtures

ROOT = Path(__file__).resolve().parents[2]
DATA_ROOT = ROOT / "data"
PIPELINE = DATA_ROOT / "pipeline.py"
WAREHOUSE = DATA_ROOT / "warehouse.duckdb"

EXPECTED_MARTS = (
    "mart_daily_revenue",
    "mart_supplier_reliability",
    "mart_demand_features",
)


@pytest.fixture(scope="module")
def warehouse_counts() -> dict[str, int]:
    """Build the pipeline once per module and return mart row counts."""
    result = subprocess.run(
        [sys.executable, str(PIPELINE), "build"],
        cwd=DATA_ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0
    conn = duckdb.connect(str(WAREHOUSE), read_only=True)
    try:
        counts: dict[str, int] = {}
        for mart in EXPECTED_MARTS:
            row = conn.execute(f"SELECT COUNT(*) FROM main_marts.{mart}").fetchone()
            assert row is not None
            counts[mart] = int(row[0])
        return counts
    finally:
        conn.close()


def test_pipeline_builds_all_marts(warehouse_counts: dict[str, int]) -> None:
    """All mart tables exist with rows after build."""
    for mart in EXPECTED_MARTS:
        assert mart in warehouse_counts
        assert warehouse_counts[mart] > 0


def test_pipeline_is_deterministic(warehouse_counts: dict[str, int]) -> None:
    """Re-running build yields identical mart row counts."""
    before = dict(warehouse_counts)
    subprocess.run([sys.executable, str(PIPELINE), "build"], cwd=DATA_ROOT, check=True)
    conn = duckdb.connect(str(WAREHOUSE), read_only=True)
    try:
        for mart in EXPECTED_MARTS:
            row = conn.execute(f"SELECT COUNT(*) FROM main_marts.{mart}").fetchone()
            assert row is not None
            assert int(row[0]) == before[mart]
    finally:
        conn.close()


def test_fixtures_load() -> None:
    """Offline fixtures are present and parseable."""
    queries = fixtures.load_queries()
    schemas = fixtures.load_schemas()
    lineage = fixtures.load_lineage()
    assert len(queries) >= 3
    assert len(schemas) >= 1
    assert len(lineage) >= 1
    json.dumps({"queries": queries, "schemas": schemas, "lineage": lineage})
