# What you still need to do (exact)

Agent work for H13–H26 is done. Your remaining checklist:

## 1. Rotate the OpenAI key (now)
The key was pasted in chat — revoke/rotate at https://platform.openai.com/api-keys  
Then update `backend/.env` with the new key if you keep building locally.

## 2. Skills PR — cannot merge yourself
Opened: https://github.com/datahub-project/datahub-skills/pull/61  
Upstream branch protection blocks merge from us. **Watch CI**, reply to review comments if any. Merge only after a DataHub maintainer approves (or they merge it).

Optional second OSS docs PR: draft at `docs/handoffs/H18-oss-bonus/DOCS_PR.md` — open when ready.

## 3. Record the 3-minute video
Script: `docs/VIDEO.md` (includes healthcare + Atlas beats).  
Upload to YouTube **public**. Keep under 3 minutes.

## 4. Submit on Devpost (by Aug 8, not the deadline)
Copy from `docs/DEVPOST.md`.  
- Project URL: https://kavach-self.vercel.app  
- Repo: https://github.com/doPrashams/kavach (Apache-2.0)  
- Claim **all 4** challenge categories  
- Opt into the **feedback survey** ($50 bonus)  
- Attach video + screenshots

## 5. Join DataHub Slack
https://datahub.com/slack → `#agent-hackathon`  
Mention the skill PR + live demo. Attend office hours if offered.

## 6. DataHub Cloud trial — only Aug 10–11
Start: https://datahub.com/free-trial/  
**Do not start earlier** — 21 days must cover judging Aug 17–31.  
Then point the live demo at Cloud MCP and optionally record an Ask DataHub beat for the video if you re-cut.

## 7. After Sep 1 — tear down GCP
Stop VM (already stopped). Delete 60GB disk + release static IP `34.60.67.85` so ~$13/mo does not keep billing. Commands in `docs/handoffs/H20-vm-datapacks/RUN.md`.

## Admin Activity log
Activity log is PIN-gated. Enter your admin code when prompted (SHA-256 only is in the repo — not the PIN).  
API `/api/admin/audit` also requires the same code via `x-admin-token`.

## After next deploy — spot-check probe links
1. **Systems** → Live data probe provider → NYC TLC (cityofnewyork.us)
2. **Humans** → healthcare/PHI scenario → Synthea (`synthetichealth.github.io/synthea`) — never taxi
3. Atlas → **Two use cases** above Stack; Play site tour → step 0 domains
