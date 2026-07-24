# H07 — Knowledge flywheel (postmortem RAG + MTTR)

**Milestone:** M3 · **Depends on:** H03, H04 · **Prereqs env:** none to pass verify
(embeddings use a local/deterministic backend in test mode).

## Goal
Close the learning loop: the Scribe's postmortems (Context Documents in DataHub) become
retrievable knowledge so that when a *similar* incident recurs, the Investigator cites the
prior postmortem and resolves measurably faster. Track MTTR and show it drop as postmortems
accumulate — the measurable "flywheel" proof for the demo.

## Context recap
H04 Scribe writes postmortems via `save_context_document`. This handoff adds retrieval over
those documents and wires it into the Investigator (H04 defined the seam). MTTR is computed
from the run recorder's timeline (H04 events).

## Deliverables (`backend/app/flywheel/`)
- `store.py` — `PostmortemStore`: indexes Context Documents (from DataHub live, or fixture
  writeback offline) into a small vector index. Embeddings via provider if key set, else a
  deterministic local embedding (hashing/`sentence-transformers`-free fallback) so tests are
  reproducible and offline.
- `retriever.py` — `find_similar(incident, k)` → ranked prior postmortems with similarity +
  the resolution they used. Injected into Investigator's context (grounding).
- `mttr.py` — computes MTTR per run from event timelines; `mttr_trend()` returns the series
  across runs (used by UI). Persists to `events/metrics/mttr.jsonl`.
- Wire into `agents/nodes/investigator.py`: if a similar past incident exists, cite it and
  short-circuit hypothesis ranking (faster path → lower MTTR), recorded as an event.
- Tests: `test_flywheel.py` — (1) after storing scenario-A postmortem, a second scenario-A
  incident retrieves it as top hit; (2) the second run's recorded MTTR < first run's;
  (3) retrieval is deterministic in test mode.

## Demo requirement
The MTTR drop must be real and reproducible from recordings: run scenario X twice via the
StubLLM path; second run cites the first's postmortem and has strictly lower MTTR. verify.sh
asserts this.

## Definition of done
`verify.sh` exits 0: postmortems index and retrieve deterministically; a repeated scenario
retrieves the prior postmortem as the top match and cites it in the Investigator's output; the
second run's MTTR is strictly lower than the first's; `mttr_trend()` returns a decreasing
series for the repeated scenario; ruff+mypy+pytest green.
