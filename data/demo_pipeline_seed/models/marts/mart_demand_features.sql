with daily_qty as (
    select
        oi.product_id,
        o.order_date as feature_date,
        sum(oi.quantity) as daily_qty
    from {{ ref('stg_orders') }} as o
    inner join {{ ref('stg_order_items') }} as oi on o.order_id = oi.order_id
    where o.status = 'completed'
    group by 1, 2
),

enriched as (
    select
        dq.product_id,
        dq.feature_date,
        extract(dow from dq.feature_date) as dow,
        lag(dq.daily_qty, 7) over (
            partition by dq.product_id
            order by dq.feature_date
        ) as lag_7_qty,
        avg(dq.daily_qty) over (
            partition by dq.product_id
            order by dq.feature_date
            rows between 27 preceding and current row
        ) as rolling_28_avg,
        lead(dq.daily_qty, 1) over (
            partition by dq.product_id
            order by dq.feature_date
        ) as next_day_qty,
        p.supplier_id
    from daily_qty as dq
    inner join {{ ref('stg_products') }} as p on dq.product_id = p.product_id
)

select
    e.product_id,
    e.feature_date,
    cast(e.dow as integer) as dow,
    coalesce(e.lag_7_qty, 0) as lag_7_qty,
    coalesce(e.rolling_28_avg, 0) as rolling_28_avg,
    s.reliability_score as supplier_reliability,
    coalesce(e.next_day_qty, 0) as next_day_qty
from enriched as e
inner join {{ ref('stg_suppliers') }} as s on e.supplier_id = s.supplier_id
where e.lag_7_qty is not null
  and e.next_day_qty is not null
