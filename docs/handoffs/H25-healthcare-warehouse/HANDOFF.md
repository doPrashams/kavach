# H25 — Healthcare warehouse seed (DROPPABLE)

**Milestone:** M6 · **Depends on:** H01, H05 · **Priority:** low / DROPPABLE · **Prereqs:**
none.

## Goal
Seed healthcare tables into DuckDB with minimal dbt so `phi_exposure` / `patient_null_spike`
can do real break/heal (not metadata-only stubs). If blocked after genuine attempts, write
`BLOCKER` + `STATUS.md` with `STATUS=metadata-only` and move on.

## Files you need to read:
1. `data/pipeline.py`
2. `data/generate_seeds.py`
3. `data/demo_pipeline_seed/dbt_project.yml`
4. `backend/app/chaos/` (scenario registry)
5. `deploy/scripts/record_scenarios.py`

## Steps
1. Add healthcare seed CSVs under `data/seeds/healthcare/` (or equivalent) with enough
   columns for PHI exposure + null-spike demos (synthetic only — no real PHI).
2. Add minimal dbt models/tests under `data/demo_pipeline_seed/` (or a small
   `data/healthcare/` project) covering:
   - `phi_exposure` break/heal surface
   - `patient_null_spike` break/heal surface
3. Wire chaos scenarios to touch those tables when present.
4. If DuckDB/dbt/time blocks you: create
   `docs/handoffs/H25-healthcare-warehouse/STATUS.md` containing
   `STATUS=metadata-only` and a short BLOCKER note; do not invent fake warehouse files.

## Deliverables (either path)
- **Preferred:** healthcare seed + dbt files enabling real break/heal.
- **Fallback:** `STATUS.md` with `STATUS=metadata-only` (+ BLOCKER in PROGRESS.md).

## Definition of done
`verify.sh` exits 0 if healthcare seed files exist **OR** `STATUS.md` declares
`STATUS=metadata-only`.
