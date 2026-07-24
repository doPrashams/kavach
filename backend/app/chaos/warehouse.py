"""DuckDB warehouse wrapper for chaos inject/heal cycles."""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path
from typing import Any

import duckdb

from app.errors import KavachError

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_WAREHOUSE_PATH = REPO_ROOT / "data" / "warehouse.duckdb"


class Warehouse:
    """Thin wrapper around the Kavach DuckDB warehouse."""

    def __init__(self, path: Path | None = None) -> None:
        self._path = path or DEFAULT_WAREHOUSE_PATH
        if not self._path.exists():
            raise KavachError(f"Warehouse not found: {self._path}")

    @property
    def path(self) -> Path:
        """Return the warehouse file path."""
        return self._path

    def connect(self) -> duckdb.DuckDBPyConnection:
        """Open a read/write connection."""
        return duckdb.connect(str(self._path))

    def table_exists(self, table: str) -> bool:
        """Return True when schema.table exists."""
        schema, name = table.split(".", 1)
        conn = self.connect()
        try:
            row = conn.execute(
                """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = ? AND table_name = ?
                """,
                [schema, name],
            ).fetchone()
            return row is not None and int(row[0]) > 0
        finally:
            conn.close()

    def snapshot_tables(self, tables: list[str]) -> dict[str, list[dict[str, Any]]]:
        """Capture full table contents for heal restore."""
        conn = self.connect()
        try:
            snapshots: dict[str, list[dict[str, Any]]] = {}
            for table in tables:
                snap_name = self._snapshot_table_name(table)
                conn.execute(f"DROP TABLE IF EXISTS {snap_name}")
                if not self.table_exists(table):
                    snapshots[table] = []
                    continue
                conn.execute(f"CREATE TABLE {snap_name} AS SELECT * FROM {table}")
                rows = conn.execute(f"SELECT * FROM {table}").fetchdf()
                snapshots[table] = json.loads(rows.to_json(orient="records", date_format="iso"))
            return snapshots
        finally:
            conn.close()

    def restore_snapshot_simple(self, snapshots: dict[str, list[dict[str, Any]]]) -> None:
        """Restore tables from native snapshot tables when available."""
        conn = self.connect()
        try:
            for table in snapshots:
                snap_name = self._snapshot_table_name(table)
                snap_exists = conn.execute(
                    """
                    SELECT COUNT(*)
                    FROM information_schema.tables
                    WHERE table_schema = 'main'
                      AND table_name = ?
                    """,
                    [snap_name.replace("main.", "")],
                ).fetchone()
                conn.execute(f"DROP TABLE IF EXISTS {table}")
                if snap_exists and int(snap_exists[0]) > 0:
                    conn.execute(f"CREATE TABLE {table} AS SELECT * FROM {snap_name}")
                    continue
                rows = snapshots[table]
                if rows:
                    conn.execute(
                        f"CREATE TABLE {table} AS SELECT * FROM read_json(?)",
                        [json.dumps(rows)],
                    )
        finally:
            conn.close()

    @staticmethod
    def _snapshot_table_name(table: str) -> str:
        """Return the internal snapshot table name for a warehouse table."""
        return "main._chaos_snap_" + table.replace(".", "_")

    def checksum_tables(self, tables: list[str]) -> dict[str, str]:
        """Return deterministic checksums for listed tables."""
        conn = self.connect()
        try:
            checksums: dict[str, str] = {}
            for table in tables:
                if not self.table_exists(table):
                    checksums[table] = "missing"
                    continue
                cols = conn.execute(
                    """
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = split_part(?, '.', 1)
                      AND table_name = split_part(?, '.', 2)
                    ORDER BY ordinal_position
                    """,
                    [table, table],
                ).fetchall()
                order_cols = ", ".join(f'"{col[0]}"' for col in cols)
                rows = conn.execute(f"SELECT * FROM {table} ORDER BY {order_cols}").fetchall()
                payload = json.dumps(rows, default=str)
                checksums[table] = hashlib.sha256(payload.encode()).hexdigest()
            return checksums
        finally:
            conn.close()

    def execute(self, sql: str, params: list[Any] | None = None) -> None:
        """Run a mutating SQL statement."""
        conn = self.connect()
        try:
            if params:
                conn.execute(sql, params)
            else:
                conn.execute(sql)
        finally:
            conn.close()

    def query_scalar(self, sql: str) -> Any:
        """Run a query returning a single scalar."""
        conn = self.connect()
        try:
            row = conn.execute(sql).fetchone()
            if row is None:
                return None
            return row[0]
        finally:
            conn.close()

    def run_dbt_only(self) -> None:
        """Run dbt build without reloading raw seeds."""
        import os
        import shutil

        dbt_project = REPO_ROOT / "data" / "demo_pipeline_seed"
        env = os.environ.copy()
        env["KAVACH_WAREHOUSE_PATH"] = str(self._path.resolve())
        dbt_bin = shutil.which("dbt") or "dbt"
        result = subprocess.run(
            [
                dbt_bin,
                "build",
                "--project-dir",
                str(dbt_project),
                "--profiles-dir",
                str(dbt_project),
                "--target",
                "dev",
            ],
            env=env,
            check=False,
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            raise KavachError(f"dbt build failed: {result.stderr}")

    def rebuild_marts(self) -> None:
        """Re-run dbt build to refresh downstream marts after raw mutations."""
        self.run_dbt_only()
