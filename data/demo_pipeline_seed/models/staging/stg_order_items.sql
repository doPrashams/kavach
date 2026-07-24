select
    order_item_id,
    order_id,
    product_id,
    cast(quantity as integer) as quantity,
    cast(line_total as double) as line_total
from {{ source('raw', 'order_items') }}
