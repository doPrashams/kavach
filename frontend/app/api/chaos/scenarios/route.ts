import { NextResponse } from "next/server";

import { listScenarioSpecs } from "@/lib/scenarios";

export async function GET() {
  return NextResponse.json({
    scenarios: listScenarioSpecs(),
  });
}
