# Devpost Submission Copy

Paste into Devpost fields. Category selections at bottom.

## Project name

**Kavach** — Self-Healing Data Platform

## Tagline

AI agents on DataHub's context graph detect, diagnose, fix, and learn from data incidents.

## Inspiration

Data incidents still mean tab-hopping: lineage in one tool, ownership in another, postmortems
in docs nobody reads. ML deployments make it worse — a bad mart column can silently poison
production models. The same class of failure in a clinical code column is not a dashboard
problem — it is a patient-safety problem. We built Kavach for **health for systems and health
for humans**: one agent team on DataHub's context graph for retail/ML reliability and PHI
governance alike.

## What it does

1. **Detect** — Sentinel confirms anomalies via DataHub assertions and opens incidents
2. **Diagnose** — Investigator + Impact Analyst traverse lineage and query history
3. **Protect ML** — ML Guardian assesses deployment risk and recommends holds
4. **Fix** — Fixer generates dbt PRs with safeguard tests
5. **Learn** — Scribe writes postmortems to Context Documents; repeat incidents resolve faster

The **war room UI** streams agent events over SSE. **Replay mode** runs committed recordings
with zero API keys for judges.

## How we built it

- **Backend:** FastAPI + LangGraph agent team + chaos engine + Fixer codegen
- **Data platform:** DuckDB + dbt retail pipeline with DataHub ingestion
- **ML:** scikit-learn demand forecast with full ML lineage in DataHub
- **Frontend:** Next.js war room (React Flow blast radius) + `/deck` presentation mode
- **DataHub:** real MCP Server (JSON-RPC / Streamable HTTP), Agent Context Kit
  (`datahub-agent-context` + LangChain tools), Skills, incidents, assertions, glossary write-back
- **Deploy:** Docker Compose (MLflow + backend + mcp-server-datahub), Vercel frontend
  ([kavach-self.vercel.app](https://kavach-self.vercel.app)), GCP OSS quickstart for build,
  DataHub Cloud trial planned for judging (Ask DataHub)

## Challenges

- **Speak real MCP** — replaced a fake `/mcp/tools` client with JSON-RPC initialize + tools/call
- **Declared simulation** — LIVE / REPLAY / DEMO badge; fixtures labeled honestly for judges
- **ML blast radius** — column-level lineage through features to deployment hold decisions

## Accomplishments

- 7-agent incident response team end-to-end with real ACK tools (`get_dataset_queries`,
  `draft_sql_for_tables`, mutations)
- Retail + healthcare domains (systems / humans) including `phi_exposure` governance scenario
- Atlas ("How Kavach works") — logo grid + DataHub READ/WRITE matrix for judges
- OSS skill PR: https://github.com/datahub-project/datahub-skills/pull/61
- Judge-facing `examples/` — PRs, postmortems, assertions, redacted MCP transcripts

## What's next

- Start DataHub Cloud 21-day trial Aug 10–11 for judging + Ask DataHub beat
- Record 3-min video; submit Devpost early; join `#agent-hackathon`
- Merge skill PR; optional healthcare DuckDB warehouse seed (H25)

## Built with

Python, FastAPI, LangGraph, DuckDB, dbt, scikit-learn, MLflow, Next.js, React, DataHub,
TypeScript, Docker, Vercel

## DataHub usage (explicit)

| Feature | Usage |
|---------|-------|
| Lineage | Root-cause + blast radius traversal |
| ML entities | Deployment hold decisions |
| Incidents | Open/resolve lifecycle |
| Context Documents | Postmortem RAG + write-back |
| Assertions | Detection + safeguards |
| Query history | Cause ranking |
| Analytics Agent | NL catalog Q&A |
| MCP Server | Live agent tool calls |

## Category selections (check all that apply)

- [x] **Category 1** — Agentic workflow on DataHub
- [x] **Category 2** — Data quality & reliability
- [x] **Category 3** — ML observability & lineage
- [x] **Category 4** — Knowledge management / flywheel

## Bonus

- [x] OSS contribution — `datahub-incident-response` skill ([submit guide](handoffs/H10-skill-pr/SUBMIT.md))

## Links

- Repo: https://github.com/doPrashams/kavach
- Demo pipeline: https://github.com/doPrashams/kavach-demo-pipeline
- Architecture: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Judging map: [docs/JUDGING.md](JUDGING.md)
