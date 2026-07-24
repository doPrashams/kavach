# H00 — Scaffold monorepo + CI

**Milestone:** M1 · **Depends on:** nothing · **Prereqs env:** none

## Goal
Create the full repository skeleton, tooling, and CI so every later handoff drops into a
known structure with green lint/test gates. No business logic yet — just a clean, running,
tested skeleton that `verify.sh` proves is healthy.

## Context recap (so you need no prior chat)
Kavach is a self-healing data platform run by a team of AI agents on DataHub's context graph.
This repo (`kavach`) is a monorepo: Python FastAPI backend, Next.js frontend, dbt/DuckDB data
platform, chaos engine, and a docker-compose that runs DataHub + MLflow + backend. Read
`docs/handoffs/CONVENTIONS.md` for versions and layout — follow it exactly.

## Deliverables (exact files)

### Backend (`backend/`)
- `backend/pyproject.toml` — project `kavach-backend`, Python `3.12`, dependencies pinned per
  CONVENTIONS §3, with `[project.optional-dependencies] dev` = pytest, pytest-asyncio, ruff,
  mypy. Configure `ruff` (line-length 100, select `E,F,I,UP,B`) and `mypy` (strict on
  `app`) in this file.
- `backend/app/__init__.py` — exports `__version__ = "0.1.0"`.
- `backend/app/config.py` — `pydantic-settings` `Settings` class reading every env var from
  CONVENTIONS §6, all optional with sane defaults; `get_settings()` cached with
  `functools.lru_cache`.
- `backend/app/logging.py` — `configure_logging()` using structlog (JSON in prod, console in
  dev based on `settings.env`).
- `backend/app/errors.py` — base `KavachError` + `ConfigError`, `DataHubError`,
  `AgentError`, `FixerError` subclasses.
- `backend/app/main.py` — FastAPI app; `GET /health` → `{"status":"ok","version":__version__}`;
  calls `configure_logging()` on startup; CORS allowing the frontend origin.
- `backend/tests/test_health.py` — uses `fastapi.testclient`, asserts `/health` returns 200
  and correct payload.
- `backend/tests/test_config.py` — asserts defaults load and env override works.

### Frontend (`frontend/`)
- Minimal Next.js 15 App Router + TypeScript (strict) + Tailwind + shadcn/ui init.
- A single page `app/page.tsx` rendering "Kavach — self-healing data platform" and a health
  badge that fetches `NEXT_PUBLIC_API_URL/health` (default `http://localhost:8000`).
- `package.json` scripts: `dev`, `build`, `lint`, `typecheck` (`tsc --noEmit`).
- It must `pnpm build` and `pnpm typecheck` cleanly. Keep it tiny — real UI is H08.

### Deploy (`deploy/`)
- `deploy/docker-compose.yml` — services: `datahub` (placeholder using the official DataHub
  quickstart compose include or a documented `# TODO wired in H11` stub that still validates
  with `docker compose config`), `mlflow` (`ghcr.io/mlflow/mlflow` or `python -m mlflow server`),
  `backend` (builds `../backend`, exposes 8000, reads `.env`). It must pass
  `docker compose -f deploy/docker-compose.yml config` (valid schema) even if not all images
  are pulled.
- `deploy/.env.example` — every var from CONVENTIONS §6 with placeholder values.
- `backend/Dockerfile` — python:3.12-slim, installs via `uv`, runs uvicorn.

### Repo root
- `.gitignore` — Python, Node, `.env`, `.venv`, `__pycache__`, `duckdb`/`*.duckdb`, `mlruns/`,
  `.next/`, `node_modules/`.
- `README.md` — project one-liner, tagline, 60-second quickstart (backend + frontend + compose),
  and a "How Kavach uses DataHub" placeholder section.
- `docs/ARCHITECTURE.md` — paste the architecture mermaid diagram from the plan + a short
  component description (backend, agents, chaos, datahub layer, frontend).
- `.github/workflows/ci.yml` — two jobs: `backend` (setup uv, `ruff check`, `mypy app`,
  `pytest`) and `frontend` (setup pnpm, `pnpm install`, `pnpm lint`, `pnpm typecheck`,
  `pnpm build`). Trigger on push + PR.
- `examples/.gitkeep`, `skills/.gitkeep`.

## Step-by-step
1. Read CONVENTIONS.md.
2. Create `backend/` with `uv` (`uv init` style `pyproject.toml`), add deps, write the app
   modules and tests above. Run `uv run ruff check`, `uv run mypy app`, `uv run pytest` — all green.
3. Create `frontend/` (`pnpm create next-app` non-interactive, TS + Tailwind + App Router),
   trim to the single page, init shadcn/ui, ensure `pnpm lint && pnpm typecheck && pnpm build`.
4. Create `deploy/`, root files, CI workflow, docs.
5. Assert git identity is repo-local `doprashams@gmail.com` (verify.sh does this).
6. Run `bash docs/handoffs/H00-scaffold/verify.sh` until it exits 0.
7. Commit `H00: scaffold monorepo + CI`, tick PROGRESS.md.

## Definition of done
`docs/handoffs/H00-scaffold/verify.sh` exits 0. That means: backend lint+type+tests green,
frontend lint+typecheck+build green, docker compose config valid, required files exist, and
git identity is correct.
