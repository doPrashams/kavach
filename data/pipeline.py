#!/usr/bin/env python3
"""Build the Kavach retail DuckDB warehouse and run dbt."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent
SEEDS_DIR = ROOT / "seeds"
DBT_PROJECT = ROOT / "demo_pipeline_seed"
WAREHOUSE_PATH = ROOT / "warehouse.duckdb"

RAW_TABLES = ("orders", "order_items", "products", "suppliers", "customers")
MART_TABLES = (
    "mart_daily_revenue",
    "mart_supplier_reliability",
    "mart_demand_features",
)


def load_seeds(conn: duckdb.DuckDBPyConnection) -> None:
    """Load seed CSVs into the raw schema."""
    conn.execute("CREATE SCHEMA IF NOT EXISTS raw")
    for table in RAW_TABLES:
        csv_path = SEEDS_DIR / f"{table}.csv"
        if not csv_path.exists():
            raise FileNotFoundError(f"Missing seed file: {csv_path}")
        conn.execute(f"DROP TABLE IF EXISTS raw.{table}")
        conn.execute(
            f"""
            CREATE TABLE raw.{table} AS
            SELECT * FROM read_csv_auto('{csv_path.as_posix()}', header=true)
            """
        )


def run_dbt(target: str = "dev") -> None:
    """Run dbt build against the demo pipeline project."""
    env = os.environ.copy()
    env["KAVACH_WAREHOUSE_PATH"] = str(WAREHOUSE_PATH.resolve())
    profiles_dir = DBT_PROJECT
    dbt_bin = shutil.which("dbt") or "dbt"
    result = subprocess.run(
        [
            dbt_bin,
            "build",
            "--project-dir",
            str(DBT_PROJECT),
            "--profiles-dir",
            str(profiles_dir),
            "--target",
            target,
        ],
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
        raise RuntimeError("dbt build failed")


def assert_marts(conn: duckdb.DuckDBPyConnection) -> dict[str, int]:
    """Verify mart tables exist and return row counts."""
    counts: dict[str, int] = {}
    for mart in MART_TABLES:
        row = conn.execute(
            f"SELECT COUNT(*) FROM main_marts.{mart}"
        ).fetchone()
        if row is None:
            raise RuntimeError(f"Mart {mart} missing")
        counts[mart] = int(row[0])
        if counts[mart] == 0:
            raise RuntimeError(f"Mart {mart} is empty")
    return counts


def build(target: str = "dev", *, clean: bool = False) -> dict[str, int]:
    """Load seeds, run dbt, and validate marts. Idempotent."""
    if clean and WAREHOUSE_PATH.exists():
        WAREHOUSE_PATH.unlink()

    SEEDS_DIR.mkdir(parents=True, exist_ok=True)
    conn = duckdb.connect(str(WAREHOUSE_PATH))
    try:
        load_seeds(conn)
    finally:
        conn.close()

    run_dbt(target=target)

    conn = duckdb.connect(str(WAREHOUSE_PATH))
    try:
        return assert_marts(conn)
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Kavach data pipeline runner")
    sub = parser.add_subparsers(dest="command", required=True)
    build_parser = sub.add_parser("build", help="Build warehouse and run dbt")
    build_parser.add_argument("--target", default="dev", choices=["dev"])
    build_parser.add_argument("--clean", action="store_true")
    args = parser.parse_args()

    if args.command == "build":
        counts = build(target=args.target, clean=args.clean)
        print("Pipeline build complete:", counts)


if __name__ == "__main__":
    main()
