import { NextResponse } from "next/server";

import { listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const adminToken = process.env.ADMIN_TOKEN;
  if (adminToken) {
    const provided =
      searchParams.get("token") ?? request.headers.get("x-admin-token");
    if (provided !== adminToken) {
      return NextResponse.json({ detail: "unauthorized" }, { status: 401 });
    }
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200);
  const { durable, entries } = await listAudit(limit);

  return NextResponse.json({
    durable,
    protected: Boolean(adminToken),
    count: entries.length,
    generated_at: new Date().toISOString(),
    entries,
  });
}
