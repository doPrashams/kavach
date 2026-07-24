# Video Script + Shot List (3 minutes)

Record screen + voiceover per [`handoffs/H12-submission/SUBMIT.md`](handoffs/H12-submission/SUBMIT.md).

## Timestamps

| Time | Section | Visual | Narration |
|------|---------|--------|-----------|
| 0:00 | Hook | Black → red dashboard flash → Kavach logo | "Your data platform breaks at two AM. Dashboards go red. On-call scrambles across five tabs. Kavach is the war room that fixes it automatically." |
| 0:20 | Chaos inject | War room → Chaos panel → inject `value_corruption` | "We inject real failures — corrupted line totals — into a live DuckDB warehouse. Watch Sentinel confirm the anomaly through DataHub assertions." |
| 0:45 | Investigation | Agent feed scrolling; lineage graph highlights | "Investigator walks upstream lineage and query history. Impact Analyst maps blast radius. ML Guardian sees the demand forecast deployment at risk — and recommends a hold." |
| 1:10 | Fix | PR card appears; show diff in `examples/prs/value_corruption` | "Fixer generates a dbt PR — clean the outliers, add a range assertion — without a human writing SQL." |
| 1:35 | Write-back | Postmortem card; DataHub incident resolved | "Scribe writes the postmortem back to DataHub as a Context Document. Incident resolved. Tags and assertions updated." |
| 2:00 | Flywheel | MTTR chart — 3.0s → 0.2s on repeat | "Run schema drift again. The flywheel kicks in — a prior postmortem is cited — and MTTR drops fifteen-fold." |
| 2:10 | Analytics Agent | Ask DataHub panel: "what broke orders this week?" | "Ask DataHub in plain English. After write-back, answers include the postmortem context." |
| 2:40 | DataHub recap | Split screen: capability matrix from README | "Every agent action touches DataHub — lineage, incidents, ML entities, Context Documents, MCP tools." |
| 2:55 | OSS + close | `/deck` OSS slide; skill README | "We contribute the incident-response skill to datahub-skills so your team can adopt the same playbook. Kavach — self-healing data, powered by DataHub." |

## Shot list (ordered)

1. **Title card** — Kavach tagline (5s)
2. **War room wide** — full UI at localhost:3000 (10s)
3. **Chaos inject** — select scenario, click inject, SSE feed starts (15s)
4. **Blast radius graph** — zoom React Flow ML deployment node (10s)
5. **PR card** — expand Fixer output (10s)
6. **Postmortem card** — scroll markdown (8s)
7. **Replay mode** — zero-key replay from recordings dropdown (12s)
8. **MTTR chart** — before/after bars (10s)
9. **Analytics Agent** — type question, show answer (15s)
10. **`/deck`** — scroll 2–3 slides (15s)
11. **Closing** — README matrix + GitHub repo (10s)

## Exact narration (full script)

```
[0:00] Your data platform breaks at two AM. Dashboards go red. On-call scrambles across
five tabs — lineage here, Slack there, a stale runbook somewhere else. Kavach is the war
room that detects, investigates, fixes, and learns — automatically.

[0:20] We run a real retail pipeline in DuckDB and dbt, registered in DataHub with full ML
lineage. One click injects chaos — value corruption on order line totals — and Sentinel
confirms it through DataHub assertions and a new incident.

[0:45] Investigator walks upstream lineage and query history to find the root cause.
Impact Analyst maps downstream dashboards. ML Guardian traverses the feature-to-deployment
graph and recommends holding production until the fix lands.

[1:10] Fixer generates a dbt pull request — clean the outliers, add a safeguard test —
ready for review in our demo pipeline repo.

[1:35] Scribe writes the postmortem to DataHub as a Context Document, resolves the
incident, and tags the mart. Every step is auditable in metadata.

[2:00] Inject the same schema drift again. The flywheel retrieves a prior postmortem —
MTTR drops from three seconds to two tenths. The platform literally gets smarter.

[2:10] The Analytics Agent answers plain-English questions about what broke — grounded
in the metadata we just wrote back.

[2:40] Lineage, incidents, assertions, ML entities, Context Documents, MCP — Kavach uses
DataHub as the single source of truth for every agent decision.

[2:55] We're contributing the datahub-incident-response skill upstream so any team can
run this playbook. Kavach — self-healing data, powered by DataHub.
```

## Recording tips

- Use **replay mode** (no API keys) for deterministic demo
- Capture 1920×1080, 30fps
- Keep war room dark theme for contrast
- Export GIF for README (15s loop of agent feed + graph)
