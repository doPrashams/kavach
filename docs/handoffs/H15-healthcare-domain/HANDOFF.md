# H15 — Healthcare domain (systems | humans) + scenarios

**Milestone:** M5 polish · **Depends on:** H05, H08 · **Prereqs:** none for offline verify.

## Files you need to read:
1. `frontend/lib/scenarios.ts`
2. `backend/app/chaos/scenarios/base.py`
3. `backend/app/chaos/scenarios/null_spike.py`
4. `backend/app/chaos/scenarios/__init__.py`
5. `frontend/components/WarRoom.tsx`
6. `frontend/lib/site-content.ts`

## Goal
Add a **domain** axis (`systems` | `humans`) and two healthcare scenarios:
`phi_exposure` and `patient_null_spike`. Wire a WarRoom header toggle for systems/humans.
Scribe write-back for `phi_exposure` must use HIPAA glossary / PII tags.

## Deliverables
- `frontend/lib/scenarios.ts` — `domain: "systems" | "humans"` on specs; add
  `phi_exposure` and `patient_null_spike` (humans); existing ecommerce scenarios stay
  `systems` (or map sensibly)
- `backend/app/chaos/scenarios/phi_exposure.py` — mirror existing Scenario pattern
- `backend/app/chaos/scenarios/patient_null_spike.py` — mirror `null_spike.py` for patient IDs
- `backend/app/chaos/scenarios/__init__.py` — register both
- `frontend/components/WarRoom.tsx` — header toggle text for **systems** / **humans**
  (filters chaos picker / scenario list by domain)
- Scribe path: for `phi_exposure`, emit HIPAA glossary terms + PII tags on write-back
  (reuse existing scribe/tag helpers; extend only if missing)
- Update `frontend/lib/site-content.ts` only if scenario counts/copy become wrong

## Step-by-step tasks

1. Extend `ScenarioSpec` with `domain: "systems" | "humans"`.
2. Tag existing scenarios `domain: "systems"` (keep healthcare_pii if present; prefer renaming
   or aliasing toward `phi_exposure` — new ids **must** include `phi_exposure` and
   `patient_null_spike`).
3. Author frontend specs for both new scenarios (symptom/impact/agents/fix like peers).
4. Add backend modules mirroring `NullSpikeScenario` / base protocol; register in `__init__.py`.
5. WarRoom header: toggle **Systems** | **Humans** (visible text must include those words).
6. Ensure Scribe for `phi_exposure` writes HIPAA glossary + PII tags.
7. Run `docs/handoffs/H15-healthcare-domain/verify.sh`

## Definition of done
- Frontend scenarios include `phi_exposure` and `patient_null_spike` with a `domain` field
- Backend modules registered; WarRoom shows systems/humans toggle text
- `phi_exposure` Scribe path tags HIPAA/PII
- `verify.sh` exits 0
