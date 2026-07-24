import { NextResponse } from "next/server";

import { getScenarioProbe } from "@/lib/real-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") ?? "schema_drift";
  return NextResponse.json(getScenarioProbe(scenario));
}
