#!/usr/bin/env bash
# H18 verify — OSS bonus prep (skill + PR docs + status). Does NOT require PR opened.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "skill SKILL.md"
[ -f skills/datahub-incident-response/SKILL.md ] \
  || err "missing skills/datahub-incident-response/SKILL.md"

step "PR body or DOCS_PR"
if [ -f docs/handoffs/H10-skill-pr/PR_BODY.md ] \
   || [ -f docs/handoffs/H18-oss-bonus/DOCS_PR.md ]; then
  echo "OK: PR_BODY and/or DOCS_PR present"
else
  err "need docs/handoffs/H10-skill-pr/PR_BODY.md or docs/handoffs/H18-oss-bonus/DOCS_PR.md"
fi

step "SUBMIT checklist"
if [ -f docs/handoffs/H18-oss-bonus/SUBMIT.md ] \
   || [ -f docs/handoffs/H10-skill-pr/SUBMIT.md ]; then
  echo "OK: SUBMIT checklist present"
else
  err "missing H18 or H10 SUBMIT.md"
fi

step "STATUS.md pending|opened|url"
STATUS="docs/handoffs/H18-oss-bonus/STATUS.md"
[ -f "$STATUS" ] || err "missing $STATUS"
if [ -f "$STATUS" ]; then
  if grep -qiE '^(pending|opened|url:)' "$STATUS" \
     || grep -qiE '\b(pending|opened|url:https?://)\b' "$STATUS"; then
    echo "OK: STATUS documents pending|opened|url"
  else
    err "STATUS.md must contain pending|opened|url:<pr-url>"
  fi
fi

if [ "$fail" -ne 0 ]; then echo "H18 VERIFY: FAILED"; exit 1; fi
echo "H18 VERIFY: PASSED"; exit 0
