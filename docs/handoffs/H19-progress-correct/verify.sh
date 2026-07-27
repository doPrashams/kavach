#!/usr/bin/env bash
# H19 verify — PROGRESS.md corrected for H10 caveat + H13–H26 rows.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

P="docs/handoffs/PROGRESS.md"
step "PROGRESS.md exists"
[ -f "$P" ] || err "missing $P"

if [ -f "$P" ]; then
  step "rows H13 and H21"
  grep -qE '\|[[:space:]]*H13[[:space:]]*\|' "$P" || err "PROGRESS.md missing H13 row"
  grep -qE '\|[[:space:]]*H21[[:space:]]*\|' "$P" || err "PROGRESS.md missing H21 row"

  step "H10 upstream PR not claimed done without caveat"
  # Fail if H10 line claims upstream/PR done|merged without pending/caveat nearby.
  h10="$(grep -E '\|[[:space:]]*H10[[:space:]]*\|' "$P" || true)"
  if echo "$h10" | grep -qiE 'upstream.*(done|merged|complete)|PR (done|merged|complete|opened and merged)'; then
    if echo "$h10" | grep -qiE 'pending|caveat|not (yet )?opened|awaiting'; then
      echo "OK: H10 mentions upstream completion with caveat"
    else
      err "H10 claims upstream PR done/merged without pending caveat"
    fi
  else
    echo "OK: H10 does not claim upstream PR done without caveat"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "H19 VERIFY: FAILED"; exit 1; fi
echo "H19 VERIFY: PASSED"; exit 0
