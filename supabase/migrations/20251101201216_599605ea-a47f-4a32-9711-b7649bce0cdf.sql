-- Drop and recreate rpc_compare_two_markets to include wholesale info
DROP FUNCTION IF EXISTS public.rpc_compare_two_markets(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.rpc_compare_two_markets(
  p_list_id uuid,
  p_market_a uuid,
  p_market_b uuid
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  price_a numeric,
  price_b numeric,
  cheaper text,
  missing_in text[],
  has_wholesale_a boolean,
  wholesale_price_a numeric,
  wholesale_qty_a integer,
  has_wholesale_b boolean,
  wholesale_price_b numeric,
  wholesale_qty_b integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH items AS (
    SELECT pm.id AS product_id, pm.name AS product_name
    FROM shopping_list_item sli
    JOIN shopping_list sl ON sl.id = sli.list_id
    JOIN product_master pm ON pm.id = sli.product_id
    WHERE sl.id = p_list_id AND sl.user_id = auth.uid()
  ),
  latest_retail AS (
    SELECT DISTINCT ON (sp.supermarket_id, sp.product_id)
      sp.supermarket_id,
      sp.product_id,
      sp.price
    FROM sku_price sp
    WHERE sp.supermarket_id IN (p_market_a, p_market_b)
      AND sp.price_type = 'varejo'
    ORDER BY sp.supermarket_id, sp.product_id, sp.captured_at DESC
  ),
  latest_wholesale AS (
    SELECT DISTINCT ON (sp.supermarket_id, sp.product_id)
      sp.supermarket_id,
      sp.product_id,
      sp.price,
      sp.min_quantity
    FROM sku_price sp
    WHERE sp.supermarket_id IN (p_market_a, p_market_b)
      AND sp.price_type = 'atacado'
    ORDER BY sp.supermarket_id, sp.product_id, sp.captured_at DESC
  )
  SELECT
    i.product_id,
    i.product_name,
    MAX(CASE WHEN lr.supermarket_id = p_market_a THEN lr.price END) AS price_a,
    MAX(CASE WHEN lr.supermarket_id = p_market_b THEN lr.price END) AS price_b,
    CASE
      WHEN MAX(CASE WHEN lr.supermarket_id = p_market_a THEN lr.price END) IS NULL 
        AND MAX(CASE WHEN lr.supermarket_id = p_market_b THEN lr.price END) IS NULL THEN NULL
      WHEN COALESCE(MAX(CASE WHEN lr.supermarket_id = p_market_a THEN lr.price END), 1e9) 
        < COALESCE(MAX(CASE WHEN lr.supermarket_id = p_market_b THEN lr.price END), 1e9) THEN 'A'
      WHEN COALESCE(MAX(CASE WHEN lr.supermarket_id = p_market_a THEN lr.price END), 1e9) 
        > COALESCE(MAX(CASE WHEN lr.supermarket_id = p_market_b THEN lr.price END), 1e9) THEN 'B'
      ELSE 'equal'
    END AS cheaper,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN MAX(CASE WHEN lr.supermarket_id = p_market_a THEN lr.price END) IS NULL THEN 'A' END,
      CASE WHEN MAX(CASE WHEN lr.supermarket_id = p_market_b THEN lr.price END) IS NULL THEN 'B' END
    ], NULL) AS missing_in,
    MAX(CASE WHEN lw.supermarket_id = p_market_a THEN lw.price END) IS NOT NULL AS has_wholesale_a,
    MAX(CASE WHEN lw.supermarket_id = p_market_a THEN lw.price END) AS wholesale_price_a,
    MAX(CASE WHEN lw.supermarket_id = p_market_a THEN lw.min_quantity END) AS wholesale_qty_a,
    MAX(CASE WHEN lw.supermarket_id = p_market_b THEN lw.price END) IS NOT NULL AS has_wholesale_b,
    MAX(CASE WHEN lw.supermarket_id = p_market_b THEN lw.price END) AS wholesale_price_b,
    MAX(CASE WHEN lw.supermarket_id = p_market_b THEN lw.min_quantity END) AS wholesale_qty_b
  FROM items i
  LEFT JOIN latest_retail lr ON lr.product_id = i.product_id
  LEFT JOIN latest_wholesale lw ON lw.product_id = i.product_id AND lw.supermarket_id = lr.supermarket_id
  GROUP BY i.product_id, i.product_name
  ORDER BY i.product_name;
$function$;