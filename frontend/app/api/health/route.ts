import { NextResponse } from "next/server";

import { API_ROUTE_CATALOG, apiBaseFromRequest } from "@/lib/api-demo";
import { DEPLOYMENT_INFO } from "@/lib/site-content";

export const dynamic = "force-dynamic";

async function probe(
  base: string,
  method: string,
  path: string,
): Promise<{ ok: boolean; status: number; latency_ms: number; error?: string }> {
  const started = Date.now();
  const url = path.includes(":id")
    ? `${base}${path.replace(":id", "demo-schema-drift-001")}${path.includes("before-after") ? "" : ""}`
    : `${base}${path}`;

  try {
    const init: RequestInit = { method, cache: "no-store" };
    if (method === "POST") {
      init.headers = { "Content-Type": "application/json" };
      if (path.includes("inject")) {
        init.body = JSON.stringify({ scenario: "schema_drift", seed: 42 });
      } else {
        init.body = JSON.stringify({});
      }
    }
    // Avoid recursive full health probe loops — for health itself skip self
    if (path === "/api/health") {
      return { ok: true, status: 200, latency_ms: 0 };
    }
    // Don't POST inject during health (side-effect); verify scenarios GET instead
    if (path === "/api/chaos/inject") {
      const scenarios = await fetch(`${base}/api/chaos/scenarios`, { cache: "no-store" });
      return {
        ok: scenarios.ok,
        status: scenarios.ok ? 200 : scenarios.status,
        latency_ms: Date.now() - started,
      };
    }
    const response = await fetch(url, init);
    return {
      ok: response.ok,
      status: response.status,
      latency_ms: Date.now() - started,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      latency_ms: Date.now() - started,
      error: error instanceof Error ? error.message : "probe failed",
    };
  }
}

export async function GET(request: Request) {
  const base = apiBaseFromRequest(request);
  const checks = [];

  for (const route of API_ROUTE_CATALOG) {
    const result = await probe(base, route.method, route.path);
    checks.push({
      ...route,
      ...result,
    });
  }

  // External optional DataHub probe (best-effort, short timeout)
  let datahub: { ok: boolean; status: number; url: string } = {
    ok: false,
    status: 0,
    url: DEPLOYMENT_INFO.backend_optional.url,
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const response = await fetch(`${DEPLOYMENT_INFO.backend_optional.url}/health`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    datahub = {
      ok: response.ok,
      status: response.status,
      url: DEPLOYMENT_INFO.backend_optional.url,
    };
  } catch {
    datahub = { ok: false, status: 0, url: DEPLOYMENT_INFO.backend_optional.url };
  }

  const requiredOk = checks.filter((c) => c.required !== false).every((c) => c.ok);
  const body = {
    status: requiredOk ? "ok" : "degraded",
    version: "0.2.0",
    mode: "fixture-api",
    checked_at: new Date().toISOString(),
    deployment: DEPLOYMENT_INFO,
    datahub,
    apis: checks,
    summary: {
      total: checks.length,
      healthy: checks.filter((c) => c.ok).length,
      failed: checks.filter((c) => !c.ok).map((c) => c.path),
      required_failed: checks.filter((c) => c.required !== false && !c.ok).map((c) => c.path),
    },
  };

  return NextResponse.json(body, { status: requiredOk ? 200 : 503 });
}
