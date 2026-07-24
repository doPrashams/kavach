with completed_items as (
    select
        o.order_date,
        oi.line_total
    from {{ ref('stg_orders') }} as o
    inner join {{ ref('stg_order_items') }} as oi on o.order_id = oi.order_id
    where o.status = 'completed'
)

select
    order_date,
    round(sum(line_total), 2) as gross_revenue,
    count(*) as line_count
from completed_items
group by 1
