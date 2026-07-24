#!/usr/bin/env bash
# H04 verify — agent team + event bus + recorder.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  backend/app/agents/state.py backend/app/agents/llm.py backend/app/agents/graph.py \
  backend/app/events/bus.py backend/app/events/recorder.py backend/app/events/replay.py \
  backend/tests/test_agents.py backend/tests/test_events.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "agent node modules present (>=6)"
n=$(ls backend/app/agents/nodes/*.py 2>/dev/null | grep -vc __init__ || true)
[ "${n:-0}" -ge 6 ] || err "expected >=6 agent nodes, found ${n:-0}"

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/agents app/events && uv run mypy app/agents app/events) || err "lint/type"
fi

step "end-to-end graph run with StubLLM over fixtures"
if command -v uv >/dev/null 2>&1; then
  (cd backend && LLM_PROVIDER=stub uv run pytest -q tests/test_agents.py) || err "agents e2e"
else
  (cd backend && LLM_PROVIDER=stub pytest -q tests/test_agents.py) || err "agents e2e"
fi

step "record + replay deterministic, no API key"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_events.py) || err "events replay"
else
  (cd backend && pytest -q tests/test_events.py) || err "events replay"
fi

if [ "$fail" -ne 0 ]; then echo "H04 VERIFY: FAILED"; exit 1; fi
echo "H04 VERIFY: PASSED"; exit 0
