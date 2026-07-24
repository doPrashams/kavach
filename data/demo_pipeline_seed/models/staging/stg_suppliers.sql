select
    supplier_id,
    supplier_name,
    lower(trim(region)) as region,
    cast(reliability_score as double) as reliability_score
from {{ source('raw', 'suppliers') }}
