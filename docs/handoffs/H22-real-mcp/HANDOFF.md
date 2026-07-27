# H22 — Real JSON-RPC MCP client (TOP PRIORITY)

**Milestone:** M6 · **Depends on:** H03 · **Priority:** TOP · **Prereqs:** none for offline
verify; live MCP needs GMS + sidecar.

## Goal
Replace the fake REST-shaped MCP client with a real JSON-RPC 2.0 client against `/mcp`
(`initialize`, `tools/list`, `tools/call`). Ship an `mcp-server-datahub` sidecar (compose)
or document `uvx` sidecar. Commit `.cursor/mcp.json` using env vars, never literal secrets.
Integration tests must fail loudly on HTTP 404 when `DATAHUB_GMS_URL` is set and
`KAVACH_STRICT_DATAHUB=1` (no silent fixture fallback for protocol errors).

## Files you need to read:
1. `backend/app/datahub/mcp.py`
2. `backend/app/datahub/client.py`
3. `deploy/docker-compose.yml`
4. `deploy/README.md`
5. `backend/tests/test_datahub_live.py`
6. `backend/app/config.py`

## Steps
1. Rewrite `backend/app/datahub/mcp.py` as JSON-RPC 2.0 over HTTP(S) to `{DATAHUB_GMS_URL}/mcp`:
   - `initialize`
   - `tools/list`
   - `tools/call`
   Keep tenacity retries + timeouts; typed errors via `app/errors.py`.
2. Add `mcp-server-datahub` service to `deploy/docker-compose.yml` with
   `TOOLS_IS_MUTATION_ENABLED=true`, **or** document a `uvx` sidecar in `deploy/README.md`
   (compose mention preferred).
3. Create `.cursor/mcp.json` that references env vars (e.g. `${DATAHUB_GMS_URL}`,
   `${DATAHUB_TOKEN}`) — no hardcoded hosts/tokens.
4. Integration test: when `DATAHUB_GMS_URL` set and `KAVACH_STRICT_DATAHUB=1`, a 404 / protocol
   failure must raise (not silently return fixtures).
5. Unit tests cover initialize + list + call parsing offline (httpx mock).

## Deliverables
- Real MCP client in `backend/app/datahub/mcp.py`.
- Sidecar in compose and/or docs.
- `.cursor/mcp.json` (env-driven).
- Strict-mode integration behavior for protocol errors.

## Definition of done
`verify.sh` exits 0: `mcp.py` contains `jsonrpc` or `initialize`; `.cursor/mcp.json` exists;
compose or deploy docs mention `mcp-server-datahub`.
