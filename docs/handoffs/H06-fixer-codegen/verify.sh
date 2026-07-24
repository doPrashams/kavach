#!/usr/bin/env bash
# H06 verify — Fixer codegen + PR flow (dry-run when no PAT).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in backend/app/fixer/codegen.py backend/app/fixer/github.py backend/tests/test_fixer.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/fixer && uv run mypy app/fixer) || err "lint/type"
fi

step "fixer tests (all scenarios, dry-run artifacts)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && LLM_PROVIDER=stub uv run pytest -q tests/test_fixer.py) || err "fixer tests"
else
  (cd backend && LLM_PROVIDER=stub pytest -q tests/test_fixer.py) || err "fixer tests"
fi

step "example PRs generated for four scenarios"
for s in freshness_lag schema_drift null_spike value_corruption ; do
  [ -d "examples/prs/${s}" ] || err "missing examples/prs/${s}"
done

if [ "$fail" -ne 0 ]; then echo "H06 VERIFY: FAILED"; exit 1; fi
echo "H06 VERIFY: PASSED"; exit 0
