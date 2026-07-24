#!/usr/bin/env python3
"""Seed representative query-history entries for DataHub or offline fixtures."""

from __future__ import annotations

import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FIXTURES_DIR = ROOT / "fixtures"

SAMPLE_QUERIES = [
    {
        "query": (
            "SELECT order_date, gross_revenue FROM main_marts.mart_daily_revenue "
            "WHERE order_date >= CURRENT_DATE - INTERVAL 30 DAY"
        ),
        "dataset": "urn:li:dataset:(urn:li:dataPlatform:duckdb,main_marts.mart_daily_revenue,PROD)",
        "user": "analyst@kavach.demo",
        "frequency": "daily",
    },
    {
        "query": (
            "SELECT product_id, feature_date, lag_7_qty, rolling_28_avg, next_day_qty "
            "FROM main_marts.mart_demand_features WHERE product_id = 'PRD00001'"
        ),
        "dataset": "urn:li:dataset:(urn:li:dataPlatform:duckdb,main_marts.mart_demand_features,PROD)",
        "user": "ml-pipeline@kavach.demo",
        "frequency": "hourly",
    },
    {
        "query": (
            "SELECT supplier_id, reliability_score, total_units_sold "
            "FROM main_marts.mart_supplier_reliability ORDER BY reliability_score ASC LIMIT 10"
        ),
        "dataset": "urn:li:dataset:(urn:li:dataPlatform:duckdb,main_marts.mart_supplier_reliability,PROD)",
        "user": "ops@kavach.demo",
        "frequency": "weekly",
    },
]


def write_fixture() -> Path:
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    path = FIXTURES_DIR / "queries.json"
    path.write_text(json.dumps(SAMPLE_QUERIES, indent=2), encoding="utf-8")
    return path


def main() -> None:
    gms_url = os.environ.get("DATAHUB_GMS_URL")
    if gms_url:
        print(f"DATAHUB_GMS_URL set ({gms_url}) — live query seeding deferred to H03")
    path = write_fixture()
    print(f"Wrote query fixtures to {path}")


if __name__ == "__main__":
    main()
