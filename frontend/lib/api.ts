import type { AuditEntry } from "@/lib/audit";
import { getDemoFixture } from "@/lib/fixtures";
import type { DataProbe } from "@/lib/real-data";
import { getScenarioEvents, scenarioIdFromRunId } from "@/lib/scenarios";
import type {
  ChaosScenario,
  FixResponse,
  MttrPoint,
  RunState,
} from "@/lib/types";

/**
 * Empty = same-origin Next.js /api demo routes (Vercel).
 * Set NEXT_PUBLIC_API_URL to a FastAPI backend for live mode.
 */
const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

/** path is always `/api/...` for the demo app; live FastAPI omits the `/api` prefix. */
function url(path: string): string {
  if (API_URL) {
    const backendPath = path.startsWith("/api") ? path.slice(4) || "/" : path;
    return `${API_URL}${backendPath}`;
  }
  return path;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`API ${path} failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function isOfflineMode(): boolean {
  // Demo API on Vercel is fixture-backed but still hits real HTTP endpoints.
  return !API_URL;
}

export function isDemoApi(): boolean {
  return !API_URL;
}

export async function listScenarios(): Promise<ChaosScenario[]> {
  try {
    const data = await fetchJson<{ scenarios: ChaosScenario[] }>("/api/chaos/scenarios");
    return data.scenarios;
  } catch {
    return getDemoFixture().scenarios;
  }
}

export async function injectChaos(
  scenario: string,
  seed = 42,
): Promise<{ run_id: string; scenario: string }> {
  return fetchJson("/api/chaos/inject", {
    method: "POST",
    body: JSON.stringify({ scenario, seed }),
  });
}

export async function getRun(runId: string): Promise<RunState> {
  try {
    return await fetchJson<RunState>(`/api/runs/${runId}`);
  } catch {
    return getDemoFixture().run;
  }
}

export async function getFix(runId: string): Promise<FixResponse> {
  try {
    return await fetchJson<FixResponse>(`/api/fixes/${runId}`);
  } catch {
    return getDemoFixture().fix;
  }
}

export async function listRecordings(): Promise<string[]> {
  try {
    const data = await fetchJson<{ recordings: string[] }>("/api/recordings");
    return data.recordings;
  } catch {
    return [getDemoFixture().recordingId];
  }
}

export async function replayRecording(
  runId: string,
): Promise<{ events_replayed: number; events?: unknown[] }> {
  return fetchJson(`/api/replay/${runId}`, { method: "POST" });
}

export async function getMttrTrend(scenario?: string): Promise<MttrPoint[]> {
  try {
    const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : "";
    return await fetchJson<MttrPoint[]>(`/api/flywheel/mttr${query}`);
  } catch {
    return getDemoFixture().mttrTrend;
  }
}

export async function getSiteHealth(): Promise<SiteHealth> {
  return fetchJson<SiteHealth>("/api/health");
}

export async function getAuditLog(limit = 100): Promise<AuditLog> {
  return fetchJson<AuditLog>(`/api/admin/audit?limit=${limit}`);
}

export async function clearAuditLog(): Promise<{ ok: boolean; cleared: number }> {
  return fetchJson("/api/admin/audit", { method: "DELETE" });
}

export async function getSiteGuide(): Promise<SiteGuide> {
  return fetchJson<SiteGuide>("/api/site/guide");
}

export async function getDataPreview(scenario: string): Promise<DataProbe> {
  return fetchJson<DataProbe>(
    `/api/data/preview?scenario=${encodeURIComponent(scenario)}`,
  );
}

export async function getBeforeAfter(scenario: string) {
  return fetchJson<{
    scenario: string;
    question: string;
    before: { answer: string; has_incident_context: boolean };
    after: { answer: string; has_incident_context: boolean };
    delta: string[];
  }>(`/api/analytics/before-after?scenario=${encodeURIComponent(scenario)}`);
}

export function getFixtureEvents(runId?: string) {
  const fixture = getDemoFixture();
  if (!runId || runId === fixture.recordingId) {
    return fixture.events;
  }
  const scenario = scenarioIdFromRunId(runId);
  return getScenarioEvents(scenario, runId);
}

export interface SiteHealth {
  status: string;
  version: string;
  mode: string;
  checked_at: string;
  deployment: {
    frontend: { name: string; url: string; routes: string[] };
    backend_optional: { name: string; url: string; ui: string; note: string };
    repos: { main: string; demoPipeline: string };
  };
  datahub: { ok: boolean; status: number; url: string };
  apis: Array<{
    method: string;
    path: string;
    widget: string;
    ok: boolean;
    status: number;
    latency_ms: number;
  }>;
  summary: { total: number; healthy: number; failed: string[] };
}

export interface SiteGuide {
  instructions: Array<{ step: number; title: string; body: string }>;
  about: {
    name: string;
    email: string;
    github: string;
    repo: string;
    demoPipeline: string;
    blurb: string;
  };
  tech_stack: Array<{ layer: string; items: string[] }>;
  tour: Array<{ id: string; target: string; title: string; body: string }>;
  scenarios: ScenarioDetail[];
  deployment: SiteHealth["deployment"];
}

export interface AuditLog {
  durable: boolean;
  protected: boolean;
  count: number;
  generated_at: string;
  entries: AuditEntry[];
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

export { API_URL };
