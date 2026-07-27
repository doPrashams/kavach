#!/usr/bin/env bash
# H21 verify — real datahub-agent-context wiring.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "pyproject has datahub-agent-context"
grep -Eq 'datahub-agent-context' backend/pyproject.toml \
  || err "backend/pyproject.toml missing datahub-agent-context"

step "context_kit.py does not call get_context_documents"
if [ -f backend/app/datahub/context_kit.py ]; then
  if grep -Eq 'get_context_documents' backend/app/datahub/context_kit.py; then
    err "context_kit.py still references get_context_documents"
  fi
else
  err "missing backend/app/datahub/context_kit.py"
fi

step "service or agents reference real tool names"
hits=0
for pat in search_documents grep_documents save_document add_terms \
           get_dataset_queries find_sql_context draft_sql_for_tables \
           build_langchain_tools; do
  if grep -REq "$pat" backend/app/datahub backend/app/agents 2>/dev/null; then
    hits=$((hits + 1))
  fi
done
[ "$hits" -ge 3 ] || err "expected >=3 real ACK tool references in datahub/agents (found $hits)"

step "no fabricated get_context_documents in agent path"
if grep -REq 'get_context_documents' backend/app/agents 2>/dev/null; then
  err "agents still reference get_context_documents"
fi

if [ "$fail" -ne 0 ]; then echo "H21 VERIFY: FAILED"; exit 1; fi
echo "H21 VERIFY: PASSED"; exit 0
