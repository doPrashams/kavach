import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { clearAudit, listAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** SHA-256 of the admin PIN — PIN itself is never committed. */
const ADMIN_PIN_DIGEST =
  "f0fccd7fc4de68f4ca4e2cc29a636b109cb868be9459249fa0fc3182b4f8c3b2";

function tokenOk(provided: string | null): boolean {
  if (!provided) return false;
  const envToken = process.env.ADMIN_TOKEN;
  if (envToken && provided === envToken) return true;
  const digest = createHash("sha256").update(provided.trim(), "utf8").digest("hex");
  return digest === ADMIN_PIN_DIGEST;
}

function unauthorized(request: Request, searchParams: URLSearchParams) {
  const provided =
    searchParams.get("token") ?? request.headers.get("x-admin-token");
  if (!tokenOk(provided)) {
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
    protected: true,
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
