# Kavach

**Self-healing data platform** — AI agents on DataHub's context graph detect, diagnose, and fix data incidents automatically.

## Quickstart (60 seconds)

```bash
# Backend
cd backend && uv sync --extra dev && uv run uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend && pnpm install && pnpm dev

# Full stack (DataHub stub + MLflow + backend)
cp deploy/.env.example deploy/.env
docker compose -f deploy/docker-compose.yml up --build
```

- Backend: http://localhost:8000/health
- Frontend: http://localhost:3000

## How Kavach uses DataHub

Kavach agents traverse DataHub's metadata graph for lineage, ML entities, query history,
glossary/ownership, incidents, and Context Documents. Live integration is used when
`DATAHUB_GMS_URL` is set; otherwise recorded fixtures enable offline demos and CI.

_(Detailed architecture in `docs/ARCHITECTURE.md`.)_
