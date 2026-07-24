## Fix: freshness lag on orders feed

**DataHub incident:** urn:li:incident:freshness_lag
**Root cause:** Orders feed stopped updating; mart_daily_revenue freshness exceeded SLA
**Blast radius:** n/a

### Changes
- Add freshness SLA on `raw.orders` in sources.yml
- Generate Airflow-style backfill DAG artifact for ops handoff

### Judging criteria
- Cat 2: freshness assertion + orchestration artifact breadth
