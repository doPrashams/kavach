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
    id: "data",
    target: "tour-data",
    title: "3. Live data probe — REAL data, real anomalies",
    body: "This panel queries a real public dataset (NYC TLC Yellow Taxi, 112M rows). The red rows are genuine data-quality failures in that dataset — fares of −$800, zero-passenger trips, year-2084 timestamps. Kavach isn't faking a demo; it's catching real corruption.",
  },
  {
    id: "feed",
    target: "tour-feed",
    title: "4. Agent feed — 7 specialists respond live",
    body: "Watch the team work the incident in order: Sentinel detects it → Investigator finds root cause → Impact Analyst maps blast radius → ML Guardian assesses risk → Fixer writes the patch → Scribe records the postmortem → Comms notifies owners.",
  },
  {
    id: "blast",
    target: "tour-blast",
    title: "5. Blast-radius graph — who's affected",
    body: "Column-level lineage from DataHub shows every table, dashboard, and ML deployment downstream of the failure. This is how Kavach knows the true scope before touching anything.",
  },
  {
    id: "ml",
    target: "tour-ml",
    title: "6. ML Guardian — protect production models",
    body: "When corrupted features feed a live model (schema drift, value corruption), the Guardian issues a HOLD so demand-forecast-prod stops serving on poisoned data. For low-risk incidents it says monitor, not hold.",
  },
  {
    id: "pr",
    target: "tour-pr",
    title: "7. Fixer PR — the actual remediation",
    body: "The Fixer generates a dbt patch + safeguard test and opens a real GitHub PR. value_corruption shows the actual MERGED PR (+12/−62, real commit SHA, real files); others link to the live PR list.",
  },
  {
    id: "postmortem",
    target: "tour-postmortem",
    title: "8. Postmortem — write knowledge back",
    body: "Scribe writes the incident back into DataHub as a Context Document and tags affected assets, so the NEXT agent run inherits this knowledge instead of starting from zero.",
  },
  {
    id: "analytics",
    target: "tour-analytics",
    title: "9. Ask DataHub — before vs after",
    body: "The Analytics Agent answers 'what happened to this data?' Before Kavach it only has catalog metadata; after write-back it cites the incident, root cause, and fix. Context compounds.",
  },
  {
    id: "mttr",
    target: "tour-mttr",
    title: "10. MTTR flywheel — measurable learning",
    body: "Because postmortems accumulate, repeat incidents resolve faster. The chart shows mean-time-to-resolution dropping run over run — the self-healing loop paying off.",
  },
  {
    id: "replay",
    target: "tour-replay",
    title: "11. Replay controls — deterministic re-runs",
    body: "Scrub any recorded incident frame by frame. Replay is fully deterministic (same events every time) so demos and judging never depend on a live backend or API keys.",
  },
  {
    id: "health",
    target: "tour-health",
    title: "12. Site health & Scenarios tab",
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

/** Atlas — single source of truth for “How Kavach works” (H16 content; H17 UI). */

export const ATLAS_MOTTO = [
  "Thesis: Kavach is armor for the data platform — AI agents on DataHub’s context graph that detect, diagnose, fix, and learn from incidents.",
  "Health for systems, health for humans: the same agents heal a retail warehouse and a healthcare domain.",
  "Loop: chaos breaks it → agents detect → root-cause → gate the model → open a real PR → write knowledge back.",
].join("\n");

export const ATLAS_STACK = [
  {
    id: "datahub",
    name: "DataHub",
    logo: "/logos/datahub.svg",
    whatItIs: "Open-source metadata platform — lineage, incidents, ML entities, glossary, Context Documents.",
    whatWeUseItFor:
      "The context graph agents read and write: lineage for RCA, blast radius, incidents, assertions, postmortems, glossary tags.",
    whereInRepo: "backend/app/datahub/",
    featured: true,
  },
  {
    id: "gcp",
    name: "GCP",
    logo: "/logos/googlecloud.svg",
    whatItIs: "Google Cloud — compute for the self-hosted DataHub VM.",
    whatWeUseItFor: "Hosts kavach-datahub (GMS :8080, UI :9002) for live metadata demos.",
    whereInRepo: "deploy/README.md",
  },
  {
    id: "vercel",
    name: "Vercel",
    logo: "/logos/vercel.svg",
    whatItIs: "Frontend hosting and edge/serverless for Next.js.",
    whatWeUseItFor: "Serves the war room, /deck, and fixture-backed /api routes for judges.",
    whereInRepo: "deploy/VERCEL.md",
  },
  {
    id: "duckdb",
    name: "DuckDB",
    logo: "/logos/duckdb.svg",
    whatItIs: "In-process analytical SQL warehouse.",
    whatWeUseItFor: "Retail (and seeded) warehouse that chaos injects into and agents heal.",
    whereInRepo: "data/",
  },
  {
    id: "dbt",
    name: "dbt",
    logo: "/logos/dbt.svg",
    whatItIs: "Analytics engineering toolkit — staging/marts, tests, contracts.",
    whatWeUseItFor: "Models + tests the Fixer patches; demo PRs land in kavach-demo-pipeline.",
    whereInRepo: "kavach-demo-pipeline/models/",
  },
  {
    id: "mlflow",
    name: "MLflow",
    logo: "/logos/mlflow.svg",
    whatItIs: "ML experiment tracking and model registry.",
    whatWeUseItFor: "Tracks demand-forecast training runs wired into DataHub ML lineage.",
    whereInRepo: "ml/",
  },
  {
    id: "langgraph",
    name: "LangGraph",
    logo: "/logos/langchain.svg",
    whatItIs: "Stateful multi-agent orchestration on LangChain.",
    whatWeUseItFor: "Seven-agent incident team (Sentinel → … → Comms) with typed state + SSE.",
    whereInRepo: "backend/app/agents/graph.py",
  },
  {
    id: "nextjs",
    name: "Next.js",
    logo: "/logos/nextdotjs.svg",
    whatItIs: "React App Router framework.",
    whatWeUseItFor: "War room UI, /deck pitch, and self-contained demo APIs.",
    whereInRepo: "frontend/",
  },
  {
    id: "scikit-learn",
    name: "scikit-learn",
    logo: "/logos/scikitlearn.svg",
    whatItIs: "Classical ML library for Python.",
    whatWeUseItFor: "Trains the demand-forecast model whose deployment ML Guardian can HOLD.",
    whereInRepo: "ml/train.py",
  },
  {
    id: "python",
    name: "Python",
    logo: "/logos/python.svg",
    whatItIs: "Backend language (3.12) for API, agents, chaos, and ML.",
    whatWeUseItFor: "FastAPI app, LangGraph nodes, DuckDB/dbt orchestration, Fixer codegen.",
    whereInRepo: "backend/",
  },
  {
    id: "github",
    name: "GitHub",
    logo: "/logos/github.svg",
    whatItIs: "Source control, CI, and PR workflow.",
    whatWeUseItFor: "Fixer opens real remediation PRs against kavach-demo-pipeline; CI gates the monorepo.",
    whereInRepo: "examples/prs/",
  },
] as const;

export const ATLAS_DATAHUB_MATRIX = [
  {
    capability: "MCP Server",
    access: "READ|WRITE" as const,
    path: "backend/app/datahub/mcp.py",
  },
  {
    capability: "Agent Context Kit",
    access: "READ|WRITE" as const,
    path: "backend/app/datahub/context_kit.py",
  },
  {
    capability: "Lineage (table + column)",
    access: "READ" as const,
    path: "backend/app/datahub/service.py",
  },
  {
    capability: "ML entities (feature → model → deployment)",
    access: "READ|WRITE" as const,
    path: "ml/lineage.py",
  },
  {
    capability: "Query history",
    access: "READ" as const,
    path: "data/fixtures/queries.json",
  },
  {
    capability: "Incidents",
    access: "READ|WRITE" as const,
    path: "backend/app/agents/nodes/sentinel.py",
  },
  {
    capability: "Assertions",
    access: "WRITE" as const,
    path: "examples/assertions/",
  },
  {
    capability: "Context Documents",
    access: "READ|WRITE" as const,
    path: "backend/app/flywheel/",
  },
  {
    capability: "Glossary / ownership",
    access: "READ|WRITE" as const,
    path: "backend/app/agents/nodes/comms.py",
  },
  {
    capability: "Analytics Agent",
    access: "READ" as const,
    path: "backend/app/analytics/",
  },
  {
    capability: "Skills (OSS)",
    access: "READ" as const,
    path: "skills/datahub-incident-response/",
  },
] as const;

export const ATLAS_DATA_SOURCES = [
  {
    id: "fiction-retail",
    name: "fiction-retail",
    kind: "DataHub datapack",
    license: "Apache-2.0 (hackathon resources)",
    whySafe: "Official DataHub sample retail metadata — safe to ingest and cite in an Apache-2.0 repo.",
    usedFor: "Primary retail catalog + lineage backdrop for chaos scenarios.",
  },
  {
    id: "healthcare",
    name: "healthcare",
    kind: "DataHub datapack",
    license: "Apache-2.0 (hackathon resources)",
    whySafe: "Synthetic patient metadata (~55k records) with planted DQ issues — no real PHI.",
    usedFor: "Second domain: health for humans (PII exposure / clinical null spikes).",
  },
  {
    id: "nyc-taxi",
    name: "nyc-taxi",
    kind: "DataHub datapack",
    license: "Apache-2.0 (hackathon resources)",
    whySafe: "Official DataHub taxi metadata pack — catalog only, no proprietary rows.",
    usedFor: "Taxi-domain freshness / SLA catalog context alongside live TLC probes.",
  },
  {
    id: "nyc-tlc",
    name: "NYC TLC Yellow Taxi",
    kind: "Public trip data",
    license: "NYC Open Data / TLC terms (public)",
    whySafe: "City-published trip records; we cite anomalies that already exist in the feed.",
    usedFor: "Live data probe in the war room (negative fares, zero passengers, bad timestamps).",
  },
] as const;

export const ATLAS_CONNECTIONS = [
  {
    id: "mcp-endpoint",
    label: "MCP endpoint",
    detail:
      "Live tools target {DATAHUB_GMS_URL}/mcp when set; otherwise fixtures power offline demos.",
    value: "http://34.60.67.85:8080/mcp (self-hosted GMS)",
    whereConfigured: "backend/app/datahub/mcp.py",
  },
  {
    id: "hosting-mode",
    label: "Self-hosted vs cloud",
    detail:
      "Default demo uses OSS self-hosted DataHub on GCP. DataHub Cloud (Ask DataHub) is optional / trial-only.",
    value: "Self-hosted OSS (GCP VM) · Cloud trial optional",
    whereConfigured: "deploy/README.md",
  },
  {
    id: "cursor-mcp",
    label: "Cursor mcp.json",
    detail:
      "Repo ships .cursor/mcp.json wired to env vars (DATAHUB_GMS_URL, DATAHUB_TOKEN) — never hardcoded secrets.",
    value: ".cursor/mcp.json (env-driven)",
    whereConfigured: ".cursor/mcp.json",
  },
  {
    id: "mutations",
    label: "Mutations",
    detail:
      "Write path enabled when live: incidents, tags, glossary, Context Documents, assertions. Fixture mode appends to writeback.jsonl.",
    value: "TOOLS_IS_MUTATION_ENABLED / live GMS token",
    whereConfigured: "backend/app/datahub/service.py",
  },
] as const;

export const ATLAS_REAL_VS_SIMULATED = [
  {
    id: "schema_drift",
    label: "Schema drift (supplier qty rename)",
    kind: "real" as const,
    note: "Deterministic chaos on DuckDB/dbt retail warehouse; Fixer PR artifacts in examples/prs/.",
  },
  {
    id: "null_spike",
    label: "Null spike on orders.customer_id",
    kind: "real" as const,
    note: "Injected nulls in the retail pipeline; agents remediate with tests + PR.",
  },
  {
    id: "value_corruption",
    label: "Value corruption in order_items.unit_price",
    kind: "real" as const,
    note: "War-room probe also shows genuine NYC TLC negative fares; Fixer PR merged in demo-pipeline.",
  },
  {
    id: "freshness_lag",
    label: "Freshness lag on upstream orders feed",
    kind: "real" as const,
    note: "Stalled partition + freshness SLA on the retail feed.",
  },
  {
    id: "healthcare_pii",
    label: "Healthcare PII exposure",
    kind: "simulated" as const,
    note: "Declared simulation — synthetic patients / no real PHI; labeled in UI and fixtures.",
  },
  {
    id: "nyc_taxi_freshness",
    label: "NYC taxi freshness SLA breach",
    kind: "simulated" as const,
    note: "Declared simulation for the scenario path; TLC probe rows themselves are real public data.",
  },
] as const;
