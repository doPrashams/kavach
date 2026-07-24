# H11 — Deploy (VM + Vercel) + seed replay runs

**Milestone:** M5 · **Depends on:** H00–H09 · **Prereqs env:** VM provisioned (GCP) with
DataHub reachable; Vercel account linked (human). Verify passes offline (artifacts + config).

## Goal
Make Kavach runnable by judges: finalize the docker-compose stack for the DataHub VM, deploy
the frontend + `/deck` to Vercel, and pre-record replay runs for all scenarios so the demo
works with zero API keys.

## Context recap
The DataHub VM (M0/M3 infra) hosts DataHub quickstart + MLflow + backend. Frontend deploys to
Vercel Hobby ($0). Replay recordings (H04) let judges watch real runs without keys.

## Deliverables
- `deploy/docker-compose.yml` — finalized: DataHub quickstart (pinned versions) + MLflow +
  backend, healthchecks, `.env`-driven, one-command `docker compose up`. Must pass
  `docker compose config`.
- `deploy/README.md` — VM setup runbook: provision, `docker compose up`, run H01 ingestion +
  H02 lineage, create DataHub PAT, set backend `.env`, expose token-protected endpoint.
- `deploy/scripts/seed_demo.sh` — one script that: builds the platform (H01), trains + registers
  ML (H02), runs each chaos scenario end-to-end (H05) recording them (H04), and stores
  recordings under `backend/app/events/recordings/` committed for replay.
- `frontend/vercel.json` (if needed) + `deploy/VERCEL.md` — human steps to link Vercel to
  `doPrashams/kavach`, set `NEXT_PUBLIC_API_URL`, deploy `/` + `/deck`.
- `deploy/scripts/smoke.sh` — post-deploy smoke: `/health`, one replay run, `/deck` renders.
- Committed replay recordings for all four scenarios (+ the two simulated extras).
- Tests: `test_deploy_artifacts.py` — compose config valid; seed_demo referenced scripts exist;
  recordings present and replayable (replay produces the expected final IncidentState offline).

## Definition of done
`verify.sh` exits 0: compose config valid; `seed_demo.sh` + `smoke.sh` exist and are
executable; replay recordings for all four scenarios exist and replay to a complete
IncidentState offline (no API key); deploy docs present. Live VM/Vercel deploy are human steps
documented in the READMEs (not required for verify).
