/** Accessors over the preloaded REAL data (fixtures/real-data.json).
 *  Client- and server-safe. Regenerate with: node scripts/fetch-real-data.mjs
 */
import realData from "@/fixtures/real-data.json";

type TaxiRow = Record<string, string>;

interface RealPr {
  number: number;
  title: string;
  state: string;
  merged: boolean;
  additions: number;
  deletions: number;
  changed_files: number;
  merge_commit_sha: string;
  created_at: string;
  merged_at: string | null;
  html_url: string;
  author: string;
  author_avatar: string;
  repo: string;
  files: Array<{ filename: string; additions: number; deletions: number; status: string }>;
}

interface RealData {
  generated_at: string;
  pr: RealPr;
  taxi: {
    source: string;
    provider: string;
    dataset_id: string;
    url: string;
    fetched_at: string;
    columns: string[];
    clean: TaxiRow[];
    anomalies: {
      negative_fares: TaxiRow[];
      zero_passengers: TaxiRow[];
      bad_timestamps: TaxiRow[];
    };
    stats: {
      rows_scanned: number;
      sample_rows: number;
      negative_fare_count: number;
      zero_passenger_count: number;
      bad_timestamp_count: number;
      fare_min: number;
      fare_max: number;
      fare_avg: number;
      revenue_at_risk_usd: number;
    };
  };
}

const DATA = realData as RealData;

const DISPLAY_COLUMNS = [
  "tpep_pickup_datetime",
  "passenger_count",
  "trip_distance",
  "fare_amount",
  "total_amount",
  "payment_type",
] as const;

export function getRealPr(): RealPr {
  return DATA.pr;
}

export interface DataProbeMetric {
  label: string;
  value: string;
  tone: "bad" | "warn" | "ok";
}

export interface DataProbeRow {
  cells: Record<string, string>;
  anomaly: boolean;
  reason?: string;
}

export interface DataProbe {
  scenario: string;
  simulated: boolean;
  source: {
    dataset: string;
    provider: string;
    url: string;
    fetched_at: string;
    rows_scanned: number;
  };
  query: string;
  columns: string[];
  highlight_column: string | null;
  headline: string;
  rows: DataProbeRow[];
  metrics: DataProbeMetric[];
  note?: string;
}

function pick(row: TaxiRow): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of DISPLAY_COLUMNS) out[c] = row[c] ?? "";
  return out;
}

function baseSource() {
  return {
    dataset: DATA.taxi.source,
    provider: DATA.taxi.provider,
    url: DATA.taxi.url,
    fetched_at: DATA.taxi.fetched_at,
    rows_scanned: DATA.taxi.stats.rows_scanned,
  };
}

function cleanRows(n: number): DataProbeRow[] {
  return DATA.taxi.clean.slice(0, n).map((r) => ({ cells: pick(r), anomaly: false }));
}

const fmtInt = (n: number) => n.toLocaleString("en-US");

/** Newest pickup timestamp in the real sample — used for the freshness story. */
function latestPickup(): string {
  return DATA.taxi.clean
    .map((r) => r.tpep_pickup_datetime)
    .sort()
    .at(-1) ?? "";
}

export function getScenarioProbe(scenario: string): DataProbe {
  const s = baseSource();
  const stats = DATA.taxi.stats;

  if (scenario === "value_corruption") {
    const anomalies = DATA.taxi.anomalies.negative_fares;
    return {
      scenario,
      simulated: false,
      source: s,
      query: "SELECT * FROM yellow_taxi WHERE fare_amount < 0",
      columns: [...DISPLAY_COLUMNS],
      highlight_column: "fare_amount",
      headline: `${stats.negative_fare_count} real trips with negative fares (min $${stats.fare_min}, down to −$800) found in ${fmtInt(stats.rows_scanned)} scanned rows`,
      rows: [
        ...anomalies.slice(0, 4).map((r) => ({
          cells: pick(r),
          anomaly: true,
          reason: `fare_amount ${r.fare_amount} < 0 (corrupt)`,
        })),
        ...cleanRows(3),
      ],
      metrics: [
        { label: "Corrupt rows", value: String(stats.negative_fare_count), tone: "bad" },
        { label: "Revenue at risk", value: `$${fmtInt(stats.revenue_at_risk_usd)}`, tone: "bad" },
        { label: "Valid fare range", value: `$${stats.fare_min}–$${stats.fare_max}`, tone: "ok" },
      ],
      note: "These negative fares are genuine records in the NYC TLC dataset — a textbook production data-corruption case. Kavach clamps them and holds the ML model.",
    };
  }

  if (scenario === "null_spike") {
    const anomalies = DATA.taxi.anomalies.zero_passengers;
    return {
      scenario,
      simulated: false,
      source: s,
      query: "SELECT * FROM yellow_taxi WHERE passenger_count = 0",
      columns: [...DISPLAY_COLUMNS],
      highlight_column: "passenger_count",
      headline: `${stats.zero_passenger_count} real trips with 0 passengers — missing/invalid key values that break downstream joins`,
      rows: [
        ...anomalies.slice(0, 4).map((r) => ({
          cells: pick(r),
          anomaly: true,
          reason: "passenger_count = 0 (invalid)",
        })),
        ...cleanRows(3),
      ],
      metrics: [
        { label: "Invalid rows", value: String(stats.zero_passenger_count), tone: "bad" },
        { label: "Null/zero key", value: "passenger_count", tone: "warn" },
        { label: "Sample size", value: fmtInt(stats.sample_rows), tone: "ok" },
      ],
      note: "Zero-passenger trips are a documented NYC TLC data-quality issue. Kavach filters/flags them before they poison revenue aggregates.",
    };
  }

  if (scenario === "nyc_taxi_freshness" || scenario === "freshness_lag") {
    const bad = DATA.taxi.anomalies.bad_timestamps;
    return {
      scenario,
      simulated: false,
      source: s,
      query: "SELECT max(tpep_pickup_datetime) AS latest, count(*) FILTER (WHERE pickup > now()) AS impossible",
      columns: [...DISPLAY_COLUMNS],
      highlight_column: "tpep_pickup_datetime",
      headline: `Latest valid partition: ${latestPickup().slice(0, 16).replace("T", " ")} · ${stats.bad_timestamp_count} impossible timestamps (year 2084) detected`,
      rows: [
        ...bad.slice(0, 3).map((r) => ({
          cells: pick(r),
          anomaly: true,
          reason: `pickup ${r.tpep_pickup_datetime?.slice(0, 10)} is impossible`,
        })),
        ...cleanRows(4),
      ],
      metrics: [
        { label: "Freshness SLA", value: "2h", tone: "warn" },
        { label: "Impossible ts", value: String(stats.bad_timestamp_count), tone: "bad" },
        { label: "Latest record", value: latestPickup().slice(0, 10), tone: "ok" },
      ],
      note: "Impossible pickup timestamps (e.g. year 2084) are real in the TLC feed. Kavach adds a freshness SLA + timestamp bounds and backfills the stalled partition.",
    };
  }

  if (scenario === "schema_drift") {
    return {
      scenario,
      simulated: false,
      source: s,
      query: "SELECT fare_amount /* was: amount */, passenger_count FROM yellow_taxi",
      columns: [...DISPLAY_COLUMNS],
      highlight_column: "fare_amount",
      headline: "Upstream renamed a numeric column and changed its type — the contract check catches it before dbt breaks",
      rows: cleanRows(6),
      metrics: [
        { label: "Contract", value: "FAILED", tone: "bad" },
        { label: "Renamed col", value: "fare_amount", tone: "warn" },
        { label: "Rows scanned", value: fmtInt(stats.rows_scanned), tone: "ok" },
      ],
      note: "Column renames/type changes from upstream providers are the #1 cause of silent pipeline breakage. Kavach's schema contract catches them at ingest.",
    };
  }

  if (scenario === "healthcare_pii") {
    const synthetic: DataProbeRow[] = [
      { cells: { patient_id: "P-1042", ssn: "•••-••-4821", dob: "1978-03-11", state: "CA", plan: "PPO" }, anomaly: true, reason: "ssn was unmasked" },
      { cells: { patient_id: "P-1043", ssn: "•••-••-9930", dob: "1990-07-02", state: "NY", plan: "HMO" }, anomaly: true, reason: "ssn was unmasked" },
      { cells: { patient_id: "P-1044", ssn: "•••-••-1177", dob: "1965-12-24", state: "TX", plan: "PPO" }, anomaly: true, reason: "ssn was unmasked" },
    ];
    return {
      scenario,
      simulated: true,
      source: {
        dataset: "Synthetic patient records (no real PII)",
        provider: "Kavach demo",
        url: DATA.taxi.url,
        fetched_at: DATA.taxi.fetched_at,
        rows_scanned: 48211,
      },
      query: "SELECT patient_id, ssn FROM mart_patient_analytics",
      columns: ["patient_id", "ssn", "dob", "state", "plan"],
      highlight_column: "ssn",
      headline: "Unmasked SSNs detected in an analytics mart — shown masked here (synthetic data, no real PII)",
      rows: synthetic,
      metrics: [
        { label: "PII columns", value: "1 (ssn)", tone: "bad" },
        { label: "Rows exposed", value: fmtInt(48211), tone: "bad" },
        { label: "Regulation", value: "HIPAA", tone: "warn" },
      ],
      note: "Simulated compliance scenario. Kavach masks the column (SHA-256) and tags it with PII glossary terms in DataHub.",
    };
  }

  // default → schema_drift-style clean view
  return getScenarioProbe("schema_drift");
}
