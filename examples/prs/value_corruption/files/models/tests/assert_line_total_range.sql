select *
from {{ ref('stg_order_items') }}
where line_total < 0 or line_total > 100000
