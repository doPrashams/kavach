#!/usr/bin/env bash
# H12 verify — submission assets.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in README.md docs/JUDGING.md docs/VIDEO.md docs/DEVPOST.md docs/handoffs/H12-submission/SUBMIT.md ; do
  [ -f "$f" ] || err "missing $f"
done

step "README covers criteria surface"
R=$(cat README.md)
echo "$R" | grep -qi "how kavach uses datahub\|uses datahub" || err "README missing DataHub usage matrix"
echo "$R" | grep -qi "quickstart" || err "README missing quickstart"
echo "$R" | grep -qiE "mermaid|architecture" || err "README missing architecture diagram"
for c in "Cat" "categor" ; do :; done
n=$(echo "$R" | grep -ciE "category|challenge 1|challenge 2|challenge 3|challenge 4|cat 1|cat 2|cat 3|cat 4")
[ "$n" -ge 1 ] || err "README does not claim challenge categories"

step "examples populated"
[ -n "$(ls -A examples 2>/dev/null | grep -v '.gitkeep')" ] || err "examples/ is empty"

step "submission doc-link check"
if command -v uv >/dev/null 2>&1; then
  (cd backend && uv run pytest -q tests/test_submission.py) || err "submission tests"
else
  (cd backend && pytest -q tests/test_submission.py) || err "submission tests"
fi

if [ "$fail" -ne 0 ]; then echo "H12 VERIFY: FAILED"; exit 1; fi
echo "H12 VERIFY: PASSED"; exit 0
