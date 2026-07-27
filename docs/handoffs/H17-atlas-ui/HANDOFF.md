# H17 — Atlas UI (How Kavach works)

**Milestone:** M5 polish · **Depends on:** H16 · **Prereqs:** framer-motion already in frontend.

## Files you need to read:
1. `frontend/lib/site-content.ts` (ATLAS_* from H16)
2. `frontend/components/WarRoom.tsx`
3. `frontend/app/deck/page.tsx`
4. `frontend/app/globals.css`
5. `frontend/public/logos/`

## Goal
Ship `Atlas.tsx`: centre-top hanging pill **"How Kavach works"** that opens a slide-down
modal (framer-motion) with logo grid, optical tiles, monochrome→color hover, featured
DataHub 2-cell, fixed detail region, plus connections / data sources / real-vs-sim sections.
Mount in WarRoom; add a matching `/deck` slide if the deck exists.

## Deliverables
- `frontend/components/Atlas.tsx` — full Atlas experience:
  - Centre-top hanging pill trigger: “How Kavach works”
  - Slide-down modal (framer-motion); Esc / backdrop close; focus trap-ish OK
  - Logo grid from `ATLAS_STACK`; optical square tiles; mono → brand color on hover/focus
  - DataHub featured spanning **2 cells**
  - Fixed detail region (name, whatItIs, whatWeUseItFor, whereInRepo) on hover/focus/tap
  - Sections: connections (`ATLAS_CONNECTIONS`), data sources (`ATLAS_DATA_SOURCES`),
    real vs simulated (`ATLAS_REAL_VS_SIMULATED`); motto + optional DataHub matrix
- `frontend/components/WarRoom.tsx` — import and mount `<Atlas />` (header / top chrome)
- `frontend/app/deck/page.tsx` — matching Atlas slide (reuse component or thin wrapper)
- Styles: fit existing war-room dark aesthetic; no purple-default AI look

## Step-by-step tasks

1. Confirm H16 `ATLAS_*` exports + logos exist (`H16` verify green).
2. Implement `Atlas.tsx` consuming only `site-content` + `/logos/*`.
3. Mount in `WarRoom.tsx` so the pill hangs centre-top above the war room.
4. Add deck slide that reuses Atlas content/component.
5. Keyboard: open/close; tile focus shows detail region.
6. `pnpm lint && pnpm typecheck` in `frontend/` (optional in verify; do before merge).
7. Run `docs/handoffs/H17-atlas-ui/verify.sh`

## Definition of done
- `Atlas.tsx` exists; WarRoom imports Atlas; site-content `ATLAS_*` referenced
- Modal + pill + featured DataHub + detail region behave as specified
- Deck has matching Atlas slide when `app/deck` exists
- `verify.sh` exits 0
