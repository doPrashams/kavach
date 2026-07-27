# H26 — Fixer PRs for remaining retail + media placeholders

**Milestone:** M6 · **Depends on:** H06 · **Priority:** normal · **Prereqs:** `GITHUB_PAT`
(optional — dry-run artifacts still count for partial progress).

## Goal
Run Fixer for any remaining retail chaos scenarios against `kavach-demo-pipeline` when
`GITHUB_PAT` is set. Document PRs in a README table. Capture screenshot/GIF placeholders
under `docs/media/` or `frontend/public/media/` so the submission/deck can link real visuals.

## Files you need to read:
1. `backend/app/fixer/github.py`
2. `backend/app/fixer/codegen.py`
3. `examples/prs/`
4. `README.md`
5. `docs/VIDEO.md`
6. `docs/handoffs/H06-fixer-codegen/HANDOFF.md`

## Steps
1. If `GITHUB_PAT` set: run Fixer for remaining retail scenarios (schema_drift, null_spike,
   freshness_lag, value_corruption — skip any already opened/merged). Record PR URLs.
2. Add a PR table to root `README.md` (or a short `examples/prs/README.md` linked from root)
   with scenario → PR URL / dry-run path.
3. Create `docs/media/` **or** `frontend/public/media/` with a README noting pending GIFs /
   screenshots (placeholders OK). Prefer empty dirs + README over binary bloat unless assets
   are ready.
4. Without PAT: keep dry-run `examples/prs/*` and still ship the PR table linking those paths
   plus any existing live demo-pipeline PRs.

## Deliverables
- README PR table (or links to demo-pipeline PRs).
- Media dir with README note if GIFs pending.

## Definition of done
`verify.sh` exits 0: README has a PR table or links to demo-pipeline PRs; media dir exists
with a README note when GIFs are pending.
