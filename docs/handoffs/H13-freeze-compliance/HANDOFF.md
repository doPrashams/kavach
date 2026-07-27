# H13 — Freeze Milestone 1 + license/README compliance

**Milestone:** M5 polish · **Depends on:** H00–H12 · **Prereqs:** git + `gh` auth as doPrashams.

## Files you need to read:
1. `README.md`
2. `LICENSE`
3. `frontend/app/globals.css`
4. `frontend/components/ChaosPanel.tsx`
5. `frontend/components/WarRoom.tsx`
6. `docs/handoffs/PROGRESS.md`

## Goal
Freeze Milestone 1 UI polish with a tagged commit, fix Apache-2.0 license messaging in
README, pin demo URLs, and set GitHub repo homepage/topics.

## Deliverables
- Git commit of dirty frontend polish files with message `H13: freeze Milestone 1 UI polish`
- Annotated or lightweight tag `v1-milestone-ui` on that commit
- `README.md` — badge line Apache-2.0 (not MIT); license section says Apache 2.0; remove
  `(add if missing)`; live demo URL pinned if known else placeholder comment; DataHub URL
  `http://34.60.67.85:9002` noted
- GitHub repo metadata via `gh repo edit` (topics + homepage when known)
- `docs/handoffs/H13-freeze-compliance/verify.sh` exits 0

## Step-by-step tasks

1. **Commit Milestone 1 UI polish** (only these if dirty):
   ```bash
   git add frontend/app/globals.css \
     frontend/components/ChaosPanel.tsx \
     frontend/components/IncidentReport.tsx \
     frontend/components/LeftNav.tsx \
     frontend/components/WarRoom.tsx
   git commit -m "H13: freeze Milestone 1 UI polish"
   ```
   Skip commit if working tree already clean for those paths; still proceed to tag if HEAD is
   the freeze commit.

2. **Tag freeze:**
   ```bash
   git tag v1-milestone-ui
   # push when ready: git push origin HEAD && git push origin v1-milestone-ui
   ```

3. **Fix `README.md` license:**
   - Badge: `https://img.shields.io/badge/license-Apache--2.0-blue` (text/label Apache-2.0)
   - License section: say **Apache 2.0** and link `LICENSE`; delete `(add if missing)`
   - Do not leave an MIT badge or “MIT —” license blurb

4. **Pin URLs in `README.md`:**
   - Live demo: use known `https://kavach-*.vercel.app` if deployed; else
     `<!-- live demo: https://kavach-….vercel.app (pending) -->`
   - DataHub (VM): `http://34.60.67.85:9002`

5. **GitHub metadata:**
   ```bash
   # If Vercel URL known:
   gh repo edit doPrashams/kavach --homepage https://kavach-….vercel.app \
     --add-topic datahub --add-topic ai-agents --add-topic hackathon
   # If homepage unknown, omit --homepage:
   gh repo edit doPrashams/kavach \
     --add-topic datahub --add-topic ai-agents --add-topic hackathon
   ```

6. Run `docs/handoffs/H13-freeze-compliance/verify.sh`

## Definition of done
- Tag `v1-milestone-ui` exists locally (push optional)
- `LICENSE` present; README badge/section are Apache-2.0 with no MIT badge and no
  `(add if missing)`
- DataHub URL documented; demo URL pinned or explicitly placeholder-commented
- Repo topics `datahub`, `ai-agents`, `hackathon` added (homepage only if known)
- `verify.sh` exits 0
