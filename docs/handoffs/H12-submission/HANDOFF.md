# H12 — Submission assets (README, deck, video script, Devpost)

**Milestone:** M5 · **Depends on:** H00–H11 · **Prereqs env:** none. Final human steps
(record voiceover, click submit on Devpost) are gated to you.

## Goal
Produce every submission deliverable, engineered 1:1 against the judging criteria, so the
project presents as clearly as it performs.

## Context recap
All functionality exists (H00–H11). This handoff packages it: the README, the animated `/deck`
(H08 exists — here finalize copy/flow), the video script + shot list, the Devpost description,
and the submission checklist. Everything mapped explicitly to the 5 criteria + all 4 categories
+ the bonus.

## Deliverables
- `README.md` (root, finalize) — hero + tagline, GIFs, 60-sec quickstart, architecture +
  data-flow mermaid, **"How Kavach uses DataHub" matrix** (feature → where used), the four
  categories claimed with evidence links, MTTR/flywheel results, replay instructions, OSS
  contribution link. Badges (CI, license).
- `docs/JUDGING.md` — explicit criteria-by-criteria mapping (Use of DataHub, technical
  execution, originality, real-world impact, presentation) with links to code/examples.
- `docs/VIDEO.md` — 3-min script + shot list + timestamps (0:00 hook → 0:20 chaos → 2:10
  flywheel + Analytics Agent → 2:40 DataHub recap + OSS). Includes exact narration lines.
- `docs/DEVPOST.md` — the Devpost text description (inspiration, what it does, how we built it,
  challenges, accomplishments, what's next, DataHub usage), mapped to criteria; category
  selections listed.
- `examples/` (finalize) — real generated PRs, postmortems, assertions, risk reports, MTTR
  report — the judge-evaluates-output-without-running set.
- `docs/handoffs/H12-submission/SUBMIT.md` — final human checklist: record voiceover (or
  approve AI voice), upload video, join DataHub Slack `#agent-hackathon`, complete feedback
  survey ($50 bonus), submit on Devpost early.
- Tests/checks: `test_submission.py` — README contains the DataHub matrix + all 4 categories +
  quickstart; all internal doc links resolve; examples are non-empty.

## Definition of done
`verify.sh` exits 0: README has the DataHub-usage matrix, all four categories, quickstart, and
architecture diagram; JUDGING.md, VIDEO.md, DEVPOST.md, SUBMIT.md exist; all relative links in
these docs resolve; `examples/` is populated. Recording + Devpost submission remain gated human
steps in SUBMIT.md.
