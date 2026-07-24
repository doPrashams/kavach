# H10 — Submit datahub-incident-response to datahub-skills (human steps)

The skill is authored in this repo under `skills/datahub-incident-response/`. Verify passed
offline; opening the upstream PR requires your GitHub account.

## 1. Review locally

```bash
docs/handoffs/H10-skill-pr/verify.sh
pytest skills/datahub-incident-response/test_skill.py -q
```

Read `SKILL.md`, examples, and `PR_BODY.md`.

## 2. Fork datahub-skills

1. Open https://github.com/datahub-project/datahub-skills
2. Click **Fork** → create **`doPrashams/datahub-skills`**

## 3. Copy the skill

```bash
git clone https://github.com/doPrashams/datahub-skills.git
cd datahub-skills
git checkout -b feat/datahub-incident-response

cp -R /path/to/kavach/skills/datahub-incident-response skills/
git add skills/datahub-incident-response
git commit -m "feat(skills): add datahub-incident-response skill"
git push -u origin feat/datahub-incident-response
```

## 4. Open the PR

1. Go to https://github.com/datahub-project/datahub-skills/compare
2. Base: `datahub-project/datahub-skills:main`
3. Head: `doPrashams/datahub-skills:feat/datahub-incident-response`
4. **Title + body:** copy from [`PR_BODY.md`](PR_BODY.md) (title in the fenced block, body below)
5. Link back to Kavach in the PR description
6. Submit and monitor CI / maintainer feedback

## 5. After merge

- Update Kavach README OSS contribution link with the merged PR URL
- Mention the skill in Devpost submission (H12)
