-- Função para buscar produtos encontrados em um supermercado específico
CREATE OR REPLACE FUNCTION public.rpc_get_found_products(p_list_id uuid, p_supermarket_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  price numeric,
  quantity numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH list_products AS (
    SELECT 
      pm.id AS product_id,
      pm.name AS product_name,
      sli.quantity
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
      AND sp.supermarket_id = p_supermarket_id
    ORDER BY sp.product_id, sp.captured_at DESC
  )
  SELECT
    lp.product_id,
    lp.product_name,
    ap.price,
    lp.quantity
  FROM list_products lp
  JOIN available_prices ap ON ap.product_id = lp.product_id
  ORDER BY lp.product_name;
$function$;

-- Atualizar função de produtos faltantes para incluir quantidade
DROP FUNCTION IF EXISTS public.rpc_get_missing_products(uuid, uuid);

CREATE OR REPLACE FUNCTION public.rpc_get_missing_products(p_list_id uuid, p_supermarket_id uuid)
RETURNS TABLE(
  product_id uuid,
  product_name text,
  cheapest_price numeric,
  cheapest_supermarket_id uuid,
  cheapest_supermarket_name text,
  quantity numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH list_products AS (
    SELECT 
      pm.id AS product_id,
      pm.name AS product_name,
      sli.quantity
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
    SELECT lp.product_id, lp.product_name, lp.quantity
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
      mit.quantity,
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
    ca.supermarket_name AS cheapest_supermarket_name,
    ca.quantity
  FROM cheapest_alternatives ca
  ORDER BY ca.product_name;
$function$;