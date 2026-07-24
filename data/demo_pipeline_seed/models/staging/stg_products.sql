select
    product_id,
    product_name,
    lower(trim(category)) as category,
    cast(unit_price as double) as unit_price,
    supplier_id
from {{ source('raw', 'products') }}
