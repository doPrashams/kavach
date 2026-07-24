import { NextResponse } from "next/server";

import { getDemoFixture } from "@/lib/fixtures";

export async function GET() {
  const fixture = getDemoFixture();
  return NextResponse.json({
    recordings: [
      fixture.recordingId,
      "chaos_schema_drift_seed42",
      "chaos_null_spike_seed42",
      "chaos_value_corruption_seed42",
      "chaos_freshness_lag_seed42",
    ],
  });
}
