# ML Risk Report: value_corruption

**Scenario:** `value_corruption`  
**Assessment agent:** ML Guardian  
**Severity:** CRITICAL  
**Recommendation:** HOLD deployment

## Lineage path

```
raw.order_items.line_total
  → main_staging.stg_order_items
  → main_marts.mart_demand_features.next_day_qty
  → mlFeature:* (product_id, dow, lag_7_qty, ...)
  → mlModel:kavach.demand_forecast
  → mlModelDeployment:kavach.demand_forecast.prod
```

## Risk summary

Corrupted line totals skew demand features fed to the production forecast model.
Serving corrupted predictions risks revenue planning errors.

## Safeguard

- Fixer adds range assertion on `stg_order_items.line_total`
- Hold prod deployment until PR merges and assertion passes
- Evidence: [`examples/prs/value_corruption/pr_body.md`](../prs/value_corruption/pr_body.md)

## DataHub entities touched

- Blast radius traversal (dataset + ML deployment)
- Incident + Context Document write-back
- Assertion emit on safeguard test
