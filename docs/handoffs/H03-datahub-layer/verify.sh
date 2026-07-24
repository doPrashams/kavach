#!/usr/bin/env bash
# H03 verify — DataHub context layer.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  backend/app/datahub/client.py backend/app/datahub/mcp.py backend/app/datahub/context_kit.py \
  backend/app/datahub/models.py backend/app/datahub/service.py backend/app/datahub/README.md \
  backend/tests/test_datahub_service.py ; do
  [ -f "$f" ] || err "missing $f"
done

RUNP() { if command -v uv >/dev/null 2>&1; then (cd backend && uv run python -c "$1"); else (cd backend && python -c "$1"); fi; }

step "service imports (fixture mode)"
RUNP "from app.datahub.service import DataHubContextService; print('ok')" || err "service import failed"

step "blast radius includes ML deployment via column lineage"
RUNP "import asyncio,json
from app.datahub.service import DataHubContextService
svc=DataHubContextService()
r=asyncio.get_event_loop().run_until_complete(svc.get_blast_radius_demo())
s=json.dumps(r)
assert 'mlModelDeployment' in s or 'deployment' in s.lower(), 'ML deployment not in blast radius'
print('blast radius ok')" || err "blast radius must include ML deployment (add get_blast_radius_demo helper returning the demo corrupted-column blast radius)"

step "capability matrix lists >=8 DataHub features"
n=$(grep -Eic 'lineage|column|ml(feature|model|deployment)|quer|incident|assertion|context document|glossary|owner|domain|tag|description' backend/app/datahub/README.md)
[ "$n" -ge 8 ] || err "capability matrix too thin ($n)"

step "ruff + mypy"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run ruff check app/datahub && uv run mypy app/datahub) || err "lint/type"
fi

step "pytest (unit, fixtures)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_datahub_service.py) || err "pytest"
else
  (cd backend && pytest -q tests/test_datahub_service.py) || err "pytest"
fi

if [ "$fail" -ne 0 ]; then echo "H03 VERIFY: FAILED"; exit 1; fi
echo "H03 VERIFY: PASSED"; exit 0
