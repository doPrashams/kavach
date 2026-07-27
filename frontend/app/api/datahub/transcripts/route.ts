import { NextResponse } from "next/server";

import transcript from "@/fixtures/datahub-transcript.json";

export async function GET() {
  return NextResponse.json({
    source: "fixture",
    redacted: true,
    entries: transcript,
  });
}
