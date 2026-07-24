/** Shared helpers for Next.js /api demo routes (per-scenario data). */

import {
  getScenarioEvents,
  getScenarioFix,
  getScenarioRun,
} from "@/lib/scenarios";
import type { FixResponse, RunState } from "@/lib/types";

export function apiBaseFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function buildRunForScenario(scenario: string, runId: string): RunState {
  return getScenarioRun(scenario, runId);
}

export function buildFixForScenario(scenario: string, runId: string): FixResponse {
  return getScenarioFix(scenario, runId);
}

export function buildEventsForRun(runId: string, scenario: string) {
  return getScenarioEvents(scenario, runId);
}

export const API_ROUTE_CATALOG = [
  { method: "GET", path: "/api/health", widget: "Site health", required: true },
  { method: "GET", path: "/api/site/guide", widget: "Sidebar guide", required: true },
  { method: "GET", path: "/api/chaos/scenarios", widget: "Chaos panel", required: true },
  { method: "POST", path: "/api/chaos/inject", widget: "Inject Chaos", required: true },
  { method: "GET", path: "/api/data/preview", widget: "Live data probe", required: true },
  { method: "GET", path: "/api/runs/:id", widget: "Run state / cards", required: true },
  { method: "GET", path: "/api/fixes/:id", widget: "PR card", required: true },
  { method: "GET", path: "/api/recordings", widget: "Replay controls", required: true },
  { method: "POST", path: "/api/replay/:id", widget: "Replay", required: true },
  { method: "GET", path: "/api/flywheel/mttr", widget: "MTTR chart", required: true },
  { method: "GET", path: "/api/analytics/before-after", widget: "Ask DataHub", required: true },
  { method: "GET", path: "/api/admin/audit", widget: "Admin activity log", required: false },
] as const;
