## Incident: freshness_lag

**DataHub incident:** urn:li:incident:freshness_lag

### Root cause

Orders feed stopped updating; `mart_daily_revenue` freshness exceeded SLA.

### Fix applied

- Backfill DAG for stale orders partition
- Widen source freshness window in `sources.yml`
- PR: [`examples/prs/freshness_lag/`](../prs/freshness_lag/)
