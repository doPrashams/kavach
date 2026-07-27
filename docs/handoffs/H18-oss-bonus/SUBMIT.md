# H18 — Submit OSS contributions (human / gh checklist)

Skill package lives at `skills/datahub-incident-response/`. Upstream target:
`datahub-project/datahub-skills`. Do not require the PR to be open for H18 verify — update
`STATUS.md` when opened.

## Preflight

```bash
docs/handoffs/H10-skill-pr/verify.sh
docs/handoffs/H18-oss-bonus/verify.sh
# optional:
python -m pytest skills/datahub-incident-response/test_skill.py -q
```

Review `SKILL.md`, examples, and `docs/handoffs/H10-skill-pr/PR_BODY.md`.

## 1. Fork + clone (exact gh)

```bash
gh repo fork datahub-project/datahub-skills --default-branch-only --clone
cd datahub-skills
git checkout -b feat/datahub-incident-response
```

If the fork already exists:

```bash
gh repo clone doPrashams/datahub-skills
cd datahub-skills
git remote add upstream https://github.com/datahub-project/datahub-skills.git 2>/dev/null || true
git fetch upstream
git checkout -b feat/datahub-incident-response
```

## 2. Copy skill + commit

```bash
KAVACH="${KAVACH:-$HOME/Documents/GitHub/kavach}"
mkdir -p skills
cp -R "$KAVACH/skills/datahub-incident-response" skills/
git add skills/datahub-incident-response
git commit -m "feat(skills): add datahub-incident-response skill"
git push -u origin feat/datahub-incident-response
```

## 3. Open skill PR

```bash
gh pr create --repo datahub-project/datahub-skills \
  --head doPrashams:feat/datahub-incident-response \
  --title "feat(skills): add datahub-incident-response skill" \
  --body-file "$KAVACH/docs/handoffs/H10-skill-pr/PR_BODY.md"
```

Then set `docs/handoffs/H18-oss-bonus/STATUS.md` to `opened` or `url:<pr-url>`.

## 4. Second contribution (docs) — optional follow-up

Use `docs/handoffs/H18-oss-bonus/DOCS_PR.md` for a docs PR on agent write-back patterns
(target repo TBD: datahub-skills docs or datahub-project/datahub docs — prefer skills repo
docs/ if accepted; otherwise note in STATUS).

```bash
# After identifying the docs target path upstream:
gh pr create --repo datahub-project/datahub-skills \
  --title "docs: agent write-back patterns for incidents and context" \
  --body-file "$KAVACH/docs/handoffs/H18-oss-bonus/DOCS_PR.md"
```

## Checklist

- [ ] Skill `SKILL.md` + examples reviewed
- [ ] Fork `doPrashams/datahub-skills` exists
- [ ] Branch pushed
- [ ] Skill PR opened (or blocked — leave STATUS `pending` + note)
- [ ] STATUS.md updated
- [ ] Docs PR drafted (`DOCS_PR.md`); opened when ready
