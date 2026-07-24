#!/usr/bin/env bash
# H09 verify — Analytics Agent composed in (before/after write-back).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in backend/app/analytics/agent.py backend/app/analytics/demo.py backend/tests/test_analytics.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/analytics && uv run mypy app/analytics) || err "lint/type"
fi

step "before/after write-back delta test"
if command -v uv >/dev/null 2>&1; then
  (cd backend && LLM_PROVIDER=stub uv run pytest -q tests/test_analytics.py) || err "analytics tests"
else
  (cd backend && LLM_PROVIDER=stub pytest -q tests/test_analytics.py) || err "analytics tests"
fi

if [ "$fail" -ne 0 ]; then echo "H09 VERIFY: FAILED"; exit 1; fi
echo "H09 VERIFY: PASSED"; exit 0
