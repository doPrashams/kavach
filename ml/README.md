# Kavach ML Pipeline

Demand-forecast model trained on `mart_demand_features` with full DataHub ML lineage.

## Train

```bash
# Ensure data platform is built (H01)
cd backend && uv run python ../data/pipeline.py build

# Train + log to MLflow
cd backend && uv run python ../ml/train.py

# Register ML lineage (fixture or live DataHub)
uv run python ../ml/lineage.py
```

## Feature → Model → Deployment map

| Layer | Entity | URN |
|-------|--------|-----|
| Dataset | `main_marts.mart_demand_features` | `urn:li:dataset:...mart_demand_features,PROD` |
| Features | `product_id`, `dow`, `lag_7_qty`, `rolling_28_avg`, `supplier_reliability` | `urn:li:mlFeature:...` (column-level upstream) |
| Model | `kavach.demand_forecast` | `urn:li:mlModel:(mlflow,kavach.demand_forecast,PROD)` |
| Deployment | `prod` | `urn:li:mlModelDeployment:(mlflow,kavach.demand_forecast.prod,PROD)` |

## Artifacts

- `artifacts/model.pkl` — trained sklearn pipeline
- `artifacts/metrics.json` — MAE, RMSE, MAPE (MAE must be < 2.5)
- `fixtures/ml_lineage.json` — offline lineage payload for CI/replay

## Environment

| Var | Purpose |
|-----|---------|
| `MLFLOW_TRACKING_URI` | Remote MLflow (default: local `mlruns/`) |
| `DATAHUB_GMS_URL` | Live ML entity registration (optional) |
