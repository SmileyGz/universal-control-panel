-- ============================================================
-- SMILEY UNIVERSAL CONTROL PANEL (UCP)
-- FASE 3: MULTI-TENANCY & ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Este script convierte a UCP en un SaaS multi-inquilino.
-- Cada usuario que se registre a través de Supabase Auth tendrá
-- sus datos completamente aislados y seguros.

-- 1. EXTENDER TABLAS EXISTENTES CON COLUMNA user_id
-- Relacionada con auth.users(id) de Supabase

-- A. Transacciones financieras (ingresos, gastos, ventas)
ALTER TABLE finance_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- B. Portafolio de activos y negocios
ALTER TABLE finance_portfolio 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- C. Lotes de compra de inversiones bursátiles
ALTER TABLE finance_investment_lots 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- D. Préstamos otorgados
ALTER TABLE finance_loans 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- E. Propiedades e inmuebles en renta
ALTER TABLE finance_rentals 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 2. ÍNDICES POR user_id PARA MÁXIMA VELOCIDAD
CREATE INDEX IF NOT EXISTS idx_transactions_user ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON finance_portfolio(user_id);
CREATE INDEX IF NOT EXISTS idx_investment_lots_user ON finance_investment_lots(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_user ON finance_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_rentals_user ON finance_rentals(user_id);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_investment_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_rentals ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR POLÍTICAS PÚBLICAS ANTERIORES (SI EXISTEN)
DROP POLICY IF EXISTS "Allow public access to investment lots" ON finance_investment_lots;
DROP POLICY IF EXISTS "Allow public access to finance_loans" ON finance_loans;
DROP POLICY IF EXISTS "Allow public access to finance_rentals" ON finance_rentals;
DROP POLICY IF EXISTS "Public access" ON finance_transactions;
DROP POLICY IF EXISTS "Public access" ON finance_portfolio;

-- 5. CREAR POLÍTICAS RLS AISLADAS POR USUARIO AUTENTICADO
-- Cada usuario sólo puede ver, crear, actualizar o borrar SUS propios registros.

-- Transacciones
CREATE POLICY "Users can manage own transactions"
ON finance_transactions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Portafolio y Negocios
CREATE POLICY "Users can manage own portfolio"
ON finance_portfolio FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Inversiones y Lotes
CREATE POLICY "Users can manage own investment lots"
ON finance_investment_lots FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Préstamos
CREATE POLICY "Users can manage own loans"
ON finance_loans FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Inmuebles en Renta
CREATE POLICY "Users can manage own rentals"
ON finance_rentals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. POLÍTICA DE COMPATIBILIDAD CON DATOS LEGACY (PERMITE LECTURA SI user_id ES NULL)
CREATE POLICY "Allow reading legacy unassigned records"
ON finance_portfolio FOR SELECT
TO authenticated, anon
USING (user_id IS NULL);

CREATE POLICY "Allow reading legacy unassigned transactions"
ON finance_transactions FOR SELECT
TO authenticated, anon
USING (user_id IS NULL);

-- 7. FUNCIÓN PARA ASIGNAR DATOS HISTÓRICOS A TU CUENTA DE ADMINISTRADOR
-- Ejecuta esta función pasando tu UUID de auth.users tras registrarte:
-- SELECT claim_all_legacy_data('TU-UUID-AQUÍ');
CREATE OR REPLACE FUNCTION claim_all_legacy_data(target_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE finance_transactions SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE finance_portfolio SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE finance_investment_lots SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE finance_loans SET user_id = target_user_id WHERE user_id IS NULL;
    UPDATE finance_rentals SET user_id = target_user_id WHERE user_id IS NULL;
    RETURN '¡Datos históricos asignados con éxito al usuario ' || target_user_id::text || '!';
END;
$$;
