# H10 — datahub-incident-response skill (OSS contribution)

**Milestone:** M5 · **Depends on:** H03–H07 · **Prereqs env:** none to author; the actual
upstream PR to `datahub-project/datahub-skills` is a human step (needs your approval + fork).

## Goal
Distill Kavach's incident-response capability into a reusable **DataHub Skill** and prepare a
contribution PR to `datahub-project/datahub-skills`. This targets the hackathon's bonus
criterion (OSS contribution) and appeals to the OSS-contributor judge.

## Context recap
Our agents (H04) already encode a full incident-response workflow over DataHub. A DataHub Skill
packages that workflow so anyone's agent can install it. Author the skill inside our repo under
`skills/datahub-incident-response/`, self-contained and documented, plus a ready-to-submit PR
body. Do NOT open the upstream PR automatically — write everything so the human can fork +
submit after review.

## Deliverables (`skills/datahub-incident-response/`)
- `SKILL.md` — following the datahub-skills format (frontmatter: name, description, triggers;
  body: when to use, the step-by-step incident-response procedure mapping to DataHub tools:
  detect → root-cause via lineage+queries → blast radius incl. ML → fix → write-back
  postmortem/tags/incident). Distilled from our agent prompts.
- `examples/` — 2–3 worked examples (one = the value_corruption → ML-risk case) referencing the
  real artifacts in the repo's top-level `examples/`.
- `README.md` — install + usage.
- `docs/handoffs/H10-skill-pr/PR_BODY.md` — the exact PR title + body to submit upstream,
  mapped to the skill repo's contribution guidelines, linking Kavach as the origin.
- `docs/handoffs/H10-skill-pr/SUBMIT.md` — human steps: fork `datahub-project/datahub-skills`
  under doPrashams, copy the skill dir, open PR with `PR_BODY.md`.
- Tests/lint: `test_skill.py` — `SKILL.md` has valid frontmatter (name/description/triggers),
  references real tools, and the examples paths exist.

## Definition of done
`verify.sh` exits 0: `SKILL.md` exists with valid frontmatter and references DataHub incident,
lineage, and context-document capabilities; examples exist and paths resolve; `PR_BODY.md` and
`SUBMIT.md` present; skill test passes. (Upstream PR remains a gated human action.)
