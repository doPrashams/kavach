/**
 * Smoke-test all demo API endpoints used by war-room widgets.
 * Run: pnpm smoke (or node --import tsx scripts/smoke-apis.ts)
 */
import { API_ROUTE_CATALOG } from "../lib/api-demo";

const BASE = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

async function hit(method: string, path: string): Promise<{ ok: boolean; status: number; body?: string }> {
  const url = `${BASE}${path.replace(":id", "demo-schema-drift-001")}`;
  const init: RequestInit = { method, headers: { "Content-Type": "application/json" } };
  if (method === "POST") {
    init.body = path.includes("inject")
      ? JSON.stringify({ scenario: "schema_drift", seed: 42 })
      : JSON.stringify({});
  }
  const response = await fetch(url, init);
  const body = await response.text();
  return { ok: response.ok, status: response.status, body: body.slice(0, 200) };
}

async function main() {
  console.log(`Smoke testing against ${BASE}`);
  let failed = 0;
  for (const route of API_ROUTE_CATALOG) {
    if (route.path === "/api/health") {
      // Exercise health last so it can report on others if desired
      continue;
    }
    const result = await hit(route.method, route.path);
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`${mark} ${route.method} ${route.path} → ${result.status} (${route.widget})`);
    if (!result.ok) failed += 1;
  }

  const health = await hit("GET", "/api/health");
  console.log(`${health.ok ? "PASS" : "FAIL"} GET /api/health → ${health.status}`);
  if (!health.ok) failed += 1;

  if (failed > 0) {
    console.error(`Smoke failed: ${failed} endpoint(s)`);
    process.exit(1);
  }
  console.log("Smoke passed: all widget endpoints healthy");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
