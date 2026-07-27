#!/usr/bin/env bash
# H26 verify — PR table in README + media dir placeholders.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "README has PR table or links to demo-pipeline PRs"
pr_ok=0
if grep -Eqi 'demo-pipeline|kavach-demo-pipeline|github.com/.*/pull' README.md 2>/dev/null; then
  pr_ok=1
fi
if grep -Eqi '\|.*[Pp][Rr].*\|' README.md 2>/dev/null \
   && grep -Eqi 'schema_drift|null_spike|freshness|value_corruption|Fixer' README.md 2>/dev/null; then
  pr_ok=1
fi
if [ -f examples/prs/README.md ] \
   && grep -Eqi 'pull|PR|demo-pipeline' examples/prs/README.md 2>/dev/null \
   && grep -Eq 'examples/prs' README.md 2>/dev/null; then
  pr_ok=1
fi
[ "$pr_ok" -eq 1 ] || err "README.md needs a PR table or links to demo-pipeline / Fixer PRs"

step "media dir exists"
media_ok=0
for d in docs/media frontend/public/media; do
  if [ -d "$d" ]; then
    media_ok=1
    if [ ! -f "$d/README.md" ]; then
      # allow any note file
      if ! ls "$d"/*.[Gg][Ii][Ff] "$d"/*.[Pp][Nn][Gg] "$d"/*.[Ww][Ee][Bb][Pp] \
            "$d"/*.[Mm][Dd] 2>/dev/null | grep -Eq .; then
        err "$d exists but has no README note or media files"
      fi
    else
      echo "found $d/README.md"
    fi
  fi
done
[ "$media_ok" -eq 1 ] || err "missing docs/media/ or frontend/public/media/"

if [ "$fail" -ne 0 ]; then echo "H26 VERIFY: FAILED"; exit 1; fi
echo "H26 VERIFY: PASSED"; exit 0
