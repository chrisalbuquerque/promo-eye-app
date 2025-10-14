-- Criar tipo enum para roles
CREATE TYPE public.app_role AS ENUM ('user', 'admin');

-- Tabela de perfis
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de roles separada (segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Função para verificar role (security definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Tabela de supermercados
CREATE TABLE public.supermarkets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  address TEXT,
  geolocation JSONB,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela mestre de produtos
CREATE TABLE public.product_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  ean TEXT UNIQUE,
  category TEXT,
  unit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para busca de produtos
CREATE INDEX idx_product_master_search ON public.product_master 
USING GIN (to_tsvector('portuguese', COALESCE(name,'') || ' ' || COALESCE(brand,'')));

-- Tabela de preços (SKU)
CREATE TABLE public.sku_price (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supermarket_id UUID REFERENCES public.supermarkets(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.product_master(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC NOT NULL CHECK (price >= 0),
  unit_size TEXT,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT CHECK (source IN ('ocr', 'api', 'csv', 'manual')) DEFAULT 'manual',
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscar preços mais recentes
CREATE INDEX idx_sku_price_latest ON public.sku_price (supermarket_id, product_id, captured_at DESC);

-- Tabela de listas de compras
CREATE TABLE public.shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de itens da lista
CREATE TABLE public.shopping_list_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.shopping_list(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.product_master(id) ON DELETE RESTRICT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity >= 1) DEFAULT 1,
  notes TEXT
);

-- Tabela de lotes OCR
CREATE TABLE public.ocr_batch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('uploaded', 'processing', 'review', 'done', 'error')) DEFAULT 'uploaded',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de itens OCR
CREATE TABLE public.ocr_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.ocr_batch(id) ON DELETE CASCADE NOT NULL,
  raw_text TEXT,
  matched_product_id UUID REFERENCES public.product_master(id),
  confidence NUMERIC,
  meta JSONB
);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Função para criar perfil ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS para profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins podem ver todos os perfis"
  ON public.profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias roles"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para supermarkets
ALTER TABLE public.supermarkets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver supermercados"
  ON public.supermarkets FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar supermercados"
  ON public.supermarkets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para product_master
ALTER TABLE public.product_master ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver produtos"
  ON public.product_master FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar produtos"
  ON public.product_master FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para sku_price
ALTER TABLE public.sku_price ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver preços"
  ON public.sku_price FOR SELECT
  USING (true);

CREATE POLICY "Admins podem gerenciar preços"
  ON public.sku_price FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para shopping_list
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver próprias listas"
  ON public.shopping_list FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Usuários podem gerenciar próprias listas"
  ON public.shopping_list FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Admins podem ver todas as listas"
  ON public.shopping_list FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para shopping_list_item
ALTER TABLE public.shopping_list_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver itens de suas listas"
  ON public.shopping_list_item FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_list
      WHERE id = shopping_list_item.list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Usuários podem gerenciar itens de suas listas"
  ON public.shopping_list_item FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.shopping_list
      WHERE id = shopping_list_item.list_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins podem ver todos os itens"
  ON public.shopping_list_item FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para ocr_batch
ALTER TABLE public.ocr_batch ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar lotes OCR"
  ON public.ocr_batch FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS para ocr_item
ALTER TABLE public.ocr_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem gerenciar itens OCR"
  ON public.ocr_item FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RPC: Calcular totais por supermercado
CREATE OR REPLACE FUNCTION public.rpc_calculate_totals(p_list_id UUID)
RETURNS TABLE(
  supermarket_id UUID,
  supermarket_name TEXT,
  found_count BIGINT,
  missing_count BIGINT,
  total_amount NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
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
  ORDER BY total_amount ASC NULLS LAST;
$$;

-- RPC: Comparar dois mercados
CREATE OR REPLACE FUNCTION public.rpc_compare_two_markets(
  p_list_id UUID,
  p_market_a UUID,
  p_market_b UUID
)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  price_a NUMERIC,
  price_b NUMERIC,
  cheaper TEXT,
  missing_in TEXT[]
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  WITH items AS (
    SELECT pm.id AS product_id, pm.name AS product_name
    FROM shopping_list_item sli
    JOIN shopping_list sl ON sl.id = sli.list_id
    JOIN product_master pm ON pm.id = sli.product_id
    WHERE sl.id = p_list_id AND sl.user_id = auth.uid()
  ),
  latest AS (
    SELECT DISTINCT ON (sp.supermarket_id, sp.product_id)
      sp.supermarket_id,
      sp.product_id,
      sp.price
    FROM sku_price sp
    WHERE sp.supermarket_id IN (p_market_a, p_market_b)
    ORDER BY sp.supermarket_id, sp.product_id, sp.captured_at DESC
  )
  SELECT
    i.product_id,
    i.product_name,
    MAX(CASE WHEN l.supermarket_id = p_market_a THEN l.price END) AS price_a,
    MAX(CASE WHEN l.supermarket_id = p_market_b THEN l.price END) AS price_b,
    CASE
      WHEN MAX(CASE WHEN l.supermarket_id = p_market_a THEN l.price END) IS NULL 
        AND MAX(CASE WHEN l.supermarket_id = p_market_b THEN l.price END) IS NULL THEN NULL
      WHEN COALESCE(MAX(CASE WHEN l.supermarket_id = p_market_a THEN l.price END), 1e9) 
        < COALESCE(MAX(CASE WHEN l.supermarket_id = p_market_b THEN l.price END), 1e9) THEN 'A'
      WHEN COALESCE(MAX(CASE WHEN l.supermarket_id = p_market_a THEN l.price END), 1e9) 
        > COALESCE(MAX(CASE WHEN l.supermarket_id = p_market_b THEN l.price END), 1e9) THEN 'B'
      ELSE 'equal'
    END AS cheaper,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN MAX(CASE WHEN l.supermarket_id = p_market_a THEN l.price END) IS NULL THEN 'A' END,
      CASE WHEN MAX(CASE WHEN l.supermarket_id = p_market_b THEN l.price END) IS NULL THEN 'B' END
    ], NULL) AS missing_in
  FROM items i
  LEFT JOIN latest l ON l.product_id = i.product_id
  GROUP BY i.product_id, i.product_name
  ORDER BY i.product_name;
$$;