#!/usr/bin/env bash
# H16 verify — Atlas site-content exports + logos.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

SC="frontend/lib/site-content.ts"
LOGO_DIR="frontend/public/logos"

step "site-content ATLAS_* exports"
[ -f "$SC" ] || err "missing $SC"
if [ -f "$SC" ]; then
  for sym in ATLAS_MOTTO ATLAS_STACK ATLAS_DATAHUB_MATRIX ATLAS_DATA_SOURCES \
             ATLAS_CONNECTIONS ATLAS_REAL_VS_SIMULATED; do
    grep -qE "$sym" "$SC" || err "site-content missing $sym"
  done
fi

step "logos dir + SVGs (>=8) + ATTRIBUTION"
[ -d "$LOGO_DIR" ] || err "missing $LOGO_DIR"
if [ -d "$LOGO_DIR" ]; then
  n=$(find "$LOGO_DIR" -maxdepth 1 -type f -name '*.svg' | wc -l | tr -d ' ')
  [ "$n" -ge 8 ] || err "expected >=8 svgs in $LOGO_DIR, found $n"
  [ -f "$LOGO_DIR/ATTRIBUTION.md" ] || err "missing $LOGO_DIR/ATTRIBUTION.md"
fi

if [ "$fail" -ne 0 ]; then echo "H16 VERIFY: FAILED"; exit 1; fi
echo "H16 VERIFY: PASSED"; exit 0
