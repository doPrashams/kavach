#!/usr/bin/env bash
# H11 verify — deploy artifacts + replay recordings.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  deploy/docker-compose.yml deploy/README.md deploy/scripts/seed_demo.sh \
  deploy/scripts/smoke.sh deploy/VERCEL.md backend/tests/test_deploy_artifacts.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "scripts executable"
for s in deploy/scripts/seed_demo.sh deploy/scripts/smoke.sh ; do
  [ -x "$s" ] || err "$s not executable"
done

step "compose config valid"
if command -v docker >/dev/null 2>&1; then
  docker compose -f deploy/docker-compose.yml config >/dev/null || err "compose config invalid"
else
  echo "WARN: docker unavailable, skipping compose validation"
fi

step "replay recordings present for four scenarios"
for s in freshness_lag schema_drift null_spike value_corruption ; do
  ls backend/app/events/recordings/*"${s}"* >/dev/null 2>&1 || err "no recording for ${s}"
done

step "recordings replay offline"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_deploy_artifacts.py) || err "deploy artifact tests"
else
  (cd backend && pytest -q tests/test_deploy_artifacts.py) || err "deploy artifact tests"
fi

if [ "$fail" -ne 0 ]; then echo "H11 VERIFY: FAILED"; exit 1; fi
echo "H11 VERIFY: PASSED"; exit 0
