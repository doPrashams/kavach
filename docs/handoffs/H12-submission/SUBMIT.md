# H12 — Final submission checklist (human steps)

All assets are in-repo. Verify passed offline. Complete these steps to submit.

## Pre-flight

```bash
docs/handoffs/H12-submission/verify.sh
cd backend && uv run pytest -q tests/test_submission.py
```

Skim [`README.md`](../../../README.md), [`docs/JUDGING.md`](../../JUDGING.md), [`docs/VIDEO.md`](../../VIDEO.md), [`docs/DEVPOST.md`](../../DEVPOST.md).

## 1. Record demo video (~3 min)

Follow [`docs/VIDEO.md`](../../VIDEO.md) script + shot list.

- Use replay mode (zero API keys) for deterministic footage
- Capture war room, chaos inject, PR card, MTTR chart, Analytics Agent, `/deck`
- Export MP4 (1080p) for Devpost upload
- Optional: 15s GIF loop for README hero

## 2. Voiceover

- Record your voice reading the narration lines in `VIDEO.md`, **or**
- Approve an AI voice tool (ElevenLabs, etc.) — note choice in Devpost

## 3. Deploy (if not already live)

- **VM:** [`deploy/README.md`](../../../deploy/README.md) — `docker compose up`, `./scripts/seed_demo.sh`
- **Vercel:** [`deploy/VERCEL.md`](../../../deploy/VERCEL.md) — set `NEXT_PUBLIC_API_URL`
- Smoke: `./deploy/scripts/smoke.sh`

## 4. OSS skill PR (bonus)

[`docs/handoffs/H10-skill-pr/SUBMIT.md`](../H10-skill-pr/SUBMIT.md) — fork datahub-skills, open PR.

## 5. Devpost submit (early!)

1. https://agent-hackathon.devpost.com (or current hackathon URL)
2. Paste copy from [`docs/DEVPOST.md`](../../DEVPOST.md)
3. Upload video
4. Add repo link: https://github.com/doPrashams/kavach
5. Select all 4 categories + note OSS bonus
6. Attach screenshot of war room + `/deck`

## 6. Community (+$50 bonus)

1. Join DataHub Slack → `#agent-hackathon`
2. Share project link + one-line pitch
3. Complete the post-hackathon feedback survey when emailed

## 7. Final repo polish (optional)

- [ ] Add hero GIF to README
- [ ] Update OSS skill link after upstream PR merges
- [ ] Pin Vercel deployment URL in README
