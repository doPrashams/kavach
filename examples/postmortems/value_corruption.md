## Incident: value_corruption

**DataHub incident:** urn:li:incident:value_corruption  
**Severity:** critical (ML deployment hold)

### Root cause

Corrupted `order_items.line_total` values (negative and 100× spikes) skewing
`mart_demand_features.next_day_qty`.

### Blast radius

- `raw.order_items` → `main_staging.stg_order_items` → `main_marts.mart_demand_features`
- ML: `kavach.demand_forecast` → **prod deployment** (hold recommended)

### Fix applied

- Clean negative and 100× outliers in `stg_order_items`
- Add `assert_line_total_range` test
- PR: [`examples/prs/value_corruption/`](../prs/value_corruption/)

### Tags

`postmortem`, `incident`, `value_corruption`, `incident-resolved`
