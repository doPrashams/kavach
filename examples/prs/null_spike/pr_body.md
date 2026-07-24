## Fix: null spike on orders.customer_id

**DataHub incident:** urn:li:incident:null_spike
**Root cause:** Upstream orders feed injected NULL customer_id values
**Blast radius:** n/a

### Changes
- Coalesce NULL `customer_id` to `UNKNOWN` in `stg_orders`
- Add not_null-style assertion test for downstream guard

### Judging criteria
- Cat 2: null-rate assertion + dbt test
