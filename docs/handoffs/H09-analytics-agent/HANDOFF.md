# H09 — DataHub Analytics Agent composed in

**Milestone:** M4 · **Depends on:** H03, H04, H07 · **Prereqs env:** `DATAHUB_GMS_URL`,
`DATAHUB_TOKEN` for live; fixture-backed otherwise.

## Goal
Compose DataHub's **Analytics Agent** into the stack as the beneficiary of Kavach's write-backs:
after our agents write a postmortem + tags + resolved incident, the Analytics Agent can answer
"what happened to orders data this week?" with context that did not exist 5 minutes earlier.
This is the closing demo beat and a direct hit on the "Use of DataHub" criterion (all four
qualifying products used).

## Context recap
H03 writes Context Documents/tags/incidents to DataHub. H04's Scribe produces them per run.
This handoff adds an integration that queries the Analytics Agent (or, offline, a faithful
fixture-backed shim) and proves the answer improves after write-back.

## Deliverables (`backend/app/analytics/`)
- `agent.py` — `AnalyticsAgentClient`: `ask(question) -> Answer` querying DataHub's Analytics
  Agent when live; offline, a `FixtureAnalyticsBackend` that answers from the same
  fixture writeback store (so the before/after delta is real and reproducible).
- `demo.py` — `before_after(question, scenario)`: runs the question BEFORE a scenario's
  write-back and AFTER, returning both answers + a diff highlighting the newly-available
  context (the postmortem/tags our agents added).
- `app/main.py` — `POST /analytics/ask`, `GET /analytics/before-after?scenario=...`.
- Frontend: add an "Ask DataHub" panel to the war room (H08 seam) showing the before/after.
- Tests: `test_analytics.py` — before write-back the answer lacks the incident context; after
  Scribe's write-back the answer includes it (deterministic via fixtures).

## Definition of done
`verify.sh` exits 0: `before_after` returns two answers where the AFTER answer contains the
postmortem-derived context absent from the BEFORE answer; endpoints wired; ruff+mypy+pytest
green. Live Analytics Agent path used only when env set (else fixture-backed, skipped-not-failed
for the live-only assertions).
