# ML Risk Report: schema_drift

**Scenario:** `schema_drift`  
**Severity:** HIGH  
**Recommendation:** MONITOR (no ML hold — staging catches before feature mart)

## Impact

Schema rename breaks staging join; null spike on `next_day_qty` if undetected.
Downstream ML features would receive null-heavy inputs.

## Mitigation

Schema contract test + column alias in Fixer PR.
