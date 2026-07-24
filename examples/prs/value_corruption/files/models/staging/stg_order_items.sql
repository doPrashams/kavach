select
    order_item_id,
    order_id,
    product_id,
    cast(quantity as integer) as quantity,
    case
        when cast(line_total as double) < 0 then abs(cast(line_total as double))
        when cast(line_total as double) > 100000 then cast(line_total as double) / 100
        else cast(line_total as double)
    end as line_total
from {{ source('raw', 'order_items') }}
