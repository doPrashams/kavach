#!/usr/bin/env bash
# H00 verify — scaffold health. Exits 0 only when the skeleton is green.
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
step() { echo "==> $1"; }
err()  { echo "FAIL: $1"; fail=1; }

# 1. git identity (repo-local)
step "git identity"
email="$(git config --local --get user.email || true)"
[ "$email" = "doprashams@gmail.com" ] || err "repo-local user.email is '$email', expected doprashams@gmail.com"

# 2. required files
step "required files"
for f in \
  backend/pyproject.toml backend/app/main.py backend/app/config.py backend/app/logging.py \
  backend/app/errors.py backend/tests/test_health.py \
  frontend/package.json frontend/app/page.tsx \
  deploy/docker-compose.yml deploy/.env.example backend/Dockerfile \
  .gitignore README.md docs/ARCHITECTURE.md .github/workflows/ci.yml ; do
  [ -f "$f" ] || err "missing $f"
done

# 3. backend lint/type/tests
if command -v uv >/dev/null 2>&1; then
  step "backend ruff"; (cd backend && uv run ruff check .) || err "ruff"
  step "backend mypy"; (cd backend && uv run mypy app) || err "mypy"
  step "backend pytest"; (cd backend && uv run pytest -q) || err "pytest"
else
  step "backend (pip fallback)"
  (cd backend && python -m pip install -q -e ".[dev]" && ruff check . && mypy app && pytest -q) || err "backend checks"
fi

# 4. frontend lint/type/build
if command -v pnpm >/dev/null 2>&1; then
  step "frontend install"; (cd frontend && pnpm install --frozen-lockfile || pnpm install) || err "pnpm install"
  step "frontend lint"; (cd frontend && pnpm lint) || err "pnpm lint"
  step "frontend typecheck"; (cd frontend && pnpm typecheck) || err "pnpm typecheck"
  step "frontend build"; (cd frontend && pnpm build) || err "pnpm build"
else
  err "pnpm not available"
fi

# 5. docker compose config valid (schema only; images need not be pulled)
if command -v docker >/dev/null 2>&1; then
  step "compose config"; docker compose -f deploy/docker-compose.yml config >/dev/null || err "compose config invalid"
else
  echo "WARN: docker not available, skipping compose validation"
fi

if [ "$fail" -ne 0 ]; then echo "H00 VERIFY: FAILED"; exit 1; fi
echo "H00 VERIFY: PASSED"; exit 0
