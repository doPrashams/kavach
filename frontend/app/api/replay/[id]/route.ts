import { NextResponse } from "next/server";

import { buildEventsForRun } from "@/lib/api-demo";
import { getDemoFixture } from "@/lib/fixtures";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const fixture = getDemoFixture();
  const scenario =
    (id.match(/(?:run-|chaos_)([a-z_]+)/)?.[1] as string | undefined) ?? "schema_drift";
  const events = buildEventsForRun(id || fixture.recordingId, scenario);
  return NextResponse.json({
    run_id: id,
    events_replayed: events.length,
    events,
  });
}
