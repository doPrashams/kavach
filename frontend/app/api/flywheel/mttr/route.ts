import { NextResponse } from "next/server";

import { getDemoFixture } from "@/lib/fixtures";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenario = searchParams.get("scenario") ?? undefined;
  const trend = getDemoFixture().mttrTrend;
  return NextResponse.json(
    scenario ? trend.filter((point) => point.scenario === scenario) : trend,
  );
}
