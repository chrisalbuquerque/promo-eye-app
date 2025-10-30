-- Adicionar campo cidade aos supermercados
ALTER TABLE supermarkets 
ADD COLUMN city TEXT;

-- Adicionar campos de tipo de preço e quantidade mínima
ALTER TABLE sku_price 
ADD COLUMN price_type TEXT DEFAULT 'varejo' CHECK (price_type IN ('varejo', 'atacado')),
ADD COLUMN min_quantity INTEGER DEFAULT 1;

-- Criar índice para melhorar performance de busca por cidade
CREATE INDEX idx_supermarkets_city ON supermarkets(city);

-- Criar índice composto para preços por produto, mercado e tipo
CREATE INDEX idx_sku_price_lookup ON sku_price(product_id, supermarket_id, price_type, captured_at DESC);