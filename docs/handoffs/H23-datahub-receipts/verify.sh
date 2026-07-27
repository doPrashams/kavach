#!/usr/bin/env bash
# H23 verify — MCP transcripts + redaction + no Bearer leaks.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

TX=examples/datahub-transcripts

step "examples/datahub-transcripts exists"
[ -d "$TX" ] || err "missing $TX/"
if [ -d "$TX" ]; then
  n=$(find "$TX" -type f ! -name '.gitkeep' | wc -l | tr -d ' ')
  [ "$n" -ge 1 ] || err "$TX has no transcript files"
fi

step "redaction function or comment present"
if grep -REqi 'redact_|redact |Authorization|strip.*bearer|redact.*header' \
    backend/app/datahub 2>/dev/null; then
  :
else
  err "no redaction helper/comment under backend/app/datahub"
fi

step "no Bearer tokens in committed transcripts"
if [ -d "$TX" ]; then
  if grep -REqi 'Bearer[[:space:]]+[A-Za-z0-9._\-+=/]{8,}' "$TX" 2>/dev/null; then
    err "Bearer token-like string found in $TX"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "H23 VERIFY: FAILED"; exit 1; fi
echo "H23 VERIFY: PASSED"; exit 0
