# H06 — Fixer codegen + GitHub PR flow

**Milestone:** M3 · **Depends on:** H04, H05 · **Prereqs env:** `GITHUB_PAT` (fine-grained,
`kavach-demo-pipeline` only), `DEMO_PIPELINE_REPO=doPrashams/kavach-demo-pipeline`. Without
the PAT, verify runs in **dry-run** mode (generates artifacts, skips the live PR).

## Goal
Turn the Fixer node (stubbed in H04) into a real code generator that, given an incident +
blast radius, produces a merge-ready fix and opens an actual GitHub PR against
`kavach-demo-pipeline`. Fixes cover the four chaos scenarios: dbt model patch, backfill DAG
artifact, and new dbt tests/assertions. Judges see real, reviewable, merged PRs.

## Context recap
H01 seeded the dbt project content under `data/demo_pipeline_seed/`; that content is (or should
be) pushed to `kavach-demo-pipeline`. H05 injects faults; H04's graph reaches the Fixer node
with an `IncidentState`. This handoff makes the Fixer generate the diff and open the PR, then
the merge heals the pipeline (H05 `heal` mirrors the fix in the local warehouse for the demo).

## Deliverables (`backend/app/fixer/`)
- `codegen.py` — `generate_fix(incident) -> FixArtifacts`: maps each scenario to a concrete
  fix:
  - schema_drift → dbt model patch (rename/cast) + updated `schema.yml`.
  - null_spike → `where`/coalesce guard + a `not_null`-style dbt test.
  - freshness_lag → freshness assertion + a backfill DAG artifact (Airflow-style Python,
    generated as an artifact to satisfy Cat 2 breadth — not executed).
  - value_corruption → range/positive assertion + a cleaning transform + ML-safety note.
  All artifacts are deterministic given the incident (template + filled params, LLM optional
  for the human-readable PR body only; StubLLM path must produce a valid body offline).
- `github.py` — `open_pr(artifacts)`: uses `GITHUB_PAT` to create a branch, commit the diff to
  `DEMO_PIPELINE_REPO`, open a PR with a criteria-mapped body. Dry-run mode (no PAT): writes
  the branch/diff/PR-body to `examples/prs/<scenario>/` instead and returns a fake PR ref.
- `app/main.py` — wire Fixer node to call `codegen` + `github`; expose `GET /fixes/{run_id}`.
- `examples/prs/<scenario>/` — committed sample artifacts for all four scenarios (generated in
  dry-run) so judges evaluate output without running anything.
- Tests: `test_fixer.py` — each scenario yields valid `FixArtifacts` (parseable dbt SQL +
  schema.yml + tests), PR body maps to judging criteria, dry-run writes complete
  `examples/prs/*`; live PR test marked `@pytest.mark.integration` (skipped without PAT).

## Safety / scope
- PAT is fine-grained to `kavach-demo-pipeline` only. Never write to `kavach`.
- Generated dbt SQL must be syntactically valid (verify parses it).
- ML-relevant fixes (value_corruption) must include the ML Guardian's safeguard note in the PR
  body (ties the loop back to the deployment risk).

## Definition of done
`verify.sh` exits 0: `generate_fix` produces valid, deterministic artifacts for all four
scenarios; dry-run populates `examples/prs/*` with branch/diff/body; PR bodies reference the
DataHub incident + blast radius; dbt SQL parses; ruff+mypy+pytest green. Live PR creation runs
only when `GITHUB_PAT` present (else skipped, not failed).
