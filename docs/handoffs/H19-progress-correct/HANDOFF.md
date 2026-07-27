# H19 — Correct PROGRESS.md (H10–H26)

**Milestone:** tracking · **Depends on:** H00–H18 definitions · **Prereqs:** none.

## Files you need to read:
1. `docs/handoffs/PROGRESS.md`
2. `docs/handoffs/H10-skill-pr/SUBMIT.md`
3. `docs/handoffs/H12-submission/SUBMIT.md`
4. `docs/handoffs/H18-oss-bonus/STATUS.md`
5. `docs/handoffs/H13-freeze-compliance/HANDOFF.md`

## Goal
Correct `docs/handoffs/PROGRESS.md` so status matches reality: H10 skill package done but
**upstream PR pending**; H12 docs done but **video + Devpost pending**; add rows **H13–H26**
as `pending` or `in-progress` (do not mark unfinished polish as `done`).

## Deliverables
- Updated `docs/handoffs/PROGRESS.md` table:
  - H10 Notes: `skill package done, upstream PR pending` (status may stay `done` for the
    package work, but must **not** claim upstream PR merged/done without that caveat)
  - H12 Notes: `docs done, video+Devpost pending`
  - New rows H13–H26 with Title / Milestone / Status / Notes (use handoff folder titles;
    unknown future titles may be short placeholders still listing H21+)
- Suggested H13–H19 titles (align with folders):
  - H13 freeze-compliance · H14 mode-indicator · H15 healthcare-domain · H16 atlas-content
  - H17 atlas-ui · H18 oss-bonus · H19 progress-correct
  - H20–H26: leave `pending` with brief placeholder titles if not yet authored

## Step-by-step tasks

1. Open `docs/handoffs/PROGRESS.md`.
2. Fix H10 Notes to include upstream-PR-pending caveat (never “upstream PR done” alone).
3. Fix H12 Notes: docs done; video + Devpost still pending.
4. Append H13–H26 rows; set H13–H19 to `pending` (or `in-progress` if actively executing).
5. Keep blockers log section; do not invent green checkmarks.
6. Run `docs/handoffs/H19-progress-correct/verify.sh`

## Definition of done
- `PROGRESS.md` contains **H13** and **H21** rows
- H10 is not claimed as upstream-PR-complete without a pending caveat
- H12 notes reflect video/Devpost pending
- `verify.sh` exits 0
