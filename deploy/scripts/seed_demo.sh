#!/usr/bin/env bash
# Seed Kavach demo: H01 warehouse, H02 ML, chaos recordings (StubLLM, offline).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

step() { echo "==> $1"; }

step "generate seeds"
python3 data/generate_seeds.py

step "H01 — build DuckDB + dbt warehouse"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python ../data/pipeline.py build)
else
  (cd backend && python3 ../data/pipeline.py build)
fi

step "H02 — train model + register ML lineage (offline OK)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python ../ml/train.py)
  (cd backend && uv run python ../ml/lineage.py)
else
  (cd backend && python3 ../ml/train.py)
  (cd backend && python3 ../ml/lineage.py)
fi

step "record chaos + simulated scenario replays"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python ../deploy/scripts/record_scenarios.py)
else
  (cd backend && python3 ../deploy/scripts/record_scenarios.py)
fi

step "seed complete — recordings in backend/app/events/recordings/"
ls -la backend/app/events/recordings/*.jsonl
