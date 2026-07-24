import { NextResponse } from "next/server";

import { buildEventsForRun } from "@/lib/api-demo";
import { recordAudit } from "@/lib/audit";
import { getDemoFixture } from "@/lib/fixtures";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const fixture = getDemoFixture();
  const scenario =
    (id.match(/(?:run-|chaos_)([a-z_]+)/)?.[1] as string | undefined) ?? "schema_drift";
  const events = buildEventsForRun(id || fixture.recordingId, scenario);
  await recordAudit(request, { action: "replay", scenario, run_id: id });
  return NextResponse.json({
    run_id: id,
    events_replayed: events.length,
    events,
  });
}
