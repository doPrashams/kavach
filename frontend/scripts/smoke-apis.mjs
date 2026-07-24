/**
 * Smoke-test all demo API endpoints used by war-room widgets.
 * Run: SMOKE_BASE_URL=https://kavach-self.vercel.app pnpm smoke
 */

const BASE = process.env.SMOKE_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const API_ROUTE_CATALOG = [
  { method: "GET", path: "/api/health", widget: "Site health" },
  { method: "GET", path: "/api/site/guide", widget: "Sidebar guide" },
  { method: "GET", path: "/api/chaos/scenarios", widget: "Chaos panel" },
  { method: "POST", path: "/api/chaos/inject", widget: "Inject Chaos" },
  { method: "GET", path: "/api/runs/:id", widget: "Run state / cards" },
  { method: "GET", path: "/api/fixes/:id", widget: "PR card" },
  { method: "GET", path: "/api/recordings", widget: "Replay controls" },
  { method: "POST", path: "/api/replay/:id", widget: "Replay" },
  { method: "GET", path: "/api/flywheel/mttr", widget: "MTTR chart" },
  { method: "GET", path: "/api/analytics/before-after", widget: "Ask DataHub" },
];

async function hit(method, path) {
  const url = `${BASE}${path.replace(":id", "demo-schema-drift-001")}`;
  const init = { method, headers: { "Content-Type": "application/json" } };
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
    const result = await hit(route.method, route.path);
    const mark = result.ok ? "PASS" : "FAIL";
    console.log(`${mark} ${route.method} ${route.path} → ${result.status} (${route.widget})`);
    if (!result.ok) failed += 1;
  }

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
