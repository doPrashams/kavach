#!/usr/bin/env bash
# H24 verify — honest MTTR report + LLM_PROVIDER from env.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

MTTR=examples/mttr_report.json

step "mttr_report.json exists"
[ -f "$MTTR" ] || err "missing $MTTR"

if [ -f "$MTTR" ]; then
  step "MTTR honesty: not identical improvement_factor 15 for all four without method"
  # Count improvement_factor: 15 occurrences
  n15=$(grep -c '"improvement_factor": 15' "$MTTR" || true)
  has_method=0
  grep -Eq '"method"' "$MTTR" && has_method=1
  # Also accept honesty labels
  grep -Eqi 'measured|modeled|human_baseline|wall.clock' "$MTTR" && has_method=1

  if [ "${n15:-0}" -ge 4 ] && [ "$has_method" -eq 0 ]; then
    err "mttr_report.json still claims improvement_factor 15 for all four without method/honesty fields"
  fi
fi

step "compose: LLM_PROVIDER from env, not only hardcoded stub"
[ -f deploy/docker-compose.yml ] || err "missing deploy/docker-compose.yml"
if [ -f deploy/docker-compose.yml ]; then
  if ! grep -Eq 'LLM_PROVIDER' deploy/docker-compose.yml; then
    err "deploy/docker-compose.yml missing LLM_PROVIDER"
  fi
  # Fail if the only assignment is bare stub with no ${LLM_PROVIDER
  if grep -Eq 'LLM_PROVIDER:[[:space:]]*stub[[:space:]]*$' deploy/docker-compose.yml \
     && ! grep -Eq 'LLM_PROVIDER:[[:space:]]*\$\{LLM_PROVIDER' deploy/docker-compose.yml; then
    err "LLM_PROVIDER is hardcoded stub — use \${LLM_PROVIDER:-openai} (stub = no-key mode in docs)"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "H24 VERIFY: FAILED"; exit 1; fi
echo "H24 VERIFY: PASSED"; exit 0
