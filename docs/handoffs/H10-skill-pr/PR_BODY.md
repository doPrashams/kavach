# PR Title

```
feat(skills): add datahub-incident-response skill
```

# PR Body

## Summary

Adds **`datahub-incident-response`** — a reusable skill for end-to-end data incident
response over the DataHub metadata graph: detect → root-cause (lineage + queries) → blast
radius (incl. ML) → fix → write-back (incidents, Context Documents, tags, assertions).

Originated from **[Kavach](https://github.com/doPrashams/kavach)**, our DataHub Agent
Hackathon project: a self-healing data platform where LangGraph agents operate on DataHub's
context graph to detect, diagnose, and remediate pipeline failures automatically.

## What's included

| File | Purpose |
|------|---------|
| `skills/datahub-incident-response/SKILL.md` | Skill definition (frontmatter + procedure) |
| `skills/datahub-incident-response/README.md` | Install + usage |
| `skills/datahub-incident-response/examples/` | 3 worked examples with links to real artifacts |
| `skills/datahub-incident-response/test_skill.py` | Frontmatter + path validation |

## DataHub capabilities covered

- **Lineage** — upstream/downstream + column-level traversal
- **Incidents** — create, update, resolve lifecycle
- **Context Documents** — retrieve prior postmortems + write new ones (Agent Context Kit)
- **Assertions** — emit safeguard tests after remediation
- **ML entities** — blast radius through `mlModel` / `mlModelDeployment`
- **Query history** — root-cause ranking from recent SQL

## Why this skill

Existing skills cover search, lineage exploration, enrichment, and quality audits. None
package the **full incident lifecycle** agents need when production data breaks — especially
when ML deployments are downstream. This fills that gap with a step-by-step procedure distilled
from a working multi-agent system.

## Testing

```bash
pytest skills/datahub-incident-response/test_skill.py -q
```

## Related

- Kavach repo: https://github.com/doPrashams/kavach
- Kavach architecture: https://github.com/doPrashams/kavach/blob/main/docs/ARCHITECTURE.md
- Example Fixer PRs: https://github.com/doPrashams/kavach/tree/main/examples/prs

## Checklist (contribution guidelines)

- [x] Skill follows existing `SKILL.md` frontmatter format (`name`, `description`, triggers)
- [x] Self-contained under `skills/datahub-incident-response/`
- [x] References shared CLI patterns consistent with other skills
- [x] Includes worked examples pointing to real artifacts
- [x] No secrets or environment-specific URLs in skill content
