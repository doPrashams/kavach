#!/usr/bin/env bash
# H05 verify — chaos engine + scenarios.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in backend/app/chaos/engine.py backend/app/chaos/scenarios/base.py backend/tests/test_chaos.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "four scenarios present"
for s in freshness_lag schema_drift null_spike value_corruption ; do
  [ -f "backend/app/chaos/scenarios/${s}.py" ] || err "missing scenario ${s}.py"
done

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/chaos && uv run mypy app/chaos) || err "lint/type"
fi

step "chaos tests (determinism, heal, blast radius, agent cycle)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && LLM_PROVIDER=stub uv run pytest -q tests/test_chaos.py) || err "chaos tests"
else
  (cd backend && LLM_PROVIDER=stub pytest -q tests/test_chaos.py) || err "chaos tests"
fi

if [ "$fail" -ne 0 ]; then echo "H05 VERIFY: FAILED"; exit 1; fi
echo "H05 VERIFY: PASSED"; exit 0
