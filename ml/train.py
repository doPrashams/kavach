#!/usr/bin/env python3
"""Train the Kavach demand-forecast model on mart_demand_features."""

from __future__ import annotations

import json
import pickle
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import duckdb
import mlflow
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

from features import FEATURE_COLUMNS, FEATURES, MART_TABLE, MODEL_NAME, TARGET, validate_mart_columns

ROOT = Path(__file__).resolve().parent
REPO_ROOT = ROOT.parent
WAREHOUSE_PATH = REPO_ROOT / "data" / "warehouse.duckdb"
FIXTURE_PATH = REPO_ROOT / "data" / "fixtures" / "mart_demand_features_sample.json"
ARTIFACTS_DIR = ROOT / "artifacts"
RANDOM_STATE = 42
MAE_THRESHOLD = 2.5


def load_mart() -> pd.DataFrame:
    """Load mart_demand_features from DuckDB or offline fixture."""
    if WAREHOUSE_PATH.exists():
        conn = duckdb.connect(str(WAREHOUSE_PATH), read_only=True)
        try:
            df = conn.execute(f"SELECT * FROM {MART_TABLE} ORDER BY feature_date, product_id").df()
        finally:
            conn.close()
    elif FIXTURE_PATH.exists():
        df = pd.read_json(FIXTURE_PATH)
    else:
        raise FileNotFoundError("No warehouse or fixture available for training")
    validate_mart_columns(list(df.columns))
    return df


def time_based_split(df: pd.DataFrame, test_ratio: float = 0.2) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split by feature_date so the test set is the most recent dates."""
    dates = sorted(df["feature_date"].unique())
    split_idx = max(1, int(len(dates) * (1 - test_ratio)))
    cutoff = dates[split_idx - 1]
    train = df[df["feature_date"] <= cutoff].copy()
    test = df[df["feature_date"] > cutoff].copy()
    if test.empty:
        test = train.tail(max(1, len(train) // 5))
        train = train.iloc[: -len(test)]
    return train, test


def build_pipeline() -> Pipeline:
    """Build sklearn pipeline with categorical encoding."""
    cat_cols = [f.name for f in FEATURES if f.dtype == "categorical"]
    num_cols = [f.name for f in FEATURES if f.dtype != "categorical"]
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols),
            ("num", "passthrough", num_cols),
        ]
    )
    model = HistGradientBoostingRegressor(random_state=RANDOM_STATE, max_iter=100)
    return Pipeline([("preprocess", preprocessor), ("model", model)])


def mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean absolute percentage error (safe for zero targets)."""
    denom = np.maximum(np.abs(y_true), 1.0)
    return float(np.mean(np.abs((y_true - y_pred) / denom)) * 100)


def train() -> dict[str, float]:
    """Train model, log to MLflow, and save artifacts."""
    df = load_mart()
    train_df, test_df = time_based_split(df)

    x_train = train_df[list(FEATURE_COLUMNS)]
    y_train = train_df[TARGET.name]
    x_test = test_df[list(FEATURE_COLUMNS)]
    y_test = test_df[TARGET.name]

    pipeline = build_pipeline()
    pipeline.fit(x_train, y_train)
    predictions = pipeline.predict(x_test)

    metrics = {
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, predictions))),
        "mape": mape(y_test.to_numpy(), predictions),
        "train_rows": float(len(train_df)),
        "test_rows": float(len(test_df)),
    }

    if metrics["mae"] >= MAE_THRESHOLD:
        raise RuntimeError(f"MAE {metrics['mae']:.4f} exceeds threshold {MAE_THRESHOLD}")

    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    with (ARTIFACTS_DIR / "model.pkl").open("wb") as fh:
        pickle.dump(pipeline, fh)
    (ARTIFACTS_DIR / "metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

    mlflow.set_experiment("kavach-demand-forecast")
    with mlflow.start_run(run_name=MODEL_NAME):
        mlflow.log_params({"model": "HistGradientBoostingRegressor", "random_state": RANDOM_STATE})
        mlflow.log_metrics({k: v for k, v in metrics.items() if k in ("mae", "rmse", "mape")})
        mlflow.sklearn.log_model(pipeline, artifact_path="model")

    return metrics


def main() -> None:
    metrics = train()
    print("Training complete:", metrics)


if __name__ == "__main__":
    main()
