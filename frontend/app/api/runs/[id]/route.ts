import { NextResponse } from "next/server";

import { buildRunForScenario } from "@/lib/api-demo";
import { getDemoFixture } from "@/lib/fixtures";

type Stored = {
  run: ReturnType<typeof buildRunForScenario>;
  scenario: string;
};

function getStored(runId: string): Stored | null {
  const g = globalThis as typeof globalThis & {
    __kavachRuns?: Map<string, Stored>;
  };
  return g.__kavachRuns?.get(runId) ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const stored = getStored(id);
  if (stored) {
    return NextResponse.json(stored.run);
  }
  // Fallback to fixture (replay of known recording id)
  const fixture = getDemoFixture();
  if (id === fixture.recordingId || id.startsWith("demo-") || id.startsWith("run-")) {
    const scenario =
      (id.match(/^run-([a-z_]+)-/)?.[1] as string | undefined) ??
      (fixture.run.trigger?.scenario as string) ??
      "schema_drift";
    return NextResponse.json(buildRunForScenario(scenario, id));
  }
  return NextResponse.json({ detail: "Run not found" }, { status: 404 });
}
