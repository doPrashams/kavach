"""Feature specification for the demand forecast model — single source of truth."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

FeatureDtype = Literal["categorical", "integer", "float"]


@dataclass(frozen=True)
class FeatureSpec:
    """One input feature column."""

    name: str
    dtype: FeatureDtype
    source_column: str
    description: str


@dataclass(frozen=True)
class TargetSpec:
    """Model target column."""

    name: str
    source_column: str
    description: str


MART_TABLE = "main_marts.mart_demand_features"
MODEL_NAME = "kavach.demand_forecast"
DEPLOYMENT_NAME = "prod"

FEATURES: tuple[FeatureSpec, ...] = (
    FeatureSpec(
        name="product_id",
        dtype="categorical",
        source_column="product_id",
        description="Product identifier from mart_demand_features",
    ),
    FeatureSpec(
        name="dow",
        dtype="integer",
        source_column="dow",
        description="Day of week (0=Monday)",
    ),
    FeatureSpec(
        name="lag_7_qty",
        dtype="integer",
        source_column="lag_7_qty",
        description="Quantity sold 7 days prior",
    ),
    FeatureSpec(
        name="rolling_28_avg",
        dtype="float",
        source_column="rolling_28_avg",
        description="28-day rolling average quantity",
    ),
    FeatureSpec(
        name="supplier_reliability",
        dtype="float",
        source_column="supplier_reliability",
        description="Upstream supplier reliability score",
    ),
)

TARGET = TargetSpec(
    name="next_day_qty",
    source_column="next_day_qty",
    description="Quantity sold on the following day",
)

FEATURE_COLUMNS: tuple[str, ...] = tuple(f.name for f in FEATURES)
MART_COLUMNS: tuple[str, ...] = FEATURE_COLUMNS + (TARGET.name,)


def validate_mart_columns(columns: list[str]) -> None:
    """Raise if the mart is missing required columns."""
    missing = [c for c in MART_COLUMNS if c not in columns]
    if missing:
        raise ValueError(f"mart_demand_features missing columns: {missing}")
