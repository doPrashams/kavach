select
    customer_id,
    customer_name,
    lower(trim(email)) as email,
    lower(trim(loyalty_tier)) as loyalty_tier
from {{ source('raw', 'customers') }}
