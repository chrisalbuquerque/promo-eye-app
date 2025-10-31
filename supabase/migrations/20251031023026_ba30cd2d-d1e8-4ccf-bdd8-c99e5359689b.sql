-- Criar função para listar produtos faltantes de um supermercado
CREATE OR REPLACE FUNCTION public.rpc_get_missing_products(
  p_list_id uuid,
  p_supermarket_id uuid
)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  cheapest_price numeric,
  cheapest_supermarket_id uuid,
  cheapest_supermarket_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH list_products AS (
    SELECT pm.id AS product_id, pm.name AS product_name
    FROM shopping_list_item sli
    JOIN shopping_list sl ON sl.id = sli.list_id
    JOIN product_master pm ON pm.id = sli.product_id
    WHERE sl.id = p_list_id AND sl.user_id = auth.uid()
  ),
  available_prices AS (
    SELECT DISTINCT ON (sp.product_id)
      sp.product_id,
      sp.supermarket_id,
      sp.price
    FROM sku_price sp
    WHERE sp.price_type = 'varejo'
    ORDER BY sp.product_id, sp.captured_at DESC
  ),
  missing_in_target AS (
    SELECT lp.product_id, lp.product_name
    FROM list_products lp
    WHERE NOT EXISTS (
      SELECT 1 FROM available_prices ap
      WHERE ap.product_id = lp.product_id
        AND ap.supermarket_id = p_supermarket_id
    )
  ),
  cheapest_alternatives AS (
    SELECT DISTINCT ON (mit.product_id)
      mit.product_id,
      mit.product_name,
      ap.price,
      ap.supermarket_id,
      s.name AS supermarket_name
    FROM missing_in_target mit
    JOIN available_prices ap ON ap.product_id = mit.product_id
    JOIN supermarkets s ON s.id = ap.supermarket_id
    WHERE s.status = 'active'
    ORDER BY mit.product_id, ap.price ASC
  )
  SELECT
    ca.product_id,
    ca.product_name,
    ca.price AS cheapest_price,
    ca.supermarket_id AS cheapest_supermarket_id,
    ca.supermarket_name AS cheapest_supermarket_name
  FROM cheapest_alternatives ca
  ORDER BY ca.product_name;
$function$;

-- Atualizar função rpc_calculate_totals para ordenar por produtos encontrados primeiro, depois por preço
CREATE OR REPLACE FUNCTION public.rpc_calculate_totals(p_list_id uuid)
RETURNS TABLE(
  supermarket_id uuid,
  supermarket_name text,
  found_count bigint,
  missing_count bigint,
  total_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH items AS (
    SELECT sli.product_id, sli.quantity
    FROM shopping_list_item sli
    JOIN shopping_list sl ON sl.id = sli.list_id
    WHERE sl.id = p_list_id AND sl.user_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON (sp.supermarket_id, sp.product_id)
      sp.supermarket_id,
      sp.product_id,
      sp.price
    FROM sku_price sp
    WHERE sp.price_type = 'varejo'
    ORDER BY sp.supermarket_id, sp.product_id, sp.captured_at DESC
  )
  SELECT
    s.id,
    s.name,
    COUNT(l.product_id) FILTER (WHERE l.price IS NOT NULL) AS found_count,
    COUNT(i.product_id) - COUNT(l.product_id) FILTER (WHERE l.price IS NOT NULL) AS missing_count,
    COALESCE(SUM(l.price * i.quantity), 0) AS total_amount
  FROM supermarkets s
  CROSS JOIN items i
  LEFT JOIN latest l ON l.product_id = i.product_id AND l.supermarket_id = s.id
  WHERE s.status = 'active'
  GROUP BY s.id, s.name
  ORDER BY found_count DESC, total_amount ASC NULLS LAST;
$function$;