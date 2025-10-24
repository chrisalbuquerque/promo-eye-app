-- Criar bucket para imagens OCR
INSERT INTO storage.buckets (id, name, public)
VALUES ('ocr-images', 'ocr-images', false);

-- Política para admins fazerem upload
CREATE POLICY "Admins podem fazer upload de imagens OCR"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ocr-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins visualizarem imagens
CREATE POLICY "Admins podem visualizar imagens OCR"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ocr-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Política para admins deletarem imagens
CREATE POLICY "Admins podem deletar imagens OCR"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ocr-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);