# H03 — DataHub context layer (MCP + Agent Context Kit)

**Milestone:** M2 · **Depends on:** H00–H02 · **Prereqs env:** `DATAHUB_GMS_URL`,
`DATAHUB_TOKEN` (integration tests skip if unset; unit tests use fixtures from H01/H02).

## Goal
Build the typed Python service that is the ONLY way the rest of Kavach talks to DataHub. It
wraps both the **DataHub MCP Server** (tool calls) and the **Agent Context Kit**
(`datahub-agent-context`) for read AND write, exposing clean async methods the agents (H04)
consume. This layer is the heart of the "meaningful DataHub use" score — it must exercise
lineage (table + column), ML entities, query history, glossary/ownership/domains, incidents,
assertions, and Context Documents.

## Context recap
H01 ingested the retail platform (tables, columns, lineage, owners, queries) into DataHub and
captured fixtures. H02 registered ML lineage (feature→model→deployment) and a fixture. This
handoff makes those reachable through a stable API, with a fixture-backed fallback so
everything runs offline (tests, replay) when `DATAHUB_GMS_URL` is unset.

## Deliverables (`backend/app/datahub/`)
- `client.py` — `DataHubClient`: async wrapper. Constructor takes settings; if
  `DATAHUB_GMS_URL` set → live mode (MCP + `acryl-datahub` SDK + GraphQL for OSS-only ops like
  incidents); else → `FixtureBackend` (loads `data/fixtures/` + `ml/fixtures/`). Same
  interface both modes — callers never branch on mode.
- `mcp.py` — thin MCP Server client (connect, list tools, call tool) used by `client.py` for
  read/write tools. Retries via tenacity, timeouts.
- `context_kit.py` — integration with `datahub-agent-context` (Agent Context Kit) exposing
  the context-retrieval helpers the agents use for grounding.
- `models.py` — Pydantic models for everything returned: `DatasetRef`, `SchemaField`,
  `LineageEdge` (with `column_level: bool`), `MLModelRef`, `MLDeploymentRef`, `QueryRecord`,
  `Incident`, `Assertion`, `ContextDocument`, `Owner`, `GlossaryTerm`.
- `service.py` — `DataHubContextService` with typed methods:
  - reads: `get_dataset`, `get_schema`, `get_upstreams`/`get_downstreams`
    (`depth`, `column_level`), `get_blast_radius(urn)` (returns downstream tables +
    dashboards + **ML models/deployments** via column lineage), `get_dataset_queries(urn)`,
    `get_ml_model`, `get_owners`, `search`.
  - writes: `save_context_document`, `add_tags`, `update_description`,
    `create_incident`/`update_incident`/`resolve_incident`, `emit_assertion`,
    `add_glossary_term`.
- `fixtures.py` (extend H01's) — `FixtureBackend` implementing the same read methods from
  recorded payloads; writes append to `data/fixtures/writeback.jsonl` (so tests can assert
  the agent wrote back, and replay can show it).
- `backend/app/datahub/README.md` — the capability matrix (method → DataHub feature used).
- Tests: `backend/tests/test_datahub_service.py` — every read method returns correct typed
  data from fixtures; `get_blast_radius` includes the ML deployment for a corrupted upstream
  column; every write method produces a well-formed payload (asserted against fixture
  writeback). Integration test `test_datahub_live.py` marked `@pytest.mark.integration`,
  skipped unless `DATAHUB_GMS_URL` set.

## Key correctness requirements
- `get_blast_radius("mart_demand_features.next_day_qty")` (or the corrupted column) MUST
  include the `mlModelDeployment` from H02 via column-level feature lineage. This is the demo's
  ML-Guardian moment — verify.sh checks it.
- OSS caveat: assertion *evaluation* is Cloud-only. Here we only **emit** assertion entities;
  evaluation happens in Sentinel (H04/H05). Incidents work in OSS via GraphQL — implement them.
- No secrets in code; live vs fixture chosen purely by presence of `DATAHUB_GMS_URL`.

## Definition of done
`verify.sh` exits 0: service imports, all read methods return typed models from fixtures,
`get_blast_radius` surfaces the ML deployment through column lineage, all write methods emit
valid payloads to the fixture writeback, capability matrix README lists ≥8 DataHub features,
ruff+mypy+pytest green. Live integration test skips cleanly without env.
