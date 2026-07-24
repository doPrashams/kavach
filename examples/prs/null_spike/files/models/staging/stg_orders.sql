select
    order_id,
    coalesce(customer_id, 'UNKNOWN') as customer_id,
    cast(order_date as date) as order_date,
    lower(trim(status)) as status
from {{ source('raw', 'orders') }}
