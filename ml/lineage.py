#!/usr/bin/env python3
"""Emit DataHub ML lineage for the demand-forecast model."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from features import DEPLOYMENT_NAME, FEATURES, MART_TABLE, MODEL_NAME, TARGET

FIXTURE_PATH = ROOT / "fixtures" / "ml_lineage.json"

DATASET_URN = "urn:li:dataset:(urn:li:dataPlatform:duckdb,main_marts.mart_demand_features,PROD)"
MODEL_URN = f"urn:li:mlModel:(urn:li:dataPlatform:mlflow,{MODEL_NAME},PROD)"
DEPLOYMENT_URN = (
    f"urn:li:mlModelDeployment:(urn:li:dataPlatform:mlflow,{MODEL_NAME}.{DEPLOYMENT_NAME},PROD)"
)


def build_lineage_payload() -> dict[str, Any]:
    """Build ML lineage payload with feature→model→deployment chain."""
    ml_features = []
    for feature in FEATURES:
        feature_urn = (
            f"urn:li:mlFeature:(urn:li:dataPlatform:duckdb,"
            f"main_marts.mart_demand_features.{feature.source_column},PROD)"
        )
        ml_features.append(
            {
                "entityType": "mlFeature",
                "urn": feature_urn,
                "name": feature.name,
                "description": feature.description,
                "featureNamespace": "kavach",
                "dataType": feature.dtype,
                "upstream": [
                    {
                        "dataset": DATASET_URN,
                        "column": feature.source_column,
                    }
                ],
            }
        )

    target_urn = (
        f"urn:li:mlFeature:(urn:li:dataPlatform:duckdb,"
        f"main_marts.mart_demand_features.{TARGET.source_column},PROD)"
    )
    ml_features.append(
        {
            "entityType": "mlFeature",
            "urn": target_urn,
            "name": TARGET.name,
            "description": TARGET.description,
            "featureNamespace": "kavach",
            "dataType": "integer",
            "upstream": [{"dataset": DATASET_URN, "column": TARGET.source_column}],
        }
    )

    ml_model = {
        "entityType": "mlModel",
        "urn": MODEL_URN,
        "name": MODEL_NAME,
        "description": "Demand forecast model trained on mart_demand_features",
        "trainingData": DATASET_URN,
        "inputFeatures": [f["urn"] for f in ml_features if f["name"] != TARGET.name],
        "downstream": [DEPLOYMENT_URN],
    }

    ml_deployment = {
        "entityType": "mlModelDeployment",
        "urn": DEPLOYMENT_URN,
        "name": DEPLOYMENT_NAME,
        "description": "Production deployment of demand forecast model",
        "model": MODEL_URN,
        "environment": "prod",
    }

    edges = []
    for feature in ml_features:
        if feature["name"] != TARGET.name:
            edges.append(
                {
                    "upstream": feature["urn"],
                    "downstream": MODEL_URN,
                    "type": "mlFeatureToModel",
                }
            )
    edges.append({"upstream": MODEL_URN, "downstream": DEPLOYMENT_URN, "type": "mlModelToDeployment"})
    edges.append({"upstream": DATASET_URN, "downstream": MODEL_URN, "type": "datasetToMlModel"})

    return {
        "dataset": {
            "urn": DATASET_URN,
            "name": MART_TABLE,
        },
        "mlFeature": ml_features,
        "mlModel": ml_model,
        "mlModelDeployment": ml_deployment,
        "edges": edges,
    }


def emit_lineage() -> Path:
    """Emit lineage to DataHub or write offline fixture."""
    payload = build_lineage_payload()
    gms_url = os.environ.get("DATAHUB_GMS_URL")
    if gms_url:
        print(f"DATAHUB_GMS_URL set ({gms_url}) — live ML registration deferred to H03")
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return FIXTURE_PATH


def main() -> None:
    path = emit_lineage()
    print(f"Wrote ML lineage to {path}")


if __name__ == "__main__":
    main()
