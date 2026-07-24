/** Per-scenario demo data — client- and server-safe (no server-only imports). */
import type {
  AgentEvent,
  BlastRadius,
  ChaosScenario,
  FixResponse,
  MttrPoint,
  RunState,
} from "@/lib/types";

const DEMO_REPO_PULLS = "https://github.com/doPrashams/kavach-demo-pipeline/pulls";
const REAL_PR = "https://github.com/doPrashams/kavach-demo-pipeline/pull/1";

export interface ScenarioSpec {
  id: string;
  label: string;
  simulated?: boolean;
  severity: string;
  ml_risk: string;
  ml_hold: boolean;
  /** What the on-call engineer actually sees breaking. */
  symptom: string;
  /** Business / downstream impact if left unhandled. */
  impact: string;
  /** How Sentinel first detects it. */
  detects: string;
  root_cause: string;
  source_name: string;
  datasets: Array<{ name: string; via: string }>;
  dashboards: string[];
  ml_models: string[];
  ml_deployments: Array<{ name: string; via: string }>;
  agents: Record<
    "sentinel" | "investigator" | "impact_analyst" | "ml_guardian" | "fixer" | "scribe" | "comms",
    string
  >;
  fix: {
    branch: string;
    pr_title: string;
    pr_body: string;
    files: Record<string, string>;
    diff: string;
    pr_url: string;
  };
  mttr: [number, number, number];
}

export const SCENARIOS: Record<string, ScenarioSpec> = {
  schema_drift: {
    id: "schema_drift",
    label: "Schema drift (supplier qty rename)",
    severity: "high",
    ml_risk: "critical",
    ml_hold: true,
    symptom: "dbt run FAILED — `column \"quantity\" not found` in stg_order_items; Demand Ops dashboard shows blank tiles.",
    impact: "Demand forecast model would train/serve on missing quantities → wrong reorder decisions in production.",
    detects: "Schema contract assertion on raw.order_items fails (expected `quantity`, found `qty`).",
    root_cause: "Supplier feed renamed `quantity`→`qty` and changed type to string, breaking stg_order_items.",
    source_name: "raw.order_items",
    datasets: [
      { name: "raw.order_items", via: "quantity" },
      { name: "main_staging.stg_order_items", via: "quantity" },
      { name: "main_marts.mart_demand_features", via: "next_day_qty" },
    ],
    dashboards: ["Demand Ops Dashboard"],
    ml_models: ["kavach.demand_forecast"],
    ml_deployments: [{ name: "demand-forecast-prod", via: "next_day_qty" }],
    agents: {
      sentinel: "Schema assertion failed: order_items.quantity missing (renamed to qty)",
      investigator: "Lineage + query history point to supplier feed contract change",
      impact_analyst: "Blast radius: stg_order_items → mart_demand_features → demand-forecast-prod",
      ml_guardian: "hold (critical): forecast features depend on quantity",
      fixer: "Generated dbt patch: coalesce(quantity, qty) cast + PR",
      scribe: "Postmortem + incident-resolved tags written to DataHub",
      comms: "Owners notified — schema_drift resolved",
    },
    fix: {
      branch: "kavach/fix-schema_drift",
      pr_title: "fix(dbt): handle supplier qty→quantity schema drift",
      pr_body: "Coalesce/cast qty→quantity in stg_order_items + not_null test. Linked to DataHub incident.",
      files: {
        "models/staging/stg_order_items.sql":
          "select cast(coalesce(quantity, qty) as integer) as quantity from {{ source('raw','order_items') }}",
        "models/schema.yml": "- name: quantity\n  tests: [not_null]",
      },
      diff: "+cast(coalesce(quantity, qty) as integer) as quantity",
      pr_url: DEMO_REPO_PULLS,
    },
    mttr: [3.0, 2.1, 0.8],
  },
  null_spike: {
    id: "null_spike",
    label: "Null spike on orders.customer_id",
    severity: "high",
    ml_risk: "low",
    ml_hold: false,
    symptom: "customer_id null rate jumps 0.2% → 34%; revenue joins drop rows and mart_daily_revenue plummets ~30%.",
    impact: "Revenue dashboard under-reports; finance sees a phantom revenue cliff overnight.",
    detects: "Null-rate assertion on stg_orders.customer_id breaches the 5% threshold.",
    root_cause: "Burst of NULLs in raw.orders.customer_id after an upstream API timeout, skewing revenue joins.",
    source_name: "raw.orders",
    datasets: [
      { name: "raw.orders", via: "customer_id" },
      { name: "main_staging.stg_orders", via: "customer_id" },
      { name: "main_marts.mart_daily_revenue", via: "revenue" },
    ],
    dashboards: ["Revenue Dashboard"],
    ml_models: [],
    ml_deployments: [],
    agents: {
      sentinel: "Null-rate assertion tripped: orders.customer_id null rate 34% (>5%)",
      investigator: "Query history shows upstream API 504s during ingestion window",
      impact_analyst: "Blast radius: stg_orders → mart_daily_revenue → Revenue Dashboard",
      ml_guardian: "low: no ML feature depends on customer_id",
      fixer: "Generated dbt guard: filter/flag null customer_id + not_null test",
      scribe: "Postmortem + tags written; incident resolved in DataHub",
      comms: "Revenue owners notified — null_spike contained",
    },
    fix: {
      branch: "kavach/fix-null_spike",
      pr_title: "fix(dbt): guard null customer_id in stg_orders",
      pr_body: "Filter/flag null customer_id and add not_null test on mart_daily_revenue keys.",
      files: {
        "models/staging/stg_orders.sql":
          "select * from {{ source('raw','orders') }} where customer_id is not null",
        "models/tests/assert_no_null_customer.sql": "select 1 from {{ ref('stg_orders') }} where customer_id is null",
      },
      diff: "+where customer_id is not null",
      pr_url: DEMO_REPO_PULLS,
    },
    mttr: [2.6, 1.7, 0.7],
  },
  value_corruption: {
    id: "value_corruption",
    label: "Value corruption in order_items.unit_price",
    severity: "critical",
    ml_risk: "critical",
    ml_hold: true,
    symptom: "line_total shows negatives and 100x spikes; forecast feature drift alarm fires and predictions swing wildly.",
    impact: "demand-forecast-prod is actively serving predictions on poisoned features — bad orders in real time.",
    detects: "Range/positivity assertion on unit_price + feature-drift monitor on mart_demand_features.",
    root_cause: "Negative/100x corrupted unit_price in raw.order_items skewed line_total and demand features feeding the forecast model.",
    source_name: "raw.order_items",
    datasets: [
      { name: "raw.order_items", via: "unit_price" },
      { name: "main_staging.stg_order_items", via: "line_total" },
      { name: "main_marts.mart_demand_features", via: "next_day_qty" },
    ],
    dashboards: ["Demand Ops Dashboard"],
    ml_models: ["kavach.demand_forecast"],
    ml_deployments: [{ name: "demand-forecast-prod", via: "next_day_qty" }],
    agents: {
      sentinel: "Range assertion failed: unit_price has negatives and 100x outliers",
      investigator: "Lineage: corruption propagates to line_total → demand features",
      impact_analyst: "Blast radius reaches demand-forecast-prod via column lineage",
      ml_guardian: "hold (critical): serving predictions on corrupted features — rollback advised",
      fixer: "Generated dbt cleaning transform + range assertion + PR (real)",
      scribe: "Postmortem + ML-risk note written to DataHub",
      comms: "ML platform + data owners paged — value_corruption held",
    },
    fix: {
      branch: "kavach/fix-value_corruption",
      pr_title: "fix(dbt): clean line_total corruption + ML deployment safeguard",
      pr_body: "Clamp/validate unit_price, recompute line_total, add positive-range assertion. ML Guardian: hold demand-forecast-prod until backfill.",
      files: {
        "models/staging/stg_order_items.sql":
          "select case when unit_price <= 0 or unit_price > 10000 then null else unit_price end as unit_price from {{ source('raw','order_items') }}",
        "models/tests/assert_line_total_range.sql":
          "select 1 from {{ ref('stg_order_items') }} where line_total < 0",
      },
      diff: "+case when unit_price <= 0 or unit_price > 10000 then null else unit_price end as unit_price",
      pr_url: REAL_PR,
    },
    mttr: [3.4, 2.2, 0.9],
  },
  freshness_lag: {
    id: "freshness_lag",
    label: "Freshness lag on upstream orders feed",
    severity: "medium",
    ml_risk: "medium",
    ml_hold: false,
    symptom: "No new raw.orders rows since 22:00; dashboards read 'last updated 9h ago' and forecasts go stale.",
    impact: "Ops act on yesterday's numbers; forecast slowly drifts from reality until the feed resumes.",
    detects: "Source freshness SLA on raw.orders breached (max_loaded_at > 2h).",
    root_cause: "Orders feed stopped landing; mart_daily_revenue is 9h stale, breaching the freshness SLA.",
    source_name: "raw.orders",
    datasets: [
      { name: "raw.orders", via: "loaded_at" },
      { name: "main_marts.mart_daily_revenue", via: "revenue" },
      { name: "main_marts.mart_demand_features", via: "next_day_qty" },
    ],
    dashboards: ["Demand Ops Dashboard", "Revenue Dashboard"],
    ml_models: ["kavach.demand_forecast"],
    ml_deployments: [{ name: "demand-forecast-prod", via: "next_day_qty" }],
    agents: {
      sentinel: "Freshness assertion failed: mart_daily_revenue 9h stale (SLA 2h)",
      investigator: "Query history: no new raw.orders rows since 22:00 — feed stalled",
      impact_analyst: "Stale features may degrade forecast; revenue dashboards outdated",
      ml_guardian: "medium: predictions usable but drifting — monitor",
      fixer: "Generated freshness assertion + backfill DAG artifact + PR",
      scribe: "Postmortem + freshness incident written to DataHub",
      comms: "On-call notified — freshness_lag backfill queued",
    },
    fix: {
      branch: "kavach/fix-freshness_lag",
      pr_title: "fix(dbt): add freshness assertion + backfill DAG for orders",
      pr_body: "Add source freshness check on raw.orders and an Airflow-style backfill DAG artifact.",
      files: {
        "models/staging/sources.yml":
          "sources:\n  - name: raw\n    tables:\n      - name: orders\n        freshness:\n          warn_after: {count: 2, period: hour}",
        "artifacts/backfill_orders_dag.py":
          "# Airflow-style backfill DAG (generated artifact)\n# backfills raw.orders for the stalled window",
      },
      diff: "+freshness:\n+  warn_after: {count: 2, period: hour}",
      pr_url: DEMO_REPO_PULLS,
    },
    mttr: [2.9, 2.0, 0.8],
  },
  healthcare_pii: {
    id: "healthcare_pii",
    label: "Healthcare PII exposure (simulated)",
    simulated: true,
    severity: "critical",
    ml_risk: "n/a",
    ml_hold: false,
    symptom: "PII scanner flags raw SSNs sitting unmasked in mart_patient_analytics, readable by all analysts.",
    impact: "HIPAA violation — regulated PII exposed in an analytics table; access must be revoked immediately.",
    detects: "PII classifier tags an unmasked ssn column landing in a downstream mart.",
    root_cause: "Simulated: raw.patients.ssn exposed unmasked into an analytics mart — compliance violation.",
    source_name: "raw.patients",
    datasets: [
      { name: "raw.patients", via: "ssn" },
      { name: "main_marts.mart_patient_analytics", via: "ssn" },
    ],
    dashboards: ["Clinical Ops Dashboard"],
    ml_models: [],
    ml_deployments: [],
    agents: {
      sentinel: "PII classifier flagged unmasked ssn in mart_patient_analytics",
      investigator: "Lineage: ssn flows from raw.patients without masking transform",
      impact_analyst: "Exposure scope: 1 mart + 1 dashboard; regulatory (HIPAA) risk",
      ml_guardian: "n/a: no ML deployment in this path",
      fixer: "Generated masking transform + glossary PII tag + PR",
      scribe: "Postmortem + PII glossary terms written to DataHub",
      comms: "Security + compliance owners notified — access restricted",
    },
    fix: {
      branch: "kavach/fix-healthcare_pii",
      pr_title: "fix(dbt): mask ssn + tag PII glossary terms",
      pr_body: "Apply hashing/masking to ssn and tag columns with PII glossary terms in DataHub.",
      files: {
        "models/marts/mart_patient_analytics.sql":
          "select sha256(ssn) as ssn_hash, /* ...other cols... */ from {{ ref('stg_patients') }}",
      },
      diff: "+sha256(ssn) as ssn_hash",
      pr_url: DEMO_REPO_PULLS,
    },
    mttr: [3.1, 2.0, 0.9],
  },
  nyc_taxi_freshness: {
    id: "nyc_taxi_freshness",
    label: "NYC taxi freshness SLA breach (simulated)",
    simulated: true,
    severity: "high",
    ml_risk: "medium",
    ml_hold: false,
    symptom: "Latest nyc_taxi.trips partition is 6h late; ETA feature table stops advancing and ETAs get stale.",
    impact: "eta-predictor-prod returns increasingly wrong ETAs to riders until the partition lands.",
    detects: "Partition freshness SLA on nyc_taxi.trips breached (partition age > 3h).",
    root_cause: "Simulated: nyc_taxi.trips partition late by 6h, cascading stale ETA features.",
    source_name: "raw.nyc_taxi_trips",
    datasets: [
      { name: "raw.nyc_taxi_trips", via: "pickup_ts" },
      { name: "main_marts.mart_trip_features", via: "eta_minutes" },
    ],
    dashboards: ["Mobility Ops Dashboard"],
    ml_models: ["kavach.eta_predictor"],
    ml_deployments: [{ name: "eta-predictor-prod", via: "eta_minutes" }],
    agents: {
      sentinel: "Freshness assertion failed: nyc_taxi.trips 6h late",
      investigator: "Partition landing delayed upstream; ETA features stale",
      impact_analyst: "Blast radius: mart_trip_features → eta-predictor-prod",
      ml_guardian: "medium: ETA predictions drifting — monitor, no hold",
      fixer: "Generated freshness check + late-partition backfill + PR",
      scribe: "Postmortem + freshness incident written to DataHub",
      comms: "Mobility on-call notified — backfill scheduled",
    },
    fix: {
      branch: "kavach/fix-nyc_taxi_freshness",
      pr_title: "fix(dbt): freshness SLA + late-partition backfill for taxi trips",
      pr_body: "Add freshness SLA on nyc_taxi.trips and a late-partition backfill artifact.",
      files: {
        "models/staging/sources.yml":
          "sources:\n  - name: raw\n    tables:\n      - name: nyc_taxi_trips\n        freshness:\n          error_after: {count: 3, period: hour}",
      },
      diff: "+error_after: {count: 3, period: hour}",
      pr_url: DEMO_REPO_PULLS,
    },
    mttr: [2.8, 1.9, 0.8],
  },
};

export function listScenarioSpecs(): ChaosScenario[] {
  return Object.values(SCENARIOS).map((s) => ({
    id: s.id,
    label: s.label,
    simulated: s.simulated,
  }));
}

export interface ScenarioDetail {
  id: string;
  label: string;
  simulated: boolean;
  severity: string;
  ml_risk: string;
  ml_hold: boolean;
  symptom: string;
  impact: string;
  detects: string;
  root_cause: string;
  fix: string;
  affected: string[];
}

export function listScenarioDetails(): ScenarioDetail[] {
  return Object.values(SCENARIOS).map((s) => ({
    id: s.id,
    label: s.label,
    simulated: Boolean(s.simulated),
    severity: s.severity,
    ml_risk: s.ml_risk,
    ml_hold: s.ml_hold,
    symptom: s.symptom,
    impact: s.impact,
    detects: s.detects,
    root_cause: s.root_cause,
    fix: s.fix.pr_title,
    affected: [
      ...s.datasets.map((d) => d.name),
      ...s.ml_deployments.map((d) => d.name),
    ],
  }));
}

export function getSpec(id: string): ScenarioSpec {
  return SCENARIOS[id] ?? SCENARIOS.schema_drift;
}

export function scenarioIdFromRunId(runId: string): string {
  const match = runId.match(/(?:run-|chaos_)([a-z_]+?)(?:-\d+|_seed|$)/);
  return match && SCENARIOS[match[1]] ? match[1] : "schema_drift";
}

function buildBlastRadius(spec: ScenarioSpec): BlastRadius {
  return {
    source_urn: `urn:li:dataset:(urn:li:dataPlatform:duckdb,${spec.source_name},PROD)`,
    datasets: spec.datasets.map((d) => ({
      urn: `urn:li:dataset:(urn:li:dataPlatform:duckdb,${d.name},PROD)`,
      name: d.name,
      entity_type: "dataset",
      via_column: d.via,
    })),
    dashboards: spec.dashboards.map((name) => ({
      urn: `urn:li:dashboard:(looker,${name.replace(/\s+/g, "_").toLowerCase()},PROD)`,
      name,
      entity_type: "dashboard",
    })),
    ml_models: spec.ml_models.map((name) => ({
      urn: `urn:li:mlModel:(urn:li:dataPlatform:mlflow,${name},PROD)`,
      name,
      entity_type: "mlModel",
    })),
    ml_deployments: spec.ml_deployments.map((d) => ({
      urn: `urn:li:mlModelDeployment:(urn:li:dataPlatform:sagemaker,${d.name},PROD)`,
      name: d.name,
      entity_type: "mlModelDeployment",
      via_column: d.via,
    })),
  };
}

export function getScenarioRun(id: string, runId: string): RunState {
  const spec = getSpec(id);
  const agentOrder = [
    "sentinel",
    "investigator",
    "impact_analyst",
    "ml_guardian",
    "fixer",
    "scribe",
    "comms",
  ] as const;
  return {
    run_id: runId,
    incident_id: `inc-${spec.id}`,
    incident_urn: `urn:li:incident:${spec.id}-demo`,
    trigger: { type: "chaos", scenario: spec.id, seed: 42 },
    status: "resolved",
    severity: spec.severity,
    symptom: spec.symptom,
    impact: spec.impact,
    root_cause: spec.root_cause,
    findings: agentOrder.map(
      (a) => `${a.replace(/_/g, " ")}: ${spec.agents[a]}`,
    ),
    blast_radius: buildBlastRadius(spec),
    ml_risk: spec.ml_risk,
    ml_hold_recommended: spec.ml_hold,
    fix_plan: {
      summary: spec.fix.pr_title,
      steps: Object.keys(spec.fix.files),
      safeguard_assertion: spec.fix.diff,
      hold_recommendation: spec.ml_hold,
    },
    postmortem: `## Incident: ${spec.id}\nRoot cause: ${spec.root_cause}\nFix: ${spec.fix.pr_title}\nScenario tag: ${spec.id}`,
    timeline: [],
    notification_sent: true,
  };
}

export function getScenarioFix(id: string, runId: string): FixResponse {
  const spec = getSpec(id);
  return {
    run_id: runId,
    pr_ref: spec.fix.pr_url,
    artifacts: {
      scenario: spec.id,
      branch_name: spec.fix.branch,
      files: spec.fix.files,
      pr_title: spec.fix.pr_title,
      pr_body: spec.fix.pr_body,
      diff: spec.fix.diff,
      incident_id: `inc-${spec.id}`,
      blast_radius_summary: spec.datasets.map((d) => d.name).join(", "),
    },
  };
}

export function getScenarioEvents(id: string, runId: string): AgentEvent[] {
  const spec = getSpec(id);
  const agentOrder = [
    ["sentinel", "anomaly_detected"],
    ["investigator", "root_cause_found"],
    ["impact_analyst", "blast_radius_mapped"],
    ["ml_guardian", "ml_risk_assessed"],
    ["fixer", "fix_generated"],
    ["scribe", "postmortem_written"],
    ["comms", "notification_sent"],
  ] as const;
  return agentOrder.map(([agent, event_type], index) => ({
    id: `${runId}-evt-${index + 1}`,
    run_id: runId,
    agent,
    event_type,
    message: spec.agents[agent],
    payload: { processing_ms: 200 + index * 40 },
    timestamp: new Date(Date.UTC(2026, 6, 24, 10, 0, index)).toISOString(),
  }));
}

export function getScenarioMttr(id: string): MttrPoint[] {
  const spec = getSpec(id);
  return spec.mttr.map((mttr_seconds, i) => ({
    run_id: `${spec.id}-run-${i + 1}`,
    scenario: spec.id,
    mttr_seconds,
    cited_prior: i > 0,
    recorded_at: new Date(Date.UTC(2026, 6, 24, 8 + i, 0, 0)).toISOString(),
  }));
}
