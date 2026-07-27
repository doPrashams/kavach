# H14 — LIVE / REPLAY / DEMO mode indicator

**Milestone:** M5 polish · **Depends on:** H08, H11 · **Prereqs:** none for offline verify.

## Files you need to read:
1. `frontend/components/WarRoom.tsx`
2. `frontend/components/health-badge.tsx`
3. `frontend/app/api/health/route.ts`
4. `frontend/lib/api.ts`
5. `frontend/lib/api-demo.ts`
6. `frontend/components/ReplayControls.tsx`

## Goal
Replace the misleading header badge **"Live run"** with an explicit mode indicator:
**LIVE**, **REPLAY**, or **DEMO** — so judges never think fixture/replay traffic is a live
DataHub session.

## Mode definitions
| Mode | When |
|------|------|
| **LIVE** | Connected to DataHub (`DATAHUB_GMS_URL` configured / health reports live backend+GMS) |
| **REPLAY** | Playing a recorded event stream (scrubber / `POST /replay/...` active) |
| **DEMO** | Fixture-backed same-origin `/api/*` demo (no live DataHub) |

## Deliverables
- `frontend/components/WarRoom.tsx` — header mode badge(s); remove misleading `"Live run"`
  string except if reused only for true LIVE (prefer distinct `LIVE` label)
- Optional helper (only if needed): derive mode from health + replay/playing state in
  `WarRoom.tsx` or a tiny colocated util — prefer reuse of existing health/replay state
- Visual: clear in war-room header (next to title / controls); accessible label text
  includes LIVE|REPLAY|DEMO

## Step-by-step tasks

1. Find current badge usage in `WarRoom.tsx` (`Live run` when `playing`).
2. Derive mode:
   - If replay scrubber / recording playback active → **REPLAY**
   - Else if health (or env) indicates DataHub live → **LIVE**
   - Else → **DEMO**
3. Render one primary badge: `LIVE` | `REPLAY` | `DEMO` (distinct colors ok; keep dark war-room).
4. Ensure the literal string `Live run` is gone, or only appears when mode is truly LIVE
   (prefer deleting it and using `LIVE`).
5. Manually smoke: fixture demo → DEMO; start replay → REPLAY; with live API health → LIVE.
6. Run `docs/handoffs/H14-mode-indicator/verify.sh`

## Definition of done
- Header shows LIVE / REPLAY / DEMO correctly for each mode
- `"Live run"` removed or restricted to true live only
- `verify.sh` exits 0 (`WarRoom.tsx` greps for LIVE|REPLAY|DEMO; Live-run misuse gone)
