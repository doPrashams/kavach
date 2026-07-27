# Kavach VM Deploy Runbook

One-command stack for judges: **MLflow + Kavach backend** on a GCP VM. DataHub quickstart
runs under the optional `datahub` profile when the full GMS stack is needed.

## Provision (GCP)

1. Create an e2-standard-4 VM (Ubuntu 22.04), allow HTTP/HTTPS + SSH.
2. Install Docker + Compose v2:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

3. Clone the repo and configure env:

```bash
git clone https://github.com/doPrashams/kavach.git
cd kavach
cp deploy/.env.example deploy/.env
# Edit deploy/.env — set DATAHUB_GMS_URL, DATAHUB_TOKEN when VM DataHub is live
```

## Start the stack

```bash
cd deploy
docker compose up --build -d
# Optional full DataHub GMS + MCP sidecar (profile):
docker compose --profile datahub up -d
```

### LLM provider

Compose sets `LLM_PROVIDER: ${LLM_PROVIDER:-openai}` (not hardcoded stub). Put a real
`OPENAI_API_KEY` (or Anthropic key) in `deploy/.env` for live agents.

**No-key / offline demo mode:** set `LLM_PROVIDER=stub` in `deploy/.env` (or export it)
so the backend uses StubLLM. Prefer that for CI, judge replay, and `./scripts/seed_demo.sh`
when you do not want to call a paid API.

Verify:

```bash
curl http://localhost:8000/health
curl http://localhost:5000/health   # MLflow
curl http://localhost:8081/health   # mcp-server-datahub (datahub profile)
```

### DataHub MCP sidecar

With `--profile datahub`, Compose starts `mcp-server-datahub` (Streamable HTTP on
port **8081**, JSON-RPC at `/mcp`) with `TOOLS_IS_MUTATION_ENABLED=true`. It reads
`DATAHUB_GMS_URL` / `DATAHUB_TOKEN` (mapped to `DATAHUB_GMS_TOKEN`) from `deploy/.env`.

Local Cursor / Claude without Compose:

```bash
TOOLS_IS_MUTATION_ENABLED=true \
DATAHUB_GMS_URL=http://localhost:8080 \
DATAHUB_GMS_TOKEN="$DATAHUB_TOKEN" \
uvx mcp-server-datahub@latest
```

Repo ships `.cursor/mcp.json` (token via `${DATAHUB_TOKEN}` — never commit secrets).
Kavach’s backend client POSTs JSON-RPC to `{DATAHUB_GMS_URL}/mcp`. For the Compose
sidecar, point Kavach at `http://localhost:8081` (or reverse-proxy `/mcp` onto GMS).
Set `KAVACH_STRICT_DATAHUB=1` so protocol/404 errors raise instead of silent fixtures.

## Seed platform + demo recordings

Runs H01 warehouse build, H02 ML train/register, and records all chaos scenarios (StubLLM, offline):

```bash
./scripts/seed_demo.sh
```

Recordings land in `backend/app/events/recordings/` for zero-key replay in the war room.

## DataHub ingestion (H01 + H02 lineage)

With `DATAHUB_GMS_URL` + `DATAHUB_TOKEN` set in `deploy/.env`:

```bash
cd ../backend && uv run python ../data/pipeline.py build
uv run python ../data/ingestion/queries_seed.py
uv run python ../ml/train.py
uv run python ../ml/lineage.py
```

Create a DataHub PAT (Settings → Access Tokens) and paste into `DATAHUB_TOKEN`.

## Expose token-protected endpoint

1. Put nginx/Caddy in front of port 8000 with basic auth or mTLS.
2. Set `NEXT_PUBLIC_API_URL` on Vercel to the public backend URL (see `VERCEL.md`).
3. Restrict VM firewall to judge IPs if needed.

## Smoke test

After deploy:

```bash
./scripts/smoke.sh
```

Checks `/health`, replays one recording, and confirms `/deck` is reachable on the frontend URL.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `compose config` fails | Run from `deploy/`; ensure Docker Compose v2 |
| Backend unhealthy | For no-key demos set `LLM_PROVIDER=stub` in `.env`; logs: `docker compose logs backend` |
| No recordings | Re-run `./scripts/seed_demo.sh` |
| DataHub unreachable | Agents degrade to fixtures; replay still works offline |
