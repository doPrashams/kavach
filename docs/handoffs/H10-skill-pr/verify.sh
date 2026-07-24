#!/usr/bin/env bash
# H10 verify — datahub-incident-response skill + PR assets.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  skills/datahub-incident-response/SKILL.md skills/datahub-incident-response/README.md \
  docs/handoffs/H10-skill-pr/PR_BODY.md docs/handoffs/H10-skill-pr/SUBMIT.md ; do
  [ -f "$f" ] || err "missing $f"
done

step "SKILL.md frontmatter + capability references"
python - <<'PY' || err "SKILL.md invalid"
import re
t=open("skills/datahub-incident-response/SKILL.md").read()
assert t.lstrip().startswith("---"), "no frontmatter"
for key in ["name","description"]:
    assert re.search(rf"(?m)^{key}\s*:", t), f"frontmatter missing {key}"
low=t.lower()
for cap in ["lineage","incident","context document"]:
    assert cap in low, f"skill does not reference {cap}"
print("skill ok")
PY

step "examples referenced exist"
ls skills/datahub-incident-response/examples/* >/dev/null 2>&1 || err "no skill examples"

if [ "$fail" -ne 0 ]; then echo "H10 VERIFY: FAILED"; exit 1; fi
echo "H10 VERIFY: PASSED"; exit 0
