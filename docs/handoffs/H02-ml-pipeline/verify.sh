#!/usr/bin/env bash
# H02 verify — ML pipeline + ML lineage.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in ml/train.py ml/features.py ml/lineage.py ml/README.md backend/tests/test_ml.py ; do
  [ -f "$f" ] || err "missing $f"
done

step "train (deterministic)"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run python "$ROOT/ml/train.py") || err "training failed"
else
  (cd ml && python train.py) || err "training failed"
fi

step "artifacts produced"
[ -f ml/artifacts/model.pkl ] || err "model.pkl missing"
[ -f ml/artifacts/metrics.json ] || err "metrics.json missing"

step "metrics has MAE"
python - <<'PY' || err "metrics.json invalid or missing mae"
import json; m=json.load(open("ml/artifacts/metrics.json"))
assert "mae" in m, "no mae key"
print("mae", m["mae"])
PY

step "ml lineage chain valid"
python - <<'PY' || err "ml_lineage.json missing required chain"
import json, os
p="ml/fixtures/ml_lineage.json"
if not os.path.exists(p):
    print("WARN: no fixture (live mode?) — skipping strict check"); raise SystemExit(0)
d=json.load(open(p)); s=json.dumps(d)
for k in ["mlModel","mlModelDeployment","mlFeature"]:
    assert k in s, f"missing {k} in lineage payload"
print("lineage chain ok")
PY

step "backend ML tests"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_ml.py) || err "pytest test_ml"
else
  (cd backend && pytest -q tests/test_ml.py) || err "pytest test_ml"
fi

if [ "$fail" -ne 0 ]; then echo "H02 VERIFY: FAILED"; exit 1; fi
echo "H02 VERIFY: PASSED"; exit 0
