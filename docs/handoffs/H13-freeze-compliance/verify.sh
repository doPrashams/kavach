#!/usr/bin/env bash
# H13 verify — freeze + license/README compliance.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "LICENSE exists"
[ -f LICENSE ] || err "missing LICENSE"

step "README Apache-2.0 badge (not MIT)"
if [ -f README.md ]; then
  grep -qE 'Apache[- ]?2\.0|license-Apache' README.md || err "README missing Apache-2.0 badge/mention"
  if grep -qiE 'badge/license-MIT|shields\.io/badge/license-MIT' README.md; then
    err "README still has MIT license badge"
  fi
  if grep -qiE '\(add if missing\)' README.md; then
    err "README still contains '(add if missing)'"
  fi
else
  err "missing README.md"
fi

step "tag v1-milestone-ui"
if git rev-parse -q --verify refs/tags/v1-milestone-ui >/dev/null 2>&1; then
  echo "OK: tag v1-milestone-ui exists"
else
  echo "NOTE: tag v1-milestone-ui pending (create after freeze commit)"
fi

if [ "$fail" -ne 0 ]; then echo "H13 VERIFY: FAILED"; exit 1; fi
echo "H13 VERIFY: PASSED"; exit 0
