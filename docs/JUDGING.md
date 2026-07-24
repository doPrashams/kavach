# Judging Criteria Map

Explicit mapping of Kavach deliverables to hackathon scoring.

## 1. Use of DataHub (tie-breaker)

| Requirement | Implementation | Link |
|-------------|----------------|------|
| Lineage traversal | Upstream/downstream + column-level blast radius | [`backend/app/datahub/service.py`](../backend/app/datahub/service.py) |
| ML entities | Feature → model → deployment chain | [`ml/lineage.py`](../ml/lineage.py) |
| Query history | Investigator ranks causes from recent SQL | [`data/fixtures/queries.json`](../data/fixtures/queries.json) |
| Incidents | Create → resolve lifecycle | [`backend/app/agents/nodes/sentinel.py`](../backend/app/agents/nodes/sentinel.py), [`scribe.py`](../backend/app/agents/nodes/scribe.py) |
| Assertions | Detect + safeguard emit | [`examples/assertions/`](../examples/assertions/) |
| Context Documents | Read (RAG) + write (postmortem) | [`backend/app/flywheel/`](../backend/app/flywheel/) |
| MCP Server | Live tool invocation | [`backend/app/datahub/mcp.py`](../backend/app/datahub/mcp.py) |
| Analytics Agent | NL catalog Q&A + before/after write-back | [`backend/app/analytics/`](../backend/app/analytics/) |

## 2. Technical execution

- **LangGraph** 7-agent team with typed state and SSE streaming
- **Deterministic chaos** engine with inject/heal snapshots
- **Fixer** codegen + GitHub PR flow (dry-run artifacts in repo)
- **CI** — ruff, mypy, pytest (live DataHub tests skip offline)
- **Replay** — committed JSONL recordings, no API keys

Evidence: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`backend/tests/`](../backend/tests/)

## 3. Originality

- **Self-healing loop:** chaos → agents → PR → postmortem → faster next time
- **ML Guardian** ties data quality to deployment hold decisions
- **Knowledge flywheel** — postmortem RAG measurably drops MTTR
- **OSS skill** distills playbook for any agent user

Evidence: [`examples/mttr_report.json`](../examples/mttr_report.json), [`skills/datahub-incident-response/`](../skills/datahub-incident-response/)

## 4. Real-world impact

- Retail pipeline (orders → marts → demand forecast) mirrors production incident patterns
- Fixer opens real dbt PRs against [`kavach-demo-pipeline`](https://github.com/doPrashams/kavach-demo-pipeline)
- Simulated scenario library shows extensibility (healthcare PII, NYC taxi)
- Deploy runbook for VM + Vercel judge access

Evidence: [`deploy/README.md`](../deploy/README.md), [`examples/prs/`](../examples/prs/)

## 5. Presentation

- **War room UI** — React Flow blast radius, agent feed, replay controls
- **`/deck`** — animated presentation mode
- **Video script** — [`VIDEO.md`](VIDEO.md)
- **Devpost copy** — [`DEVPOST.md`](DEVPOST.md)
- **Judge outputs** — [`examples/`](../examples/) (no runtime needed)

## Bonus: OSS contribution

- Skill: [`skills/datahub-incident-response/`](../skills/datahub-incident-response/)
- Submit guide: [`handoffs/H10-skill-pr/SUBMIT.md`](handoffs/H10-skill-pr/SUBMIT.md)

## Category selections

| Devpost category | Kavach fit |
|------------------|------------|
| Cat 1 — Agentic workflow | LangGraph team + SSE war room |
| Cat 2 — Data quality | Chaos + Fixer + assertions |
| Cat 3 — ML lineage | ML Guardian + deployment hold |
| Cat 4 — Knowledge flywheel | Postmortem RAG + MTTR metrics |
