/** Shared helpers for Next.js /api demo routes (fixture-backed). */

import { getDemoFixture } from "@/lib/fixtures";
import type { FixResponse, RunState } from "@/lib/types";

export function apiBaseFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function buildRunForScenario(scenario: string, runId: string): RunState {
  const fixture = getDemoFixture();
  const run: RunState = structuredClone(fixture.run);
  run.run_id = runId;
  run.trigger = { type: "chaos", scenario, seed: 42 };
  run.findings = run.findings.map((f) =>
    f.includes("schema_drift") ? f.replace(/schema_drift/g, scenario) : f,
  );
  if (run.postmortem) {
    run.postmortem = run.postmortem.replace(/schema_drift/g, scenario);
  }
  if (run.fix_plan) {
    run.fix_plan = {
      ...run.fix_plan,
      summary: run.fix_plan.summary.replace(/schema_drift/g, scenario),
    };
  }
  return run;
}

export function buildFixForScenario(scenario: string, runId: string): FixResponse {
  const fixture = getDemoFixture();
  const fix: FixResponse = structuredClone(fixture.fix);
  fix.run_id = runId;
  fix.artifacts = {
    ...fix.artifacts,
    scenario,
    branch_name: `kavach/fix-${scenario}-demo`,
    pr_title: fix.artifacts.pr_title.replace(/schema_drift/g, scenario),
  };
  return fix;
}

export function buildEventsForRun(runId: string, scenario: string) {
  const fixture = getDemoFixture();
  return fixture.events.map((event, index) => ({
    ...event,
    id: `${runId}-evt-${index + 1}`,
    run_id: runId,
    message: event.message.replace(/schema_drift/g, scenario),
  }));
}

export const API_ROUTE_CATALOG = [
  { method: "GET", path: "/api/health", widget: "Site health", required: true },
  { method: "GET", path: "/api/site/guide", widget: "Sidebar guide", required: true },
  { method: "GET", path: "/api/chaos/scenarios", widget: "Chaos panel", required: true },
  { method: "POST", path: "/api/chaos/inject", widget: "Inject Chaos", required: true },
  { method: "GET", path: "/api/runs/:id", widget: "Run state / cards", required: true },
  { method: "GET", path: "/api/fixes/:id", widget: "PR card", required: true },
  { method: "GET", path: "/api/recordings", widget: "Replay controls", required: true },
  { method: "POST", path: "/api/replay/:id", widget: "Replay", required: true },
  { method: "GET", path: "/api/flywheel/mttr", widget: "MTTR chart", required: true },
  { method: "GET", path: "/api/analytics/before-after", widget: "Ask DataHub", required: true },
] as const;
