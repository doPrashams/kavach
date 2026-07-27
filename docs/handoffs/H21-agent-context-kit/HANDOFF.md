# H21 — Wire real Agent Context Kit (TOP PRIORITY)

**Milestone:** M6 · **Depends on:** H03, H04 · **Priority:** TOP · **Prereqs:** none for
offline verify; live kit needs `DATAHUB_GMS_URL` + token.

## Goal
Stop fabricating Context Kit tool names. Add `datahub-agent-context[langchain]`, expose
real LangChain tools via `build_langchain_tools(include_mutations=True)`, and use
`search_documents` / `grep_documents` / `save_document` (and `add_terms`, not
`add_glossary_term`) on the agent path. Keep fixture fallback when DataHub is not configured.

## Files you need to read:
1. `backend/pyproject.toml`
2. `backend/app/datahub/context_kit.py`
3. `backend/app/datahub/service.py`
4. `backend/app/agents/nodes/investigator.py`
5. `backend/app/agents/nodes/fixer.py`
6. `backend/app/datahub/client.py`

## Steps
1. Add dependency `datahub-agent-context[langchain]` to `backend/pyproject.toml`;
   `uv lock` / `uv sync`.
2. Rewrite `backend/app/datahub/context_kit.py`:
   - Build tools with `build_langchain_tools(include_mutations=True)` when configured.
   - Retire any call to fabricated `get_context_documents`.
   - Use real tools: `search_documents`, `grep_documents`, `save_document`.
   - Glossary mutations: `add_terms` (not `add_glossary_term` as the MCP/tool name).
   - If not configured → existing fixture / empty fallback (no crash).
3. Wire kit tools into the agent path (graph / investigator / fixer context), not a dead
   helper that nothing calls.
4. Where useful in investigator/fixer, prefer:
   - `get_dataset_queries`
   - `find_sql_context`
   - `draft_sql_for_tables`
5. Align `service.py` / `client.py` tool names with the real kit where they proxy mutations.
6. Update unit tests that assert old fabricated names.

## Deliverables
- `backend/pyproject.toml` (+ lock) includes `datahub-agent-context`.
- `backend/app/datahub/context_kit.py` uses real ACK tools only.
- Agent path references real tool names; fixture mode still works offline.

## Definition of done
`verify.sh` exits 0: pyproject lists `datahub-agent-context`; `context_kit.py` does not call
`get_context_documents`; service or agents reference real tool names
(`search_documents` / `grep_documents` / `save_document` / `add_terms` / SQL helpers).
