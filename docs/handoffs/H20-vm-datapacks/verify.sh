#!/usr/bin/env bash
# H20 verify — VM wake + datapack RUN.md (soft on unreachable VM).
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }
warn() { echo "WARN: $1"; }

RUN=docs/handoffs/H20-vm-datapacks/RUN.md

step "RUN.md exists"
[ -f "$RUN" ] || err "missing $RUN"

if [ -f "$RUN" ]; then
  step "RUN.md has gcloud start"
  grep -Eq 'gcloud[[:space:]]+compute[[:space:]]+instances[[:space:]]+start' "$RUN" \
    || err "RUN.md missing gcloud compute instances start"

  step "RUN.md mentions kavach-datahub + zone/project"
  grep -q 'kavach-datahub' "$RUN" || err "RUN.md missing kavach-datahub"
  grep -q 'us-central1-a' "$RUN" || err "RUN.md missing us-central1-a"
  grep -q 'kavach-71704' "$RUN" || err "RUN.md missing kavach-71704"

  step "RUN.md has datapack load commands"
  grep -Eqi 'fiction-retail' "$RUN" || err "RUN.md missing fiction-retail"
  grep -Eqi 'healthcare' "$RUN" || err "RUN.md missing healthcare"
  grep -Eqi 'nyc-taxi' "$RUN" || err "RUN.md missing nyc-taxi"
  grep -Eqi 'datahub|datapack|ingest' "$RUN" || err "RUN.md missing datahub/datapack/ingest command"
fi

step "optional: instance status via gcloud"
if command -v gcloud >/dev/null 2>&1; then
  if status=$(gcloud compute instances describe kavach-datahub \
      --zone=us-central1-a --project=kavach-71704 \
      --format='get(status)' 2>/dev/null); then
    echo "instance status: $status"
  else
    warn "VM unreachable or gcloud describe failed — soft pass"
  fi
else
  warn "gcloud not installed — skipping instance status"
fi

if [ "$fail" -ne 0 ]; then echo "H20 VERIFY: FAILED"; exit 1; fi
echo "H20 VERIFY: PASSED"; exit 0
