#!/usr/bin/env bash
# H01 verify — data platform + ingestion.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  data/generate_seeds.py data/pipeline.py \
  data/ingestion/datahub_recipe.dbt.yml data/ingestion/datahub_recipe.duckdb.yml \
  data/demo_pipeline_seed/dbt_project.yml data/README.md \
  backend/app/datahub/fixtures.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "seeds directory populated"
ls data/seeds/*.csv >/dev/null 2>&1 || err "no seed CSVs generated"

step "fixtures present"
ls data/fixtures/*.json >/dev/null 2>&1 || err "no fixtures captured"

RUN="uv run"; command -v uv >/dev/null 2>&1 || RUN="python -m"

step "seeds deterministic (regenerate + diff)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python "$ROOT/data/generate_seeds.py" --check) || err "seed regeneration not deterministic"
else
  (cd data && python generate_seeds.py --check) || err "seed regeneration not deterministic"
fi

step "pipeline builds warehouse + marts"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python "$ROOT/data/pipeline.py" build) || err "pipeline build failed"
else
  (cd data && python pipeline.py build) || err "pipeline build failed"
fi

step "ingestion recipes are valid YAML"
python - <<'PY' || err "recipe YAML invalid"
import sys, yaml, glob
for p in glob.glob("data/ingestion/*.yml"):
    yaml.safe_load(open(p))
print("recipes ok")
PY

step "backend tests"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_pipeline.py) || err "pytest test_pipeline"
else
  (cd backend && pytest -q tests/test_pipeline.py) || err "pytest test_pipeline"
fi

if [ "$fail" -ne 0 ]; then echo "H01 VERIFY: FAILED"; exit 1; fi
echo "H01 VERIFY: PASSED"; exit 0
