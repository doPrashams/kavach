import { NextResponse } from "next/server";

import { getDemoFixture } from "@/lib/fixtures";
import { SCENARIOS, getScenarioMttr } from "@/lib/scenarios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") ?? undefined;
  if (scenario && SCENARIOS[scenario]) {
    return NextResponse.json(getScenarioMttr(scenario));
  }
  return NextResponse.json(getDemoFixture().mttrTrend);
}
