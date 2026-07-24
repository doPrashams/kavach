#!/usr/bin/env bash
# Post-deploy smoke: health, replay, deck reachable.
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

step() { echo "==> $1"; }
fail() { echo "FAIL: $1"; exit 1; }

step "backend /health"
curl -sf "${API_URL}/health" | grep -q '"status"' || fail "health check failed"

step "list recordings"
RECORDINGS=$(curl -sf "${API_URL}/recordings")
echo "$RECORDINGS" | grep -q 'recordings' || fail "no recordings endpoint"

RUN_ID=$(echo "$RECORDINGS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['recordings'][0] if d.get('recordings') else '')")
[ -n "$RUN_ID" ] || RUN_ID="chaos_schema_drift_seed42"

step "replay one run (${RUN_ID})"
curl -sf -X POST "${API_URL}/replay/${RUN_ID}" | grep -q 'events_replayed' || fail "replay failed"

step "frontend /deck (optional when FRONTEND_URL set)"
if curl -sf -o /dev/null -w "%{http_code}" "${FRONTEND_URL}/deck" | grep -qE '200|304'; then
  echo "deck ok"
else
  echo "WARN: /deck not reachable at ${FRONTEND_URL} — start frontend or set FRONTEND_URL"
fi

echo "SMOKE: PASSED"
