import { NextResponse } from "next/server";

import { buildFixForScenario } from "@/lib/api-demo";
import { getDemoFixture } from "@/lib/fixtures";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const g = globalThis as typeof globalThis & {
    __kavachRuns?: Map<string, { fix: ReturnType<typeof buildFixForScenario>; scenario: string }>;
  };
  const stored = g.__kavachRuns?.get(id);
  if (stored?.fix) {
    return NextResponse.json(stored.fix);
  }
  const fixture = getDemoFixture();
  const scenario =
    (id.match(/^run-([a-z_]+)-/)?.[1] as string | undefined) ?? "schema_drift";
  return NextResponse.json(buildFixForScenario(scenario, id || fixture.recordingId));
}
