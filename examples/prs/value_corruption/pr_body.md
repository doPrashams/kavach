## Fix: value corruption on order_items.line_total

**DataHub incident:** urn:li:incident:value_corruption
**Root cause:** Corrupted order_items.line_total values (negative and 100x spikes) skewing mart_demand_features
**Blast radius:** n/a

### ML Guardian safeguard
Monitor deployment.
Assertion: line_total range guard on stg_order_items

Protects `mart_demand_features` → `kavach.demand_forecast.prod` from corrupted inputs.

### Changes
- Clean negative and 100x outliers in `stg_order_items`
- Add range assertion test

### Judging criteria
- Cat 2: data quality assertion + transform
- ML lineage: deployment safeguard note tied to DataHub blast radius
