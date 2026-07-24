# H08 — War room UI + /deck

**Milestone:** M4 · **Depends on:** H04–H07 · **Prereqs env:** none
(`NEXT_PUBLIC_API_URL` points at the backend; UI works against replay recordings offline).

## Goal
Build the live "war room" — the judge-facing experience where you press "Inject Chaos" and
watch the platform heal itself in real time — plus the animated `/deck` presentation route.
This is the demo wow-factor and the slide deliverable in one app.

## Context recap
Backend exposes (H04/H05): `POST /chaos/inject`, `GET /runs/{id}/stream` (SSE of AgentEvents),
`GET /runs/{id}`, `GET /chaos/scenarios`, `POST /replay/{id}`, `GET /recordings`, plus MTTR
trend (H07) and fixes (H06). Build a Next.js 15 UI over these. Replay mode means it works with
zero API keys for judges.

## Deliverables (`frontend/`)
- `app/page.tsx` — war room dashboard:
  - **Chaos panel**: scenario picker + "Inject Chaos" button → `POST /chaos/inject`.
  - **Live agent feed**: subscribes to SSE `/runs/{id}/stream`; renders the 7 agents lighting
    up in sequence with their findings (Sentinel→…→Comms).
  - **Blast-radius graph**: `@xyflow/react` (React Flow) showing table→mart→dashboard→**ML
    deployment** nodes, highlighting the impacted path (incl. column-level to the model).
  - **ML Guardian card**: deployment risk + recommendation.
  - **PR card**: the Fixer's PR link + diff summary (from H06).
  - **Postmortem + MTTR**: Scribe's writeback preview + MTTR trend chart (H07) showing the
    flywheel drop.
  - **Replay controls**: pick a recording → `POST /replay/{id}`; scrubber; "no API key needed"
    badge.
  - **Scenario library**: list of scenarios incl. simulated extras (healthcare PII, nyc-taxi
    freshness) clearly labeled "simulated".
- `app/deck/page.tsx` — animated HTML presentation (framer-motion): hook → problem → the loop
  → DataHub-surface recap → OSS contribution → results/MTTR. Data-flow diagram animations.
  This is the presentation deliverable; must be self-contained (works offline with canned data).
- `lib/api.ts` — typed client for backend endpoints; `lib/sse.ts` — SSE hook.
- `components/` — `AgentFeed`, `BlastRadiusGraph`, `ChaosPanel`, `MttrChart`, `PrCard`,
  `PostmortemCard`, `ReplayControls`, all typed, shadcn/ui styled.
- Fixtures: `frontend/fixtures/` — a canned recording + MTTR series so the UI (and `/deck`)
  render without a backend (used by verify + judge fallback).
- Tests: component tests (Vitest + Testing Library) for `AgentFeed` (renders events in order),
  `BlastRadiusGraph` (renders ML deployment node), `MttrChart` (renders decreasing series).

## Quality bar
Beautiful, modern, dark "control room" aesthetic; responsive; accessible (keyboard + aria).
No `any`. Must `pnpm lint && pnpm typecheck && pnpm build` clean and pass component tests.

## Definition of done
`verify.sh` exits 0: frontend builds; lint+typecheck clean; component tests pass (feed order,
ML deployment node present, MTTR chart decreasing); `/` and `/deck` render against fixtures
without a backend; required components exist.
