# Kavach — Cloud Run RUNBOOK

This is the operator's guide. It tells the human what to paste into a Cursor Cloud Agent
(Composer 2.5) for each milestone, and tells the agent the rules of engagement.

---

## How to launch a milestone (human steps)

1. Open https://cursor.com/agents (signed into your Cursor account).
2. Repo: **`doPrashams/kavach`**. Branch: start from `main`.
3. Model: **Composer 2.5** (Standard).
4. Ensure the milestone's env secrets are set in the Cloud Agent environment (see each
   milestone below). Secrets go in the agent environment, **never in the repo**.
5. Paste the milestone prompt (below) as the agent task. Let it run. Your Mac can sleep.
6. When it finishes, review the milestone branch: read `docs/handoffs/PROGRESS.md` and skim
   the per-handoff commits. Merge to `main` when satisfied (or ask the planning model to
   author fix-handoffs for anything off).

---

## Rules of engagement (the agent must obey)

- Read `docs/handoffs/CONVENTIONS.md` first, every run.
- Execute the listed handoffs **in order**. One commit per handoff, subject prefixed with the
  handoff ID.
- A handoff is done only when its `verify.sh` exits 0. Update `PROGRESS.md` after each.
- Blocked after 3 real attempts → log a `BLOCKER` in `PROGRESS.md`, skip to the next
  independent handoff, keep going. Never stop the whole run on one blocker.
- Do not touch secrets, the git remote, or global git config.
- Work on a branch; do not force-push; do not merge to `main` yourself.

---

## Milestone prompts (copy-paste)

### M1 — Foundation (H00 → H02)
Env secrets needed: none required to pass verify (integration tests skip if
`DATAHUB_GMS_URL` unset). Set `DATAHUB_GMS_URL` + `DATAHUB_TOKEN` if the VM is ready.

```
You are executing the Kavach build. Read docs/handoffs/CONVENTIONS.md and docs/handoffs/RUNBOOK.md first.
Then execute handoffs H00, H01, H02 in order, exactly as written in docs/handoffs/H0x-*/HANDOFF.md.
For each: implement the deliverables, run its verify.sh until it exits 0, commit with the handoff ID,
and tick its row in docs/handoffs/PROGRESS.md. If blocked after 3 attempts, log a BLOCKER in
PROGRESS.md and continue to the next handoff. Do not modify secrets, the remote, or global git config.
```

### M2 — Intelligence (H03 → H04)
Env secrets: `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`) + `LLM_PROVIDER`/`LLM_MODEL`;
`DATAHUB_GMS_URL` + `DATAHUB_TOKEN` (VM must be reachable for integration tests).

```
Read docs/handoffs/CONVENTIONS.md and RUNBOOK.md. Execute H03 then H04 per their HANDOFF.md.
Same completion ritual and blocker policy as before.
```

### M3 — Action (H05 → H07)
Env secrets: add `GITHUB_PAT` (fine-grained, kavach-demo-pipeline only) + `DEMO_PIPELINE_REPO`;
optional `SLACK_WEBHOOK_URL`.

```
Read docs/handoffs/CONVENTIONS.md and RUNBOOK.md. Execute H05, H06, H07 per their HANDOFF.md.
Same completion ritual and blocker policy.
```

### M4 — Experience (H08 → H09)
Env secrets: none new.

```
Read docs/handoffs/CONVENTIONS.md and RUNBOOK.md. Execute H08 then H09 per their HANDOFF.md.
Same completion ritual and blocker policy.
```

### M5 — Ship (H10 → H12)
Env secrets: none new (Vercel + Devpost are human steps).

```
Read docs/handoffs/CONVENTIONS.md and RUNBOOK.md. Execute H10, H11, H12 per their HANDOFF.md.
Same completion ritual and blocker policy.
```

---

## Milestone → handoff → prize-criteria map

| Milestone | Handoffs | Delivers | Criteria served |
|-----------|----------|----------|-----------------|
| M1 | H00–H02 | scaffold, data platform, ML lineage | foundation, "real platform" |
| M2 | H03–H04 | DataHub context layer, agent team | Use of DataHub (tie-breaker), Cat 1 |
| M3 | H05–H07 | chaos, Fixer PRs, flywheel | Cat 2, Cat 4, originality |
| M4 | H08–H09 | war room UI, Analytics Agent | demo wow, completeness |
| M5 | H10–H12 | skill PR, deploy, submission assets | bonus criterion, presentation |
