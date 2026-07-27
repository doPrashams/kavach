import { NextResponse } from "next/server";

import { clearAudit, listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function unauthorized(request: Request, searchParams: URLSearchParams) {
  const adminToken = process.env.ADMIN_TOKEN;
  if (!adminToken) return null;
  const provided =
    searchParams.get("token") ?? request.headers.get("x-admin-token");
  if (provided !== adminToken) {
    return NextResponse.json({ detail: "unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const denied = unauthorized(request, searchParams);
  if (denied) return denied;

  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200);
  const { durable, entries } = await listAudit(limit);

  return NextResponse.json({
    durable,
    protected: Boolean(process.env.ADMIN_TOKEN),
    count: entries.length,
    generated_at: new Date().toISOString(),
    entries,
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const denied = unauthorized(request, searchParams);
  if (denied) return denied;

  const result = await clearAudit();
  return NextResponse.json({
    ok: true,
    ...result,
    generated_at: new Date().toISOString(),
  });
}
