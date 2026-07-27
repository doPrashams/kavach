# PR Title

```
docs: agent write-back patterns for incidents, context docs, and tags
```

# PR Body

## Summary

Documents **agent write-back patterns** for production incident-response agents operating on
DataHub: how to open/resolve **Incidents**, persist **Context Documents** (postmortems),
apply **tags** / glossary terms (including PII / HIPAA-oriented labels), and keep write-backs
idempotent and auditable.

Originated from **[Kavach](https://github.com/doPrashams/kavach)** (DataHub Agent Hackathon):
LangGraph agents detect → diagnose → fix → **write back** so the next incident is faster.

## Why this docs contribution

Skills and tools cover *reading* the metadata graph well. Operators still need a clear,
copy-pasteable pattern for *writing* state back so:

1. Incidents have a correct lifecycle (active → fixed / resolved) with links to PRs
2. Postmortems land as Context Documents retrievable by future agents (RAG / Context Kit)
3. Tags and glossary terms (e.g. PII, HIPAA) stay consistent for governance and search
4. Write-backs are safe under retries (deterministic keys / upsert semantics)

## Proposed outline (docs page or skill appendix)

1. **When to write back** — after root-cause confidence + remediation started/finished
2. **Incidents API pattern** — create on detect; update with blast radius; resolve with fix URL
3. **Context Documents** — structure (timeline, root cause, blast radius, fix, prevention);
   retrieve-before-write to avoid duplicates
4. **Tags & glossary** — PII / sensitivity labels; ownership; domain (`systems` vs `humans`)
5. **Assertions** — emit post-fix safeguards so Sentinel catches regressions
6. **Anti-patterns** — silent failures, overwriting human postmortems, tagging without evidence

## Relation to datahub-incident-response skill

Complements the `datahub-incident-response` skill PR: that skill encodes the procedure; this
doc explains the **write-back contract** agents must honor so the knowledge flywheel works.

## Checklist

- [ ] Links to official DataHub incident / Context Document docs
- [ ] Example payloads or CLI/MCP snippets
- [ ] Mentions Kavach as a reference implementation
