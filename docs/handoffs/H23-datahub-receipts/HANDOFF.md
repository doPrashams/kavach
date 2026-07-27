# H23 — DataHub MCP receipts (transcripts + war room evidence)

**Milestone:** M6 · **Depends on:** H22 · **Priority:** normal · **Prereqs:** none for
verify (seed redacted sample OK).

## Goal
Record MCP client traffic as judge-facing receipts: redacted transcripts under
`examples/datahub-transcripts/`, plus a war room evidence panel that surfaces them.
Never commit Authorization / Bearer tokens.

## Files you need to read:
1. `backend/app/datahub/mcp.py`
2. `frontend/components/WarRoom.tsx`
3. `frontend/components/AgentFeed.tsx`
4. `docs/JUDGING.md`
5. `docs/handoffs/CONVENTIONS.md`

## Steps
1. Add a transcript recorder on the MCP client path (wrap `tools/call` / RPC send):
   - Persist request/response JSON (or summarized envelopes) to
     `examples/datahub-transcripts/` (or a writable path that demos copy into examples).
   - Implement redaction: strip/replace `Authorization` headers and any `Bearer …` values.
   - Document the redaction helper with a clear function name or comment
     (`redact_headers` / `redact_secrets`).
2. Commit `examples/datahub-transcripts/` with at least one sample redacted transcript
   (fixture is fine if live MCP unavailable).
3. Add a war room evidence panel component (e.g.
   `frontend/components/EvidencePanel.tsx`) wired into `WarRoom.tsx` that lists / shows
   transcript receipts (fixture-backed offline).
4. Grep committed transcripts — zero Bearer tokens.

## Deliverables
- Transcript recorder + redaction in MCP client (or adjacent module).
- `examples/datahub-transcripts/` with sample(s).
- Evidence panel in the war room UI.

## Definition of done
`verify.sh` exits 0: transcripts dir exists; redaction function or comment present; no Bearer
tokens in committed transcripts.
