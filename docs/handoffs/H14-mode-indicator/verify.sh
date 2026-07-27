#!/usr/bin/env bash
# H14 verify — LIVE/REPLAY/DEMO mode indicator in WarRoom.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

WR="frontend/components/WarRoom.tsx"
step "WarRoom exists"
[ -f "$WR" ] || err "missing $WR"

if [ -f "$WR" ]; then
  step "mode strings LIVE|REPLAY|DEMO"
  grep -qE 'LIVE' "$WR" || err "WarRoom missing LIVE"
  grep -qE 'REPLAY' "$WR" || err "WarRoom missing REPLAY"
  grep -qE 'DEMO' "$WR" || err "WarRoom missing DEMO"

  step "misleading Live run badge"
  # Prefer absence. Allow only if same line gates on quoted LIVE mode.
  if grep -nF 'Live run' "$WR" >/dev/null 2>&1; then
    if grep -nF 'Live run' "$WR" | grep -qE '"LIVE"|'\''LIVE'\'''; then
      echo "OK: 'Live run' gated to LIVE mode"
    else
      err "'Live run' still present — replace with LIVE/REPLAY/DEMO (or gate on LIVE)"
    fi
  else
    echo "OK: 'Live run' string removed"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "H14 VERIFY: FAILED"; exit 1; fi
echo "H14 VERIFY: PASSED"; exit 0
