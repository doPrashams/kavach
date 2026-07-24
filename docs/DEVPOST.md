# Devpost Submission Copy

Paste into Devpost fields. Category selections at bottom.

## Project name

**Kavach** — Self-Healing Data Platform

## Tagline

AI agents on DataHub's context graph detect, diagnose, fix, and learn from data incidents.

## Inspiration

Data incidents still mean tab-hopping: lineage in one tool, ownership in another, postmortems
in docs nobody reads. ML deployments make it worse — a bad mart column can silently poison
production models. We built Kavach to give agents **one surface** — DataHub's metadata graph —
for the full incident lifecycle.

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
- **DataHub:** MCP Server, Agent Context Kit, incidents, assertions, Analytics Agent
- **Deploy:** Docker Compose (MLflow + backend), Vercel frontend, GCP VM runbook

## Challenges

- **Graceful degradation** — every DataHub call works offline via fixtures when the VM is unreachable
- **Deterministic demos** — fixed-seed chaos + StubLLM + JSONL replay for reproducible judge experience
- **ML blast radius** — column-level lineage through features to deployment hold decisions

## Accomplishments

- 7-agent incident response team end-to-end
- 4 chaos scenarios + 2 simulated extras with committed replay recordings
- Measurable MTTR flywheel (15× faster on repeat schema_drift)
- OSS **datahub-incident-response** skill ready for upstream PR
- Judge-facing artifacts in `examples/` — PRs, postmortems, assertions, risk reports

## What's next

- Live DataHub VM integration for full MCP write-back in production
- Slack/PagerDuty comms integration
- Expand scenario library (healthcare PII, NYC taxi) with real connectors
- Merge skill to `datahub-project/datahub-skills`

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
