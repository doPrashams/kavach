## Incident: null_spike

**DataHub incident:** urn:li:incident:null_spike

### Root cause

Upstream orders feed injected NULL `customer_id` values propagating to revenue mart.

### Fix applied

- Filter null customers in `stg_orders`
- Add `assert_no_null_customer` test
- PR: [`examples/prs/null_spike/`](../prs/null_spike/)
