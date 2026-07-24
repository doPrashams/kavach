# Vercel Frontend Deploy (human steps)

Deploy the Kavach war room (`/`) and demo deck (`/deck`) to Vercel Hobby ($0).

## 1. Link project

1. Sign in at https://vercel.com with GitHub.
2. **Add New Project** → import `doPrashams/kavach`.
3. Set **Root Directory** to `frontend`.
4. Framework preset: **Next.js** (auto-detected).

## 2. Environment variables

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | Public backend URL (GCP VM), e.g. `https://api.kavach.example.com` |
| `NEXT_PUBLIC_OFFLINE_MODE` | `false` when backend is live; `true` for fixture-only demo |

## 3. Deploy

1. Click **Deploy** (uses `frontend/vercel.json` rewrites if present).
2. Confirm routes:
   - `/` — war room UI
   - `/deck` — animated hackathon deck

## 4. Post-deploy smoke

```bash
cd deploy
FRONTEND_URL=https://your-app.vercel.app ./scripts/smoke.sh
```

## 5. Custom domain (optional)

Add domain in Vercel → Project Settings → Domains. Point DNS CNAME to Vercel.
