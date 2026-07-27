# H16 — Atlas content (site-content + logos)

**Milestone:** M5 polish · **Depends on:** H08 · **Prereqs:** network to download Simple Icons.

## Files you need to read:
1. `frontend/lib/site-content.ts`
2. `frontend/components/WarRoom.tsx`
3. `docs/ARCHITECTURE.md`
4. `README.md`
5. `frontend/public/` (create `logos/` if missing)

## Goal
Extend site content with Atlas constants (motto, stack tiles, DataHub matrix, data sources,
connections, real-vs-simulated) and ship CC0 Simple Icons SVGs under `frontend/public/logos/`.

## Deliverables
- `frontend/lib/site-content.ts` exports:
  - `ATLAS_MOTTO` (string)
  - `ATLAS_STACK` — `Array<{ id, name, logo, whatItIs, whatWeUseItFor, whereInRepo, featured? }>`
  - `ATLAS_DATAHUB_MATRIX` — DataHub capability → Kavach usage rows
  - `ATLAS_DATA_SOURCES`
  - `ATLAS_CONNECTIONS`
  - `ATLAS_REAL_VS_SIMULATED`
- `frontend/public/logos/*.svg` — at least: datahub (or custom), googlecloud, vercel, duckdb,
  dbt, mlflow, langchain (or langgraph), nextdotjs, scikitlearn, python, github
  (Simple Icons CC0; custom DataHub mark OK if SI lacks one)
- `frontend/public/logos/ATTRIBUTION.md` — list sources (Simple Icons / custom) + license CC0

## Step-by-step tasks

1. Design `ATLAS_STACK` entries with `logo` paths like `/logos/duckdb.svg`; mark DataHub
   `featured: true`.
2. Fill motto + matrix + data sources + connections + real-vs-simulated from README /
   ARCHITECTURE (accurate, concise).
3. Download Simple Icons SVGs into `frontend/public/logos/` (e.g. from
   `https://cdn.simpleicons.org/<slug>` or the SI GitHub raw paths). Prefer monochrome SVGs.
4. Write `frontend/public/logos/ATTRIBUTION.md`.
5. Do **not** build Atlas UI here (that is H17) — content + assets only.
6. Run `docs/handoffs/H16-atlas-content/verify.sh`

## Definition of done
- All `ATLAS_*` exports exist in `site-content.ts`
- `frontend/public/logos/` has ≥8 SVGs and `ATTRIBUTION.md`
- `verify.sh` exits 0
