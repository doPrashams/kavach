import { NextResponse } from "next/server";

import {
  buildEventsForRun,
  buildFixForScenario,
  buildRunForScenario,
} from "@/lib/api-demo";
import { getDemoFixture } from "@/lib/fixtures";

/** In-memory run registry for this serverless instance (demo). */
const RUNS = new Map<string, { scenario: string; created_at: string }>();

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    scenario?: string;
    seed?: number;
  };
  const fixture = getDemoFixture();
  const scenario =
    body.scenario && fixture.scenarios.some((s) => s.id === body.scenario)
      ? body.scenario
      : "schema_drift";

  const runId = `run-${scenario}-${Date.now()}`;
  RUNS.set(runId, { scenario, created_at: new Date().toISOString() });

  // Attach generated payloads under globalThis for sibling routes in same isolate
  const g = globalThis as typeof globalThis & {
    __kavachRuns?: Map<string, unknown>;
  };
  if (!g.__kavachRuns) g.__kavachRuns = new Map();
  g.__kavachRuns.set(runId, {
    run: buildRunForScenario(scenario, runId),
    fix: buildFixForScenario(scenario, runId),
    events: buildEventsForRun(runId, scenario),
    scenario,
  });

  return NextResponse.json({
    run_id: runId,
    scenario,
    seed: body.seed ?? 42,
    mode: "fixture-replay",
  });
}
