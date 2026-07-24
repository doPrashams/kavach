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
# Optional full DataHub GMS (profile):
docker compose --profile datahub up -d
```

Verify:

```bash
curl http://localhost:8000/health
curl http://localhost:5000/health   # MLflow
```

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
| Backend unhealthy | Check `LLM_PROVIDER=stub` for demo; logs: `docker compose logs backend` |
| No recordings | Re-run `./scripts/seed_demo.sh` |
| DataHub unreachable | Agents degrade to fixtures; replay still works offline |
