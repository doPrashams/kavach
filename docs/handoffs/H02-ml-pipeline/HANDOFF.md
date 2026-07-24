# H02 — ML pipeline + DataHub ML lineage

**Milestone:** M1 · **Depends on:** H00, H01 · **Prereqs env:** none to pass verify.

## Goal
Train a real scikit-learn demand-forecast model on the `mart_demand_features` mart from H01,
track it in MLflow, and register full end-to-end ML lineage in DataHub:
`dataset (mart_demand_features) → mlFeature(s) → mlModel → mlModelDeployment`. This deployed
model is what the **ML Guardian** agent protects when chaos corrupts upstream data — the
column-level feature lineage is what makes the blast-radius demo compelling.

## Context recap
H01 produced `mart_demand_features` in DuckDB with columns like `product_id`, `dow`,
`lag_7_qty`, `rolling_28_avg`, `supplier_reliability`, target `next_day_qty`. This handoff
consumes that mart. Keep training fast and deterministic (fixed seed) so CI can run it.

## Deliverables
- `ml/train.py` — loads `mart_demand_features` from `warehouse.duckdb` (or `data/fixtures`
  if no warehouse), does a time-based train/test split, trains a
  `sklearn.ensemble.HistGradientBoostingRegressor` (or `RandomForestRegressor`), logs params,
  metrics (MAE, RMSE, MAPE), and the model to MLflow (`mlruns/` local tracking by default,
  `MLFLOW_TRACKING_URI` if set). Saves `ml/artifacts/model.pkl` + `ml/artifacts/metrics.json`.
  Deterministic: `random_state=42`, asserts MAE below a documented threshold.
- `ml/features.py` — the feature spec (names, dtypes, source columns) as a typed structure;
  single source of truth reused by training + lineage + ML Guardian.
- `ml/lineage.py` — emits DataHub ML entities via `acryl-datahub` SDK:
  `mlModel` (`kavach.demand_forecast`), `mlModelDeployment` (`prod`), and `mlFeature`
  entities linked back to `mart_demand_features` columns (column-level upstream). If
  `DATAHUB_GMS_URL` unset, writes the MCP payloads to `ml/fixtures/ml_lineage.json` instead.
- `ml/fixtures/ml_lineage.json` — recorded lineage payload for offline/CI + replay.
- `ml/README.md` — how to train + register lineage; the feature → model → deployment map.
- `deploy/docker-compose.yml` — ensure the `mlflow` service and a shared volume are wired so
  `train.py` can log to it in the composed stack (update the H00 stub).
- Tests: `backend/tests/test_ml.py` — training runs deterministically, metrics.json has MAE
  under threshold, `features.py` spec matches the mart columns, `lineage.py` produces a
  well-formed payload (feature→model→deployment edges present).

## Step-by-step
1. Define the feature spec in `ml/features.py`.
2. Write `train.py`: pull mart (or fixture) → split → fit → evaluate → MLflow log → save
   artifacts. Fix all seeds; assert MAE threshold.
3. Write `lineage.py`: build DataHub ML entities + column-level feature lineage; emit live if
   env set else to `ml/fixtures/ml_lineage.json`.
4. Update compose so MLflow is reachable in the stack.
5. Write tests; run `verify.sh` until green; commit `H02: ML pipeline + ML lineage`.

## Definition of done
`verify.sh` exits 0: `train.py` runs deterministically and writes `model.pkl` + `metrics.json`
with MAE under threshold; `ml_lineage.json` (or live registration) contains a valid
`dataset → mlFeature → mlModel → mlModelDeployment` chain; feature spec matches mart columns;
pytest green. Live DataHub registration exercised only when env set (else skipped).
