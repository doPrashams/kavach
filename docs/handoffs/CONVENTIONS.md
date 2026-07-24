# Kavach — Engineering Conventions (read before any handoff)

This file is the single source of truth for stack versions, structure, and rules.
Every handoff (`Hxx/HANDOFF.md`) assumes you have read this file first. Do not deviate.

---

## 1. Golden rules for the executing agent (Composer)

1. **Do exactly one handoff at a time**, in order, unless the RUNBOOK prompt says otherwise.
2. A handoff is DONE only when its `verify.sh` exits `0`. Never mark done on a red bar.
3. Completion ritual per handoff: `verify.sh` green → `git add -A` → `git commit` with the
   handoff ID in the subject (e.g. `H00: scaffold monorepo + CI`) → tick the row in
   `docs/handoffs/PROGRESS.md` → move to the next handoff.
4. **If blocked after 3 genuine attempts**: write a `BLOCKER` note in `PROGRESS.md`
   (what failed, the error, what you tried), then skip forward to the next independent
   handoff. Do NOT thrash or invent scope.
5. **Never invent architecture.** All design decisions are already made in the handoffs.
   If something is genuinely underspecified, choose the simplest option that satisfies
   `verify.sh`, and note the assumption in `PROGRESS.md`.
6. **No secrets in the repo, ever.** Only read secrets from environment variables / `.env`
   (which is gitignored). If a secret is missing, the code must degrade gracefully
   (skip the live call, use the recorded fixture) — never hardcode a key.
7. Keep changes scoped to the current handoff's declared file paths. Do not refactor
   unrelated code.

## 2. Identity / git (hard rule)

- Commits in this repo MUST use `doPrashams` / `doprashams@gmail.com`.
- This is set **repo-local** (not global). `H00/verify.sh` asserts it before the first commit.
- Never run `git config --global` anything. Never change the remote.

## 3. Stack versions (pin these exactly)

**Backend**
- Python `3.12`
- `fastapi` `>=0.115,<0.116`
- `uvicorn[standard]` `>=0.32,<0.33`
- `pydantic` `>=2.9,<3`
- `langgraph` `>=0.2.45,<0.3`
- `langchain-core` `>=0.3,<0.4`
- `acryl-datahub` `>=0.15,<0.16`  (DataHub Python SDK + MCP; pin at lockfile time)
- `structlog` `>=24.4`
- `httpx` `>=0.27`
- `tenacity` `>=9.0`  (retries)
- Dev: `pytest` `>=8.3`, `pytest-asyncio`, `ruff` `>=0.7`, `mypy` `>=1.13`

**Data platform**
- `duckdb` `>=1.1`
- `dbt-duckdb` `>=1.9,<1.10`
- `pandas` `>=2.2`

**ML**
- `scikit-learn` `>=1.5`
- `mlflow` `>=2.17,<3`

**Frontend**
- Next.js `15` (App Router) + React `19`
- TypeScript `5.6+`, strict mode on
- Tailwind CSS `3.4+`, `shadcn/ui`, `@xyflow/react` (React Flow) for graphs
- `framer-motion` for `/deck` animations
- Package manager: `pnpm`

**Tooling**
- Python dependency + venv manager: `uv` (fast, reproducible). Lockfile: `uv.lock`.
- Docker Compose v2 (`docker compose`, not `docker-compose`).

## 4. Repository layout (target end-state of `kavach`)

```
kavach/
  backend/
    app/
      __init__.py
      main.py                 # FastAPI app + SSE endpoints
      config.py               # pydantic-settings, reads env
      logging.py              # structlog setup
      datahub/                # H03: typed context service over MCP + Agent Context Kit
      agents/                 # H04: LangGraph team (sentinel, investigator, ...)
      chaos/                  # H05: chaos engine + scenarios
      fixer/                  # H06: codegen + GitHub PR flow
      flywheel/               # H07: postmortem RAG + MTTR metrics
      events/                 # event bus + run recorder (replay)
    tests/
    pyproject.toml
    uv.lock
  frontend/                   # H08: Next.js war room UI + /deck
  data/                       # H01: dbt project lives in the separate demo-pipeline repo;
                              #      this holds seeds/fixtures + ingestion recipes
  ml/                         # H02: training script, model artifact, MLflow config
  deploy/
    docker-compose.yml        # DataHub quickstart + MLflow + backend
    .env.example
  skills/
    datahub-incident-response/ # H10: contributed skill
  examples/                   # generated PRs, postmortems, assertions (judge-facing)
  docs/
    ARCHITECTURE.md
    handoffs/                 # this folder
  .github/workflows/ci.yml
  README.md
```

The `kavach-demo-pipeline` repo (separate) holds the dbt/DuckDB project the Fixer opens
PRs against. H01 scaffolds it; H06 wires the PR flow.

## 5. Code standards

- **Python**: fully type-hinted. `ruff` clean, `mypy` clean on `backend/app`. Google-style
  docstrings on public functions. No `print` — use `structlog`. Config only via
  `app/config.py` (pydantic-settings), never `os.environ` scattered around.
- **Async** for all I/O (DataHub, LLM, GitHub). Wrap external calls with `tenacity` retry
  (exponential backoff, max 3) and a timeout.
- **Errors**: raise typed exceptions from `app/errors.py`; never swallow silently.
- **TypeScript**: strict, no `any`. Components in `PascalCase`, hooks `useX`. Prefer server
  components; mark client components `"use client"` only when needed.
- **Tests**: every module ships with tests. External services are mocked in unit tests;
  integration tests hit the live DataHub VM only when `DATAHUB_GMS_URL` is set (else skip).
- **Determinism**: chaos scenarios and any demo data use fixed seeds. Agent runs are recorded
  to `events/recordings/` so they can be replayed with zero API keys.

## 6. Environment variables (names are contracts — do not rename)

| Var | Used by | Notes |
|-----|---------|-------|
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | agents, fixer | provider-agnostic; one required |
| `LLM_PROVIDER` | agents | `openai` \| `anthropic` (default `openai`) |
| `LLM_MODEL` | agents | e.g. `gpt-4.1` / `claude-sonnet-4` |
| `DATAHUB_GMS_URL` | datahub layer | live VM endpoint; if unset, use fixtures |
| `DATAHUB_TOKEN` | datahub layer | PAT for the VM |
| `GITHUB_PAT` | fixer | fine-grained, `kavach-demo-pipeline` only (M3) |
| `DEMO_PIPELINE_REPO` | fixer | `doPrashams/kavach-demo-pipeline` |
| `SLACK_WEBHOOK_URL` | comms | optional; if unset, in-UI notifications only |

All are read in `app/config.py`. Missing optional vars → graceful degrade + logged warning.
`deploy/.env.example` lists every var with placeholder values; `.env` is gitignored.

## 7. Definition of "meaningful DataHub use" (scoring anchor)

Every agent action must, where relevant, touch a real DataHub capability: lineage
traversal (table + column), ML entities (`dataset → mlFeature → mlModel → mlModelDeployment`),
query history, glossary/ownership/domains, incidents, assertions, and Context Documents
(read AND write via MCP Server + Agent Context Kit). Handoffs specify exactly which calls.
