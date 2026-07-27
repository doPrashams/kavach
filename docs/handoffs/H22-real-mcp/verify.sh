#!/usr/bin/env bash
# H22 verify — JSON-RPC MCP client + sidecar/docs + cursor mcp.json.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "mcp.py is JSON-RPC shaped"
[ -f backend/app/datahub/mcp.py ] || err "missing backend/app/datahub/mcp.py"
if [ -f backend/app/datahub/mcp.py ]; then
  if ! grep -Eqi 'jsonrpc|json-rpc|"jsonrpc"|initialize' backend/app/datahub/mcp.py; then
    err "mcp.py missing jsonrpc or initialize"
  fi
fi

step ".cursor/mcp.json exists"
[ -f .cursor/mcp.json ] || err "missing .cursor/mcp.json"

if [ -f .cursor/mcp.json ]; then
  step "mcp.json uses env vars not literal secrets"
  if grep -Eqi 'Bearer[[:space:]]+[A-Za-z0-9._-]{20,}|sk-[A-Za-z0-9]{10,}' .cursor/mcp.json; then
    err ".cursor/mcp.json appears to contain literal secrets"
  fi
fi

step "compose or docs mention mcp-server-datahub"
if grep -REq 'mcp-server-datahub' deploy/docker-compose.yml deploy/README.md 2>/dev/null; then
  :
else
  err "deploy/docker-compose.yml or deploy/README.md must mention mcp-server-datahub"
fi

if [ "$fail" -ne 0 ]; then echo "H22 VERIFY: FAILED"; exit 1; fi
echo "H22 VERIFY: PASSED"; exit 0
