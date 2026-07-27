#!/usr/bin/env bash
# H15 verify — healthcare domain + phi_exposure / patient_null_spike.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

SC="frontend/lib/scenarios.ts"
WR="frontend/components/WarRoom.tsx"

step "frontend scenarios file"
[ -f "$SC" ] || err "missing $SC"

if [ -f "$SC" ]; then
  step "scenario ids"
  grep -qE 'phi_exposure' "$SC" || err "scenarios.ts missing phi_exposure"
  grep -qE 'patient_null_spike' "$SC" || err "scenarios.ts missing patient_null_spike"
  step "domain field"
  grep -qE 'domain' "$SC" || err "scenarios.ts missing domain field"
fi

step "WarRoom systems/humans toggle text"
[ -f "$WR" ] || err "missing $WR"
if [ -f "$WR" ]; then
  grep -qiE 'systems' "$WR" || err "WarRoom missing systems toggle text"
  grep -qiE 'humans' "$WR" || err "WarRoom missing humans toggle text"
fi

step "backend scenario modules (soft — warn if frontend-only so far)"
for f in backend/app/chaos/scenarios/phi_exposure.py \
         backend/app/chaos/scenarios/patient_null_spike.py; do
  [ -f "$f" ] || echo "NOTE: $f not present yet (implement in H15)"
done

if [ "$fail" -ne 0 ]; then echo "H15 VERIFY: FAILED"; exit 1; fi
echo "H15 VERIFY: PASSED"; exit 0
