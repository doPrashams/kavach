# H24 — Re-record MTTR honestly (real LLM when keyed)

**Milestone:** M6 · **Depends on:** H07, H11 · **Priority:** normal · **Prereqs:**
`OPENAI_API_KEY` (optional — stub path remains for no-key mode).

## Goal
Stop shipping a fabricated identical `improvement_factor: 15` for all four scenarios.
Re-record runs with a real LLM when a key is present; rewrite
`examples/mttr_report.json` with measured wall-clock, a cited human baseline, and clear
`method` / honesty labels (`measured` vs `modeled`). Fix compose so `LLM_PROVIDER` comes
from env (default `openai`), documenting stub as no-key mode only.

## Files you need to read:
1. `examples/mttr_report.json`
2. `backend/app/flywheel/mttr.py`
3. `deploy/docker-compose.yml`
4. `deploy/.env.example`
5. `deploy/scripts/record_scenarios.py`
6. `backend/app/agents/llm.py`

## Steps
1. When `OPENAI_API_KEY` is set, re-record chaos/agent runs (seed_demo / record_scenarios)
   with real LLM; commit updated recordings if materially different.
2. Rewrite `examples/mttr_report.json`:
   - Wall-clock measurements (or clearly labeled modeled estimates).
   - Cite a human baseline field.
   - Per-scenario values must not all claim identical `improvement_factor: 15` unless
     honesty `method` fields justify modeled placeholders.
   - Prefer top-level / per-scenario `method` honesty fields.
3. `deploy/docker-compose.yml`: `LLM_PROVIDER: ${LLM_PROVIDER:-openai}` (not hardcoded
   `stub`). Document in `deploy/README.md` that `LLM_PROVIDER=stub` is the no-key demo mode.
4. Keep offline StubLLM path for CI / no-key demos.

## Deliverables
- Honest `examples/mttr_report.json`.
- Compose env-driven `LLM_PROVIDER`.
- Optional refreshed recordings when key available.

## Definition of done
`verify.sh` exits 0: mttr report is not the all-15 identical pattern without honesty fields;
compose mentions `LLM_PROVIDER` without only-hardcoded stub.
