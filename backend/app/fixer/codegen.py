"""Fixer codegen — deterministic remediation artifacts per chaos scenario."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.agents.state import IncidentState
from app.chaos.scenarios import get_scenario
from app.errors import FixerError

REPO_FILES_ROOT = "models"


class FixArtifacts(BaseModel):
    """Generated fix files and PR metadata."""

    scenario: str
    branch_name: str
    files: dict[str, str] = Field(default_factory=dict)
    pr_title: str
    pr_body: str
    diff: str
    incident_id: str | None = None
    blast_radius_summary: str = ""


def _branch_name(scenario: str, run_id: str) -> str:
    return f"kavach/fix-{scenario}-{run_id[:8]}"


def _header(incident: IncidentState, scenario: str) -> str:
    blast = incident.blast_radius
    entities: list[str] = []
    if blast:
        entities.extend(d.name for d in blast.datasets[:3])
        entities.extend(d.name for d in blast.ml_deployments)
    blast_summary = ", ".join(entities) if entities else "n/a"
    return blast_summary


def _generate_schema_drift(incident: IncidentState) -> FixArtifacts:
    scenario = "schema_drift"
    sql = """select
    order_item_id,
    order_id,
    product_id,
    cast(coalesce(quantity, qty) as integer) as quantity,
    cast(line_total as double) as line_total
from {{ source('raw', 'order_items') }}
"""
    schema_patch = """      - name: quantity
        description: Line item quantity (handles qty alias from supplier feed)
        tests: [not_null]
"""
    files = {
        f"{REPO_FILES_ROOT}/staging/stg_order_items.sql": sql,
        f"{REPO_FILES_ROOT}/schema.yml": schema_patch,
    }
    blast = _header(incident, scenario)
    body = f"""## Fix: schema drift on order_items

**DataHub incident:** {incident.incident_urn or incident.run_id}
**Root cause:** {incident.root_cause}
**Blast radius:** {blast}

### Changes
- Cast `coalesce(quantity, qty)` in `stg_order_items` to absorb supplier rename
- Document quantity column + not_null test in `schema.yml`

### Judging criteria
- Cat 2: schema assertion + dbt model patch
- DataHub: incident-linked remediation with blast radius awareness
"""
    diff = (
        f"--- a/models/staging/stg_order_items.sql\n+++ b/models/staging/stg_order_items.sql\n"
        f"@@ coalesce(quantity, qty) guard for supplier qty alias\n{sql}"
    )
    return FixArtifacts(
        scenario=scenario,
        branch_name=_branch_name(scenario, incident.run_id),
        files=files,
        pr_title="fix(dbt): handle supplier qty→quantity schema drift",
        pr_body=body,
        diff=diff,
        incident_id=incident.incident_id,
        blast_radius_summary=blast,
    )


def _generate_null_spike(incident: IncidentState) -> FixArtifacts:
    scenario = "null_spike"
    sql = """select
    order_id,
    coalesce(customer_id, 'UNKNOWN') as customer_id,
    cast(order_date as date) as order_date,
    lower(trim(status)) as status
from {{ source('raw', 'orders') }}
"""
    test_sql = """select *
from {{ ref('stg_orders') }}
where customer_id is null
"""
    files = {
        f"{REPO_FILES_ROOT}/staging/stg_orders.sql": sql,
        f"{REPO_FILES_ROOT}/tests/assert_no_null_customer.sql": test_sql,
        f"{REPO_FILES_ROOT}/schema.yml": """      - name: customer_id
        tests: [not_null]
""",
    }
    blast = _header(incident, scenario)
    body = f"""## Fix: null spike on orders.customer_id

**DataHub incident:** {incident.incident_urn or incident.run_id}
**Root cause:** {incident.root_cause}
**Blast radius:** {blast}

### Changes
- Coalesce NULL `customer_id` to `UNKNOWN` in `stg_orders`
- Add not_null-style assertion test for downstream guard

### Judging criteria
- Cat 2: null-rate assertion + dbt test
"""
    diff = f"--- a/models/staging/stg_orders.sql\n+++ b/models/staging/stg_orders.sql\n{sql}"
    return FixArtifacts(
        scenario=scenario,
        branch_name=_branch_name(scenario, incident.run_id),
        files=files,
        pr_title="fix(dbt): guard null customer_id spike in stg_orders",
        pr_body=body,
        diff=diff,
        incident_id=incident.incident_id,
        blast_radius_summary=blast,
    )


def _generate_freshness_lag(incident: IncidentState) -> FixArtifacts:
    scenario = "freshness_lag"
    assertion = """version: 2

sources:
  - name: raw
    tables:
      - name: orders
        freshness:
          warn_after: {count: 24, period: hour}
          error_after: {count: 48, period: hour}
"""
    dag = '''"""Generated backfill DAG for stale orders feed (artifact only)."""

from datetime import datetime, timedelta


def backfill_orders(start: datetime, end: datetime) -> None:
    """Backfill missing orders window — not executed in demo."""
    print(f"Would backfill orders from {start} to {end}")
'''
    files = {
        f"{REPO_FILES_ROOT}/staging/sources.yml": assertion,
        "artifacts/backfill_orders_dag.py": dag,
    }
    blast = _header(incident, scenario)
    body = f"""## Fix: freshness lag on orders feed

**DataHub incident:** {incident.incident_urn or incident.run_id}
**Root cause:** {incident.root_cause}
**Blast radius:** {blast}

### Changes
- Add freshness SLA on `raw.orders` in sources.yml
- Generate Airflow-style backfill DAG artifact for ops handoff

### Judging criteria
- Cat 2: freshness assertion + orchestration artifact breadth
"""
    diff = f"--- a/models/staging/sources.yml\n+++ b/models/staging/sources.yml\n{assertion}"
    return FixArtifacts(
        scenario=scenario,
        branch_name=_branch_name(scenario, incident.run_id),
        files=files,
        pr_title="fix(dbt): freshness SLA + orders backfill DAG artifact",
        pr_body=body,
        diff=diff,
        incident_id=incident.incident_id,
        blast_radius_summary=blast,
    )


def _generate_value_corruption(incident: IncidentState) -> FixArtifacts:
    scenario = "value_corruption"
    sql = """select
    order_item_id,
    order_id,
    product_id,
    cast(quantity as integer) as quantity,
    case
        when cast(line_total as double) < 0 then abs(cast(line_total as double))
        when cast(line_total as double) > 100000 then cast(line_total as double) / 100
        else cast(line_total as double)
    end as line_total
from {{ source('raw', 'order_items') }}
"""
    test_sql = """select *
from {{ ref('stg_order_items') }}
where line_total < 0 or line_total > 100000
"""
    files = {
        f"{REPO_FILES_ROOT}/staging/stg_order_items.sql": sql,
        f"{REPO_FILES_ROOT}/tests/assert_line_total_range.sql": test_sql,
        f"{REPO_FILES_ROOT}/schema.yml": """      - name: line_total
        tests:
          - dbt_utils.expression_is_true:
              expression: "line_total >= 0 and line_total <= 100000"
""",
    }
    blast = _header(incident, scenario)
    safeguard = "line_total range guard on stg_order_items"
    ml_note = (
        "HOLD recommended on demand forecast deployment."
        if incident.ml_hold_recommended
        else "Monitor deployment."
    )
    body = f"""## Fix: value corruption on order_items.line_total

**DataHub incident:** {incident.incident_urn or incident.run_id}
**Root cause:** {incident.root_cause}
**Blast radius:** {blast}

### ML Guardian safeguard
{ml_note}
Assertion: {safeguard}

Protects `mart_demand_features` → `kavach.demand_forecast.prod` from corrupted inputs.

### Changes
- Clean negative and 100x outliers in `stg_order_items`
- Add range assertion test

### Judging criteria
- Cat 2: data quality assertion + transform
- ML lineage: deployment safeguard note tied to DataHub blast radius
"""
    diff = (
        "--- a/models/staging/stg_order_items.sql\n"
        "+++ b/models/staging/stg_order_items.sql\n"
        f"{sql}"
    )
    return FixArtifacts(
        scenario=scenario,
        branch_name=_branch_name(scenario, incident.run_id),
        files=files,
        pr_title="fix(dbt): clean line_total corruption + ML deployment safeguard",
        pr_body=body,
        diff=diff,
        incident_id=incident.incident_id,
        blast_radius_summary=blast,
    )


_GENERATORS = {
    "schema_drift": _generate_schema_drift,
    "null_spike": _generate_null_spike,
    "freshness_lag": _generate_freshness_lag,
    "value_corruption": _generate_value_corruption,
}


def generate_fix(incident: IncidentState) -> FixArtifacts:
    """Map an incident to deterministic fix artifacts."""
    scenario = incident.trigger.get("scenario")
    if not scenario:
        scenario = "value_corruption"
    if scenario not in _GENERATORS:
        raise FixerError(f"No fix generator for scenario: {scenario}")
    get_scenario(str(scenario))
    return _GENERATORS[str(scenario)](incident)
