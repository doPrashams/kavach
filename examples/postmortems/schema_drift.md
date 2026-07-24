## Incident: schema_drift

**DataHub incident:** urn:li:incident:schema_drift

### Root cause

Supplier feed renamed `quantity` to `qty` and changed type to string, breaking
`stg_order_items` → `mart_demand_features`.

### Fix applied

- Alias `qty AS quantity` in staging model
- Schema contract test in dbt
- PR: [`examples/prs/schema_drift/`](../prs/schema_drift/)

### Flywheel note

Repeat incidents cite this postmortem — MTTR drops from 3.0s to 0.2s.
