#!/usr/bin/env bash
# H17 verify — Atlas UI component mounted in WarRoom.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

ATLAS="frontend/components/Atlas.tsx"
WR="frontend/components/WarRoom.tsx"
SC="frontend/lib/site-content.ts"

step "Atlas.tsx exists"
[ -f "$ATLAS" ] || err "missing $ATLAS"

step "WarRoom imports Atlas"
[ -f "$WR" ] || err "missing $WR"
if [ -f "$WR" ]; then
  grep -qE 'Atlas' "$WR" || err "WarRoom does not reference Atlas"
  grep -qE 'from ["'\''].*Atlas|import[[:space:]]+\{?[[:space:]]*Atlas' "$WR" \
    || grep -qE 'components/Atlas|/Atlas' "$WR" \
    || err "WarRoom missing Atlas import path"
fi

step "site-content ATLAS used by Atlas.tsx"
[ -f "$SC" ] || err "missing $SC"
if [ -f "$ATLAS" ]; then
  grep -qE 'ATLAS_' "$ATLAS" || err "Atlas.tsx does not reference ATLAS_* from site-content"
  grep -qE 'site-content' "$ATLAS" || err "Atlas.tsx missing site-content import"
fi

if [ "$fail" -ne 0 ]; then echo "H17 VERIFY: FAILED"; exit 1; fi
echo "H17 VERIFY: PASSED"; exit 0
