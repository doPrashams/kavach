#!/usr/bin/env bash
# H25 verify — healthcare seeds OR metadata-only STATUS fallback.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

STATUS=docs/handoffs/H25-healthcare-warehouse/STATUS.md

step "healthcare seeds OR STATUS=metadata-only"
seed_ok=0
# Accept common layouts
if find data -type f \( -iname '*health*' -o -iname '*patient*' -o -iname '*phi*' \) \
    \( -name '*.csv' -o -name '*.sql' -o -name '*.yml' -o -name '*.yaml' \) 2>/dev/null \
    | grep -Eq .; then
  seed_ok=1
  echo "found healthcare-related seed/model files under data/"
fi

if [ -d data/seeds/healthcare ] && find data/seeds/healthcare -type f 2>/dev/null | grep -Eq .; then
  seed_ok=1
fi

meta_ok=0
if [ -f "$STATUS" ] && grep -Eq 'STATUS[[:space:]]*=[[:space:]]*metadata-only' "$STATUS"; then
  meta_ok=1
  echo "STATUS.md declares metadata-only fallback"
fi

if [ "$seed_ok" -eq 0 ] && [ "$meta_ok" -eq 0 ]; then
  err "need healthcare seed files under data/ OR $STATUS with STATUS=metadata-only"
fi

if [ "$fail" -ne 0 ]; then echo "H25 VERIFY: FAILED"; exit 1; fi
echo "H25 VERIFY: PASSED"; exit 0
