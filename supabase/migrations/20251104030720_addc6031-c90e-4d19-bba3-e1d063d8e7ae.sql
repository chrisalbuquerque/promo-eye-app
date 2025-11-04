-- Ajusta a FK para permitir deleção de produtos sem violar referências em ocr_item
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ocr_item_matched_product_id_fkey'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.ocr_item DROP CONSTRAINT ocr_item_matched_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.ocr_item
  ADD CONSTRAINT ocr_item_matched_product_id_fkey
  FOREIGN KEY (matched_product_id)
  REFERENCES public.product_master(id)
  ON DELETE SET NULL;
