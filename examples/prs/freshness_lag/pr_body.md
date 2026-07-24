## Fix: freshness lag on orders feed

**DataHub incident:** urn:li:incident:239d2ce1-f7f7-46ff-8cf0-de4248f34134
**Root cause:** Orders feed stopped updating; mart_daily_revenue freshness exceeded SLA
**Blast radius:** prod

### Changes
- Add freshness SLA on `raw.orders` in sources.yml
- Generate Airflow-style backfill DAG artifact for ops handoff

### Judging criteria
- Cat 2: freshness assertion + orchestration artifact breadth
