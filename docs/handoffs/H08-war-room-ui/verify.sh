#!/usr/bin/env bash
# H08 verify — war room UI + /deck.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

step "required files"
for f in \
  frontend/app/page.tsx frontend/app/deck/page.tsx frontend/lib/api.ts frontend/lib/sse.ts ; do
  [ -f "$f" ] || err "missing $f"
done

step "key components present"
for c in AgentFeed BlastRadiusGraph ChaosPanel MttrChart PrCard PostmortemCard ReplayControls ; do
  ls frontend/components/${c}.* >/dev/null 2>&1 || err "missing component ${c}"
done

if ! command -v pnpm >/dev/null 2>&1; then err "pnpm not available"; echo "H08 VERIFY: FAILED"; exit 1; fi

step "install"; (cd frontend && pnpm install --frozen-lockfile || pnpm install) || err "install"
step "lint"; (cd frontend && pnpm lint) || err "lint"
step "typecheck"; (cd frontend && pnpm typecheck) || err "typecheck"
step "component tests"; (cd frontend && pnpm test -- --run 2>/dev/null || pnpm vitest run) || err "component tests"
step "build"; (cd frontend && pnpm build) || err "build"

if [ "$fail" -ne 0 ]; then echo "H08 VERIFY: FAILED"; exit 1; fi
echo "H08 VERIFY: PASSED"; exit 0
