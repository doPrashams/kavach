# What you still need to do (exact)

## v1 submit day (do these in order)

1. **Rotate OpenAI key** — https://platform.openai.com/api-keys (key was pasted in chat earlier)
2. **Record 3-min video** — script [`docs/VIDEO.md`](../../VIDEO.md); YouTube **public**; use Replay (zero keys)
3. **2–4 screenshots** — war room Systems + Humans, Atlas “Two use cases”, Fixer PR / MTTR (drop in `docs/media/` optional)
4. **Devpost** — paste [`docs/DEVPOST.md`](../../DEVPOST.md)
   - Demo: https://kavach-self.vercel.app
   - Repo: https://github.com/doPrashams/kavach (Apache-2.0)
   - Claim **all 4** categories + OSS bonus (skill PR link)
   - Opt into **feedback survey** ($50)
   - Attach video + screenshots
5. **Slack** — https://datahub.com/slack → `#agent-hackathon` (demo + skill PR)
6. **Remind agent later:** merge skills PR when approved · re-run prize-gap audit · Cloud trial Aug 10–11 only

Full click-path: [`H12-submission/SUBMIT.md`](H12-submission/SUBMIT.md)

---

## Skills PR — cannot merge yourself
Opened: https://github.com/datahub-project/datahub-skills/pull/61  
Watch CI / review comments. Merge only after a DataHub maintainer approves.

Optional second OSS docs PR draft: `docs/handoffs/H18-oss-bonus/DOCS_PR.md`

## DataHub Cloud trial — only Aug 10–11
https://datahub.com/free-trial/  
**Do not start earlier** — 21 days must cover judging Aug 17–31.

## After Sep 1 — tear down GCP
VM is TERMINATED. Then delete 60GB disk + release static IP `34.60.67.85`.  
Commands: `docs/handoffs/H20-vm-datapacks/RUN.md`.

## Admin Activity log
PIN-gated in UI. SHA-256 digest only is in repo (`frontend/lib/admin-gate.ts`).  
API `/api/admin/audit` requires `x-admin-token`.

## Spot-check before submit (2 min)
1. **Systems** → probe → NYC TLC
2. **Humans** → PHI → Synthea (not taxi)
3. Atlas → **Two use cases**; site tour step 0 domains
4. Replay any scenario (no API keys)
5. `/api/health` → `status: ok` (DataHub optional may show offline — expected)
