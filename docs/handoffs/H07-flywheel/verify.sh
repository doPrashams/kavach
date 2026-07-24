#!/usr/bin/env bash
# H07 verify — knowledge flywheel (RAG + MTTR).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in backend/app/flywheel/store.py backend/app/flywheel/retriever.py backend/app/flywheel/mttr.py backend/tests/test_flywheel.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/flywheel && uv run mypy app/flywheel) || err "lint/type"
fi

step "flywheel tests (retrieval + MTTR drop, deterministic)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && LLM_PROVIDER=stub uv run pytest -q tests/test_flywheel.py) || err "flywheel tests"
else
  (cd backend && LLM_PROVIDER=stub pytest -q tests/test_flywheel.py) || err "flywheel tests"
fi

if [ "$fail" -ne 0 ]; then echo "H07 VERIFY: FAILED"; exit 1; fi
echo "H07 VERIFY: PASSED"; exit 0
