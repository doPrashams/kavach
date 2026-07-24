with product_supplier as (
    select
        p.product_id,
        p.category,
        s.supplier_id,
        s.supplier_name,
        s.region,
        s.reliability_score
    from {{ ref('stg_products') }} as p
    inner join {{ ref('stg_suppliers') }} as s on p.supplier_id = s.supplier_id
),

order_volume as (
    select
        o.order_date,
        oi.product_id,
        sum(oi.quantity) as units_sold
    from {{ ref('stg_orders') }} as o
    inner join {{ ref('stg_order_items') }} as oi on o.order_id = oi.order_id
    where o.status = 'completed'
    group by 1, 2
)

select
    ps.supplier_id,
    ps.supplier_name,
    ps.region,
    ps.reliability_score,
    coalesce(sum(ov.units_sold), 0) as total_units_sold,
    count(distinct ps.product_id) as product_count
from product_supplier as ps
left join order_volume as ov on ps.product_id = ov.product_id
group by 1, 2, 3, 4
