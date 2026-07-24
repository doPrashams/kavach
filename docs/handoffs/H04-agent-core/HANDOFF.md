# H04 — Agent team (LangGraph) + event bus + run recorder

**Milestone:** M2 (heaviest) · **Depends on:** H03 · **Prereqs env:** `OPENAI_API_KEY` or
`ANTHROPIC_API_KEY` + `LLM_PROVIDER`/`LLM_MODEL`. Tests use a stub LLM (no key needed).

## Goal
Build the six-agent LangGraph team that detects, diagnoses, and resolves data incidents using
the H03 DataHub context layer, plus the event bus (SSE source for the UI) and a run recorder
that makes every run replayable with zero API keys.

## Context recap
H03 exposes `DataHubContextService` (lineage, blast radius incl. ML, queries, incidents,
context docs, tags). This handoff orchestrates agents over it. Grounding = Agent Context Kit.
The chaos engine (H05) will trigger runs; the Fixer's PR flow (H06) plugs into the Fixer node;
the flywheel (H07) plugs into the Scribe node. Design clean seams for those.

## The agent team (LangGraph `StateGraph`)
State: `IncidentState` (pydantic) — incident id, trigger event, findings, blast radius, ml
risk, proposed fix, postmortem, timeline of `AgentEvent`s.

Nodes (each an agent with a focused prompt + tools from H03):
1. **Sentinel** — detects/confirms the anomaly; evaluates emitted assertions (OSS: we evaluate
   ourselves) and opens a DataHub incident. Tools: `get_schema`, `get_dataset_queries`,
   `emit_assertion`, `create_incident`.
2. **Investigator** — root-causes by walking lineage + real historical queries
   (`get_upstreams`, `get_dataset_queries`). Produces a ranked cause hypothesis.
3. **Impact Analyst** — computes blast radius (`get_blast_radius`): downstream tables,
   dashboards, and the ML deployment via column lineage.
4. **ML Guardian** — gates deployment risk using the ML lineage from H02/H03; classifies
   severity (`get_ml_model`, deployment refs); can recommend hold/rollback.
5. **Fixer** — generates the fix plan (actual codegen + PR is H06; here define the interface
   `FixPlan` and a stub that returns a deterministic plan when H06 not present).
6. **Scribe** — writes the postmortem back to DataHub (`save_context_document`, `add_tags`,
   `update_description`, `resolve_incident`). (RAG over past postmortems is H07; define the
   seam.)
7. **Comms** — emits owner notifications (in-UI notification event by default; real Slack via
   `SLACK_WEBHOOK_URL` if set).

Edges: Sentinel → Investigator → Impact Analyst → (ML Guardian ∥ Fixer) → Scribe → Comms.
Conditional: if ML Guardian flags critical risk, Fixer must include a safeguard (assertion +
hold recommendation) before Scribe.

## Deliverables (`backend/app/agents/`, `backend/app/events/`)
- `agents/state.py` — `IncidentState`, `AgentEvent`, `FixPlan`, enums for severity/status.
- `agents/llm.py` — provider-agnostic LLM factory (OpenAI/Anthropic via env); a `StubLLM`
  returning deterministic canned outputs for tests/replay (selected when no key or
  `LLM_PROVIDER=stub`).
- `agents/nodes/*.py` — one module per agent, each a pure `async def run(state, ctx) -> state`
  using H03 service + LLM. Prompts in `agents/prompts/`.
- `agents/graph.py` — assembles the LangGraph `StateGraph`, compiles it, exposes
  `run_incident(trigger) -> IncidentState` streaming `AgentEvent`s to the bus.
- `events/bus.py` — in-process async pub/sub; `events/recorder.py` — records every
  `AgentEvent` of a run to `events/recordings/<run_id>.jsonl`; `events/replay.py` — replays a
  recording through the bus at original (or accelerated) cadence, **no LLM/API calls**.
- `backend/app/main.py` — add `GET /runs/{id}/stream` (SSE from bus), `POST /runs`
  (trigger a run), `GET /runs/{id}` (state), `GET /recordings` + `POST /replay/{id}`.
- Tests: `test_agents.py` — full graph runs end-to-end with `StubLLM` over fixtures, produces
  a complete `IncidentState` (cause, blast radius incl. ML, fix plan, postmortem, writeback);
  `test_events.py` — record then replay reproduces the identical event sequence with no LLM.

## Definition of done
`verify.sh` exits 0: graph compiles; an end-to-end run with `StubLLM` over fixtures yields an
`IncidentState` containing a root cause, a blast radius that includes the ML deployment, a
`FixPlan`, a postmortem written to the fixture writeback, and a Comms notification; a recorded
run replays deterministically without any API key; ruff+mypy+pytest green.
