"""Scenario registry."""

from __future__ import annotations

from app.chaos.scenarios.base import Scenario
from app.chaos.scenarios.freshness_lag import FreshnessLagScenario
from app.chaos.scenarios.null_spike import NullSpikeScenario
from app.chaos.scenarios.patient_null_spike import PatientNullSpikeScenario
from app.chaos.scenarios.phi_exposure import PhiExposureScenario
from app.chaos.scenarios.schema_drift import SchemaDriftScenario
from app.chaos.scenarios.value_corruption import ValueCorruptionScenario

SCENARIOS: dict[str, Scenario] = {
    "freshness_lag": FreshnessLagScenario(),
    "schema_drift": SchemaDriftScenario(),
    "null_spike": NullSpikeScenario(),
    "value_corruption": ValueCorruptionScenario(),
    "phi_exposure": PhiExposureScenario(),
    "patient_null_spike": PatientNullSpikeScenario(),
}


def get_scenario(name: str) -> Scenario:
    """Return a registered scenario by name."""
    if name not in SCENARIOS:
        raise KeyError(f"Unknown chaos scenario: {name}")
    return SCENARIOS[name]


def list_scenarios() -> list[str]:
    """Return registered scenario names."""
    return sorted(SCENARIOS.keys())
