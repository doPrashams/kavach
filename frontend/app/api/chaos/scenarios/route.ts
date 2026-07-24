import { NextResponse } from "next/server";

import { getDemoFixture } from "@/lib/fixtures";

export async function GET() {
  const fixture = getDemoFixture();
  return NextResponse.json({
    scenarios: fixture.scenarios,
  });
}
