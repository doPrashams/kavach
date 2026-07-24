## Fix: schema drift on order_items

**DataHub incident:** urn:li:incident:7bfb361b-a802-4df1-ba29-46aabf6d7b4b
**Root cause:** Supplier feed renamed quantity to qty and changed type to string, breaking stg_order_items → mart_demand_features
**Blast radius:** prod

### Changes
- Cast `coalesce(quantity, qty)` in `stg_order_items` to absorb supplier rename
- Document quantity column + not_null test in `schema.yml`

### Judging criteria
- Cat 2: schema assertion + dbt model patch
- DataHub: incident-linked remediation with blast radius awareness
