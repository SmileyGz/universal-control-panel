-- ============================================================
-- SMILEY UNIVERSAL CONTROL PANEL (UCP)
-- FASE 8: ALMACENAMIENTO EN LA NUBE DE COMPROBANTES Y FACTURAS
-- ============================================================
-- Ejecuta este script en el SQL Editor de tu proyecto en Supabase
-- (https://supabase.com/dashboard/project/samwziooqhzohpszyddw/sql)

-- 1. EXTENDER TABLA DE TRANSACCIONES CON COLUMNAS FISCALES Y DE ADJUNTOS
ALTER TABLE finance_transactions 
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_deductible BOOLEAN DEFAULT false;

COMMENT ON COLUMN finance_transactions.attachments IS 'Array JSON con la metadata y URLs en Supabase Storage de tickets, fotos, PDFs y XMLs';
COMMENT ON COLUMN finance_transactions.is_deductible IS 'Indica si el gasto cuenta con factura fiscal (CFDI) y es deducible de impuestos';

-- 2. CREAR EL BUCKET DE ALMACENAMIENTO EN SUPABASE STORAGE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'expense-receipts',
    'expense-receipts',
    true,
    10485760, -- Límite de 10MB por archivo (las fotos se comprimen en cliente a ~250KB)
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/xml', 'application/xml']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/xml', 'application/xml'];

-- 3. POLÍTICAS DE SEGURIDAD RLS PARA STORAGE.OBJECTS (storage.objects ya tiene RLS activo de fábrica)

DROP POLICY IF EXISTS "Public read access for expense-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to expense-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to update expense-receipts" ON storage.objects;
DROP POLICY IF EXISTS "Allow owners to delete expense-receipts" ON storage.objects;

-- A) LECTURA PÚBLICA: Permite visualizar las fotos y PDFs de comprobantes
CREATE POLICY "Public read access for expense-receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'expense-receipts');

-- B) SUBIDA DE ARCHIVOS (INSERT): Permite subir tickets y comprobantes
CREATE POLICY "Allow authenticated uploads to expense-receipts"
ON storage.objects FOR INSERT
TO authenticated, anon
WITH CHECK (bucket_id = 'expense-receipts');

-- C) MODIFICACIÓN (UPDATE): Permite actualizar archivos del bucket
CREATE POLICY "Allow owners to update expense-receipts"
ON storage.objects FOR UPDATE
TO authenticated, anon
USING (bucket_id = 'expense-receipts');

-- D) ELIMINACIÓN (DELETE): Permite retirar comprobantes viejos o erróneos
CREATE POLICY "Allow owners to delete expense-receipts"
ON storage.objects FOR DELETE
TO authenticated, anon
USING (bucket_id = 'expense-receipts');
