/** Site copy for sidebar, tour, and /api/site/guide */

export const SITE_INSTRUCTIONS = [
  {
    step: 1,
    title: "Read the Scenarios tab",
    body: "Open the Scenarios tab (left nav) to see the six real failure modes — what breaks, the business impact, how Kavach detects it, and the auto-fix. Start here so the incident makes sense.",
  },
  {
    step: 2,
    title: "Pick a scenario in the Chaos panel",
    body: "Top-left Chaos panel lists all six. Each is a genuine data failure (schema drift, null spike, value corruption, freshness lag, PII exposure, taxi SLA), not a canned animation.",
  },
  {
    step: 3,
    title: "Inject Chaos and watch it CRASH",
    body: "Click Inject Chaos. A red INCIDENT ACTIVE banner appears showing exactly what is breaking and the downstream impact — the pipeline is degraded, not fixed.",
  },
  {
    step: 4,
    title: "Watch the 7 agents respond in real time",
    body: "Sentinel → Investigator → Impact Analyst → ML Guardian → Fixer → Scribe → Comms light up one by one in the agent feed as they diagnose and remediate.",
  },
  {
    step: 5,
    title: "See the blast radius and ML gate",
    body: "The lineage graph highlights affected tables, dashboards, and ML deployments. ML Guardian HOLDS the production model when features are poisoned.",
  },
  {
    step: 6,
    title: "Review the fix and resolution",
    body: "The banner flips to green RESOLVED. Open the Fixer PR (real GitHub PR), read the postmortem written back to DataHub, and see MTTR drop as Kavach learns.",
  },
  {
    step: 7,
    title: "Replay, Ask DataHub, or open /deck",
    body: "Replay scrubs any recorded incident deterministically. Ask DataHub shows before/after context. /deck is the animated judging pitch.",
  },
] as const;

export const ABOUT_ME = {
  name: "Prashams (doPrashams)",
  email: "doprashams@gmail.com",
  github: "https://github.com/doPrashams",
  repo: "https://github.com/doPrashams/kavach",
  demoPipeline: "https://github.com/doPrashams/kavach-demo-pipeline",
  blurb:
    "Builder of Kavach for the DataHub Agent Hackathon — a self-healing data platform where AI agents detect, diagnose, fix, and learn from data incidents using DataHub’s context graph.",
} as const;

export const TECH_STACK = [
  { layer: "Agents", items: ["LangGraph", "DataHub MCP", "Agent Context Kit", "StubLLM / OpenAI"] },
  { layer: "Data platform", items: ["DuckDB", "dbt-duckdb", "MLflow", "scikit-learn"] },
  { layer: "Backend", items: ["Python 3.12", "FastAPI", "Pydantic v2", "pytest"] },
  { layer: "Frontend", items: ["Next.js 15", "React 19", "Tailwind", "React Flow", "framer-motion"] },
  { layer: "Infra", items: ["Vercel", "GCP DataHub VM", "Docker Compose", "GitHub Actions"] },
] as const;

export const TOUR_STEPS = [
  {
    id: "chaos",
    target: "tour-chaos",
    title: "1. Chaos panel — pick a real failure",
    body: "This is your control panel. Choose one of six genuine data incidents (schema drift, null spike, value corruption, freshness lag, PII exposure, taxi SLA breach) and click Inject Chaos. Each seeds a real, deterministic failure — not a scripted animation.",
  },
  {
    id: "incident",
    target: "tour-incident",
    title: "2. The pipeline CRASHES",
    body: "The moment you inject, a red INCIDENT ACTIVE banner appears at the top. It spells out exactly what broke (e.g. 'dbt run FAILED — column quantity not found') and the business impact. Nothing is fixed yet — this is the outage.",
  },
  {
    id: "feed",
    target: "tour-feed",
    title: "3. Agent feed — 7 specialists respond live",
    body: "Watch the team work the incident in order: Sentinel detects it → Investigator finds root cause → Impact Analyst maps blast radius → ML Guardian assesses risk → Fixer writes the patch → Scribe records the postmortem → Comms notifies owners.",
  },
  {
    id: "blast",
    target: "tour-blast",
    title: "4. Blast-radius graph — who's affected",
    body: "Column-level lineage from DataHub shows every table, dashboard, and ML deployment downstream of the failure. This is how Kavach knows the true scope before touching anything.",
  },
  {
    id: "ml",
    target: "tour-ml",
    title: "5. ML Guardian — protect production models",
    body: "When corrupted features feed a live model (schema drift, value corruption), the Guardian issues a HOLD so demand-forecast-prod stops serving on poisoned data. For low-risk incidents it says monitor, not hold.",
  },
  {
    id: "pr",
    target: "tour-pr",
    title: "6. Fixer PR — the actual remediation",
    body: "The Fixer generates a dbt patch + safeguard test and opens a real GitHub PR against kavach-demo-pipeline. Click it — value_corruption links to a real merged PR; others link to the live PR list.",
  },
  {
    id: "postmortem",
    target: "tour-postmortem",
    title: "7. Postmortem — write knowledge back",
    body: "Scribe writes the incident back into DataHub as a Context Document and tags affected assets, so the NEXT agent run inherits this knowledge instead of starting from zero.",
  },
  {
    id: "analytics",
    target: "tour-analytics",
    title: "8. Ask DataHub — before vs after",
    body: "The Analytics Agent answers 'what happened to this data?' Before Kavach it only has catalog metadata; after write-back it cites the incident, root cause, and fix. Context compounds.",
  },
  {
    id: "mttr",
    target: "tour-mttr",
    title: "9. MTTR flywheel — measurable learning",
    body: "Because postmortems accumulate, repeat incidents resolve faster. The chart shows mean-time-to-resolution dropping run over run — the self-healing loop paying off.",
  },
  {
    id: "replay",
    target: "tour-replay",
    title: "10. Replay controls — deterministic re-runs",
    body: "Scrub any recorded incident frame by frame. Replay is fully deterministic (same events every time) so demos and judging never depend on a live backend or API keys.",
  },
  {
    id: "health",
    target: "tour-health",
    title: "11. Site health & Scenarios tab",
    body: "The left nav shows live status of every API route and where the site is deployed. Open the Scenarios tab any time for a full description of all six failure modes.",
  },
] as const;

export const DEPLOYMENT_INFO = {
  frontend: {
    name: "Vercel",
    url: "https://kavach-self.vercel.app",
    routes: ["/", "/deck", "/api/health"],
  },
  backend_optional: {
    name: "GCP DataHub VM",
    url: "http://34.60.67.85:8080",
    ui: "http://34.60.67.85:9002",
    note: "Optional live DataHub; this Vercel demo is self-contained via /api fixtures.",
  },
  repos: {
    main: "https://github.com/doPrashams/kavach",
    demoPipeline: "https://github.com/doPrashams/kavach-demo-pipeline",
  },
} as const;
