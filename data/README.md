# Kavach Data Platform

Retail demo warehouse: DuckDB + dbt (raw → staging → marts) with DataHub ingestion recipes.

## Quickstart

```bash
# Generate seed CSVs (deterministic, seed=42)
python data/generate_seeds.py

# Build warehouse + run dbt
cd backend && uv run python ../data/pipeline.py build

# Seed query-history fixtures (or live DataHub when DATAHUB_GMS_URL is set)
python data/ingestion/queries_seed.py
```

## Layout

| Path | Purpose |
|------|---------|
| `seeds/` | Deterministic CSV seeds for raw tables |
| `demo_pipeline_seed/` | dbt project (pushed to `kavach-demo-pipeline` in H06) |
| `pipeline.py` | Loads seeds → DuckDB, runs `dbt build` |
| `ingestion/` | DataHub ingestion recipes (dbt + DuckDB) |
| `fixtures/` | Recorded metadata for offline/CI |

## Marts

- `mart_daily_revenue` — daily revenue rollup
- `mart_supplier_reliability` — supplier ops metrics
- `mart_demand_features` — ML feature mart (consumed by H02)

## DataHub ingestion

Set `DATAHUB_GMS_URL` and `DATAHUB_TOKEN` to push live metadata. Without them, fixtures
under `fixtures/` power offline demos and tests.
