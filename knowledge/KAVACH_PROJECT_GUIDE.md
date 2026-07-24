# Kavach — Project Knowledge Guide

> One file to understand **what this is**, **what we built**, **how to test it**, and **what's left**.

---

## 1. What is Kavach? (one paragraph)

**Kavach** (Sanskrit: कवच — “armor/shield”) is a self-healing data platform for the [DataHub Agent Hackathon](https://datahub.devpost.com/). A chaos engine breaks a real DuckDB + dbt retail warehouse (freshness lag, schema drift, null spikes, value corruption). A team of **seven AI agents** on DataHub’s context graph detects the incident, walks lineage (including ML model risk), opens a real GitHub fix PR, writes a postmortem back into DataHub, and learns so the next similar incident resolves faster (MTTR drop). A live **war room UI** and an animated **`/deck`** presentation show it end-to-end — including **replay mode** with zero API keys for judges.

**Tagline:** *Kavach — the self-healing shield for your data platform.*

---

## 2. Is it complete?

### Built and merged (code) — YES ✅

| Area | Status |
|------|--------|
| H00–H12 handoffs (all specs + verify gates) | ✅ on `main` |
| Backend (FastAPI, agents, chaos, Fixer, flywheel, Analytics Agent) | ✅ |
| Frontend war room + `/deck` | ✅ |
| Data platform (DuckDB + dbt) + ML lineage | ✅ |
| DataHub context layer (MCP + Agent Context Kit) | ✅ |
| OSS skill package (`skills/datahub-incident-response/`) | ✅ in-repo |
| Deploy scripts + replay recordings | ✅ |
| Submission docs (README, JUDGING, VIDEO, DEVPOST) | ✅ |
| Live Fixer PR against demo pipeline | ✅ opened + **you merged** |
| Vercel production deploy (offline/replay) | ✅ live |

### Still human / submission steps — NOT DONE YET ⏳

| Step | Status | Where |
|------|--------|--------|
| Upstream skill PR to `datahub-project/datahub-skills` | ⏳ not opened yet | `docs/handoffs/H10-skill-pr/SUBMIT.md` |
| 3‑min demo video + voiceover | ⏳ you said later | `docs/VIDEO.md` |
| Devpost registration + submit | ⏳ you said later | `docs/DEVPOST.md` |
| Optional: live backend on VM behind public URL | ⏳ optional (Vercel works offline) | `deploy/README.md` |

**Bottom line:** The **product demo is complete and publicly viewable**. Hackathon **submission packaging** (video + Devpost + optional upstream skill PR) is what remains.

---

## 3. Live URLs (what you can open right now)

| Surface | URL |
|---------|-----|
| **War room (demo)** | https://kavach-self.vercel.app/ |
| **Presentation deck** | https://kavach-self.vercel.app/deck |
| **Main repo** | https://github.com/doPrashams/kavach |
| **Demo pipeline (Fixer PRs)** | https://github.com/doPrashams/kavach-demo-pipeline |
| **Example merged Fixer PR** | https://github.com/doPrashams/kavach-demo-pipeline/pull/1 |
| **DataHub UI (when VM running)** | http://34.60.67.85:9002 (user/pass: `datahub` / `datahub`) |
| **DataHub GMS API** | http://34.60.67.85:8080 |

Vercel serves the war room with **same-origin `/api/*` demo endpoints** (fixture-backed, judge-safe, no keys). **Inject Chaos** hits `POST /api/chaos/inject` and animates the agent feed. Left nav includes how-to, about, tech stack, guided tour, and live **Site health** from `GET /api/health`.

---

## 4. How to test (walkthrough)

### A. Fastest path — Vercel (5 minutes)

1. Open https://kavach-self.vercel.app/
2. Pick a chaos scenario (e.g. **value_corruption**) → **Inject Chaos** / use **Replay**
3. Watch the agent feed light up: Sentinel → Investigator → Impact Analyst → ML Guardian → Fixer → Scribe → Comms
4. Confirm blast-radius graph shows tables → marts → **ML deployment**
5. Confirm PR card / postmortem / MTTR trend appear
6. Open https://kavach-self.vercel.app/deck — flip through the animated pitch

If those screens render and interactions work, **the public demo is healthy**.

### B. Prove the real Fixer PR path (already done once)

Evidence: https://github.com/doPrashams/kavach-demo-pipeline/pull/1

That PR was opened by Kavach’s Fixer using your `GITHUB_PAT` (not a dry-run). You merged it — that closes the “real GitHub PR” judging story.

### C. Local backend + frontend (optional, for engineers)

```bash
# Terminal 1 — API (StubLLM, no keys)
cd backend
uv sync --extra dev
LLM_PROVIDER=stub uv run uvicorn app.main:app --reload --port 8000

# Terminal 2 — UI
cd frontend
pnpm install
pnpm dev
```

- API health: http://localhost:8000/health  
- War room: http://localhost:3000  
- Deck: http://localhost:3000/deck  

### D. Offline unit / e2e tests (optional)

```bash
cd backend
LLM_PROVIDER=stub uv run pytest -q
# Or per handoff:
bash docs/handoffs/H04-agent-core/verify.sh
bash docs/handoffs/H05-chaos-engine/verify.sh
```

### E. DataHub VM (optional live metadata)

```bash
export PATH="/opt/homebrew/share/google-cloud-sdk/bin:$PATH"
# Start (costs ~$0.13/hr while running)
gcloud compute instances start kavach-datahub --zone us-central1-a --project kavach-71704
# Stop when idle (do this!)
gcloud compute instances stop kavach-datahub --zone us-central1-a --project kavach-71704
```

UI: http://34.60.67.85:9002 · GMS: http://34.60.67.85:8080  
Project: `kavach-71704` · static IP reserved · **$20 budget alert** set.

---

## 5. What we built (architecture in plain English)

```
Chaos injects a fault into DuckDB/dbt
        ↓
Sentinel detects → opens DataHub incident
        ↓
Investigator walks lineage + query history
        ↓
Impact Analyst computes blast radius (tables, dashboards, ML model)
        ↓
ML Guardian flags deployment risk (Cat 3)
        ↓
Fixer generates dbt patch + opens GitHub PR (Cat 2)
        ↓
Scribe writes postmortem into DataHub Context Documents
        ↓
Flywheel: next similar incident is faster (MTTR drop) (Cat 4)
        ↓
Analytics Agent answers with the new context (DataHub product use)
```

**Stack:** Python 3.12 · FastAPI · LangGraph · DataHub MCP + Agent Context Kit · DuckDB · dbt · scikit-learn · MLflow · Next.js 15 · React Flow · Vercel · GCP VM for DataHub.

**Two GitHub repos:**
- `kavach` — the product (agents + UI + chaos)
- `kavach-demo-pipeline` — the dbt project Fixer opens PRs against

---

## 6. What we did (execution history)

### Planning
- Scoped a winning DataHub-hackathon design covering **all 4 challenge categories** + OSS bonus
- Named it **Kavach**; locked identity to **doprashams@gmail.com** for all hackathon resources
- Authored Composer-ready handoffs H00–H12 with `verify.sh` gates (`docs/handoffs/`)

### Build model
- **High model** authored specs; **Composer 2.5 Cloud Agents** implemented code
- Milestone-gated: M1 → M2 → M3 → M4 → M5, review between merges

### Milestones shipped

| Milestone | Handoffs | What landed |
|-----------|----------|-------------|
| **M1** | H00–H02 | Monorepo, CI, DuckDB/dbt retail platform, ML + DataHub ML lineage |
| **M2** | H03–H04 | DataHub context service, 7-agent LangGraph team, event bus + replay |
| **M3** | H05–H07 | Chaos engine (4 scenarios), Fixer codegen + PR artifacts, knowledge flywheel |
| **M4** | H08–H09 | War room UI + `/deck`, Analytics Agent before/after |
| **M5** | H10–H12 | Skill package, deploy/replay assets, README/JUDGING/VIDEO/DEVPOST |

### Infra + demo proof
- GCP project `kavach-71704`, VM `kavach-datahub`, DataHub quickstart populated with retail metadata
- Cost controls: **$20 budget alert**, 6h auto-shutdown, stop-when-idle, **static IP** `34.60.67.85`
- Secrets in Cursor Cloud Agents: `DATAHUB_*`, `OPENAI_*`, `GITHUB_PAT`, `DEMO_PIPELINE_REPO`
- Live Fixer PR proven; Vercel production deployed under **doprashams**

---

## 7. How Kavach uses DataHub (judging matrix)

| DataHub capability | Where it shows up |
|--------------------|-------------------|
| MCP Server (read/write) | `backend/app/datahub/mcp.py` + service |
| Agent Context Kit | `backend/app/datahub/context_kit.py` |
| Lineage (table + column) | Investigator, Impact Analyst, blast-radius graph |
| ML entities (feature → model → deployment) | H02 lineage + ML Guardian |
| Query history | Investigator root-cause |
| Incidents / tags / descriptions | Sentinel + Scribe |
| Context Documents (postmortems) | Scribe + flywheel RAG |
| Analytics Agent | H09 before/after write-back demo |
| Skills (OSS contribution) | `skills/datahub-incident-response/` |

Full criteria mapping: [`docs/JUDGING.md`](../docs/JUDGING.md).

---

## 8. What’s left for YOU (checklist)

- [ ] Skim live demo: war room + deck (done if you already opened both)
- [ ] Open upstream skill PR (optional but bonus points) — ask agent: “skill PR”
- [ ] Record 3‑min video from [`docs/VIDEO.md`](../docs/VIDEO.md)
- [ ] Fill Devpost from [`docs/DEVPOST.md`](../docs/DEVPOST.md) and submit early
- [ ] Stop the GCP VM when not demoing (saves money)

---

## 9. Key folders (map of the repo)

```
kavach/
  backend/          # FastAPI + agents + chaos + Fixer + flywheel
  frontend/         # War room + /deck (deployed to Vercel)
  data/             # Seeds, dbt seed project, DataHub ingestion recipes
  ml/               # Training + ML lineage fixtures
  deploy/           # docker-compose, Vercel notes, seed/smoke scripts
  skills/           # datahub-incident-response (OSS contribution package)
  examples/         # Judge-facing PR artifacts, dry-run outputs
  docs/handoffs/    # H00–H12 specs that Composer executed
  knowledge/        # THIS guide
```

---

## 10. One-line status for yourself

> **Kavach is built, live on Vercel in replay mode, proven with a real Fixer PR, and ready for video + Devpost. Code complete; submission packaging remains.**

Last updated: 2026-07-24
