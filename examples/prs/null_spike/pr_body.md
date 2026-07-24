## Fix: null spike on orders.customer_id

**DataHub incident:** urn:li:incident:70217b2a-b38d-4ef3-9065-a40039a36a6e
**Root cause:** Upstream orders feed injected NULL customer_id values
**Blast radius:** prod

### Changes
- Coalesce NULL `customer_id` to `UNKNOWN` in `stg_orders`
- Add not_null-style assertion test for downstream guard

### Judging criteria
- Cat 2: null-rate assertion + dbt test
