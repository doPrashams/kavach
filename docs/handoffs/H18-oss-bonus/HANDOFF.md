# H18 — OSS bonus (skill PR + docs contribution)

**Milestone:** M5 · **Depends on:** H10 · **Prereqs:** `gh` auth; human may gate upstream PR.

## Files you need to read:
1. `skills/datahub-incident-response/SKILL.md`
2. `docs/handoffs/H10-skill-pr/PR_BODY.md`
3. `docs/handoffs/H10-skill-pr/SUBMIT.md`
4. `docs/handoffs/H18-oss-bonus/DOCS_PR.md`
5. `docs/handoffs/H18-oss-bonus/SUBMIT.md`
6. `docs/handoffs/H18-oss-bonus/STATUS.md`

## Goal
Prepare/open OSS contributions: ensure the incident-response skill package is complete, document
exact `gh` fork/PR commands, draft a second docs PR on agent write-back patterns, and track
status without requiring the upstream PR to already be opened.

## Deliverables
- Complete skill tree under `skills/datahub-incident-response/` (esp. `SKILL.md`)
- `docs/handoffs/H18-oss-bonus/SUBMIT.md` — exact `gh` commands to fork
  `datahub-project/datahub-skills` and open the skill PR (plus checklist)
- `docs/handoffs/H18-oss-bonus/DOCS_PR.md` — draft second contribution: agent write-back
  patterns (incidents, Context Documents, tags, glossary)
- `docs/handoffs/H18-oss-bonus/STATUS.md` — one of `pending` | `opened` | `url:<pr-url>`
- Reuse `docs/handoffs/H10-skill-pr/PR_BODY.md` for skill PR title/body

## Step-by-step tasks

1. Re-read H10 `PR_BODY.md` + `SUBMIT.md`; confirm skill `SKILL.md` + examples + tests exist.
2. Run skill tests if present (`skills/datahub-incident-response/test_skill.py`).
3. Author/refresh `SUBMIT.md` here with copy-paste `gh` commands (fork, clone, branch, push,
   `gh pr create`).
4. Draft `DOCS_PR.md` (title + body) for a docs contribution on agent write-back patterns.
5. Keep `STATUS.md` as `pending` until a human/agent opens the PR; then set `opened` or
   `url:https://github.com/.../pull/N`.
6. Do **not** fail the handoff if GitHub blocks the PR — document and leave STATUS pending.
7. Run `docs/handoffs/H18-oss-bonus/verify.sh`

## Definition of done
- Skill `SKILL.md` present; H10 `PR_BODY.md` or H18 `DOCS_PR.md` present; SUBMIT checklist
  present; `STATUS.md` documents pending|opened|url
- `verify.sh` exits 0 (does **not** require upstream PR already opened)
