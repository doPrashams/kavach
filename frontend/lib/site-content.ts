/** Site copy for sidebar, tour, and /api/site/guide */

export const SITE_INSTRUCTIONS = [
  {
    step: 1,
    title: "Pick a chaos scenario",
    body: "Use the Chaos panel to choose schema drift, null spike, value corruption, or freshness lag.",
  },
  {
    step: 2,
    title: "Inject Chaos",
    body: "Click Inject Chaos. Kavach runs the agent team against the incident (replay mode on this demo).",
  },
  {
    step: 3,
    title: "Watch the war room",
    body: "Follow the live agent feed, blast-radius graph, ML Guardian risk, Fixer PR, and postmortem cards.",
  },
  {
    step: 4,
    title: "Replay & Ask DataHub",
    body: "Use Replay to scrub a recording, or Ask DataHub to see before/after context after write-back.",
  },
  {
    step: 5,
    title: "Open the deck",
    body: "Visit /deck for the animated pitch used for hackathon judging.",
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
    title: "Chaos panel",
    body: "Inject a seeded failure into the retail pipeline. On this hosted demo, injection triggers a recorded agent run so judges need zero API keys.",
  },
  {
    id: "replay",
    target: "tour-replay",
    title: "Replay controls",
    body: "Scrub through a recorded incident. Replay is deterministic — the same events every time.",
  },
  {
    id: "feed",
    target: "tour-feed",
    title: "Agent feed",
    body: "Seven specialists light up in order: Sentinel → Investigator → Impact Analyst → ML Guardian → Fixer → Scribe → Comms.",
  },
  {
    id: "blast",
    target: "tour-blast",
    title: "Blast-radius graph",
    body: "Column-level lineage shows which tables, dashboards, and ML deployments are in the blast radius.",
  },
  {
    id: "ml",
    target: "tour-ml",
    title: "ML Guardian",
    body: "Gates the production forecast model when upstream features are corrupted (Challenge category 3).",
  },
  {
    id: "pr",
    target: "tour-pr",
    title: "Fixer PR",
    body: "Generated dbt patch + GitHub PR against kavach-demo-pipeline (real PRs when GITHUB_PAT is set).",
  },
  {
    id: "postmortem",
    target: "tour-postmortem",
    title: "Postmortem",
    body: "Scribe writes the incident back into DataHub as Context Documents so the next agent inherits the knowledge.",
  },
  {
    id: "analytics",
    target: "tour-analytics",
    title: "Ask DataHub",
    body: "Before/after demo: Analytics Agent answers improve after Kavach’s write-back.",
  },
  {
    id: "mttr",
    target: "tour-mttr",
    title: "MTTR flywheel",
    body: "Repeat incidents resolve faster as postmortems accumulate — measurable learning loop.",
  },
  {
    id: "health",
    target: "tour-health",
    title: "Site health",
    body: "Live status of every demo API route and where the site is deployed (Vercel + optional DataHub VM).",
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
