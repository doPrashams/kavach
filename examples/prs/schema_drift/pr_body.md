## Fix: schema drift on order_items

**DataHub incident:** urn:li:incident:4ace0924-f42e-415f-bd31-937e6c47db99
**Root cause:** Supplier feed renamed quantity to qty and changed type to string, breaking stg_order_items → mart_demand_features
**Blast radius:** prod

### Changes
- Cast `coalesce(quantity, qty)` in `stg_order_items` to absorb supplier rename
- Document quantity column + not_null test in `schema.yml`

### Judging criteria
- Cat 2: schema assertion + dbt model patch
- DataHub: incident-linked remediation with blast radius awareness
