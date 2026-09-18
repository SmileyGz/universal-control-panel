-- ============================================================
-- SMILEY UNIVERSAL CONTROL PANEL (UCP)
-- INSTALACIÓN TOTAL: TABLAS, MULTI-TENANCY & BLINDAJE RLS
-- ============================================================
-- Este script crea automáticamente las tablas faltantes si aún no existen
-- y activa el blindaje de seguridad para que nadie pueda ver tus datos.

-- 1. EXTENDER TABLAS BASE (Transacciones y Portafolio)
ALTER TABLE finance_transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

ALTER TABLE finance_portfolio 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
ADD COLUMN IF NOT EXISTS ticker TEXT,
ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'otro',
ADD COLUMN IF NOT EXISTS current_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_allocation NUMERIC DEFAULT 0;

-- 2. CREAR TABLA DE INVERSIONES (Si no existe)
CREATE TABLE IF NOT EXISTS finance_investment_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id BIGINT,
    ticker TEXT NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'buy',
    buy_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shares NUMERIC NOT NULL CHECK (shares > 0),
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    fee NUMERIC DEFAULT 0,
    broker TEXT DEFAULT 'GBM+',
    notes TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar user_id en finance_investment_lots si ya existía la tabla
ALTER TABLE finance_investment_lots 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 3. CREAR TABLA DE PRÉSTAMOS (Si no existe)
CREATE TABLE IF NOT EXISTS finance_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower TEXT NOT NULL,
    initial_amount NUMERIC NOT NULL CHECK (initial_amount > 0),
    current_balance NUMERIC NOT NULL CHECK (current_balance >= 0),
    interest_rate_pct NUMERIC NOT NULL DEFAULT 1.5,
    rate_frequency TEXT DEFAULT 'monthly',
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    start_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT DEFAULT 'active',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_loans 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 4. CREAR TABLA DE INMUEBLES / RENTAS (Si no existe)
CREATE TABLE IF NOT EXISTS finance_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    property_value NUMERIC NOT NULL CHECK (property_value > 0),
    monthly_rent NUMERIC NOT NULL CHECK (monthly_rent >= 0),
    monthly_expenses NUMERIC DEFAULT 0 CHECK (monthly_expenses >= 0),
    tenant_name TEXT,
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    contract_end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'occupied',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_rentals 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

-- 5. HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_investment_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_rentals ENABLE ROW LEVEL SECURITY;

-- 6. LIMPIAR POLÍTICAS ANTERIORES
DROP POLICY IF EXISTS "Allow public access to investment lots" ON finance_investment_lots;
DROP POLICY IF EXISTS "Allow public access to finance_loans" ON finance_loans;
DROP POLICY IF EXISTS "Allow public access to finance_rentals" ON finance_rentals;
DROP POLICY IF EXISTS "Public access" ON finance_transactions;
DROP POLICY IF EXISTS "Public access" ON finance_portfolio;
DROP POLICY IF EXISTS "Users can manage own transactions" ON finance_transactions;
DROP POLICY IF EXISTS "Users can manage own portfolio" ON finance_portfolio;
DROP POLICY IF EXISTS "Users can manage own investment lots" ON finance_investment_lots;
DROP POLICY IF EXISTS "Users can manage own loans" ON finance_loans;
DROP POLICY IF EXISTS "Users can manage own rentals" ON finance_rentals;
DROP POLICY IF EXISTS "Allow reading legacy unassigned records" ON finance_portfolio;
DROP POLICY IF EXISTS "Allow reading legacy unassigned transactions" ON finance_transactions;

-- 7. CREAR POLÍTICAS PRIVADAS: SOLO USUARIOS AUTENTICADOS
CREATE POLICY "Users can manage own transactions"
ON finance_transactions FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own portfolio"
ON finance_portfolio FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own investment lots"
ON finance_investment_lots FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own loans"
ON finance_loans FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own rentals"
ON finance_rentals FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Compatibilidad temporal: solo usuarios logueados pueden leer registros sin asignar
CREATE POLICY "Allow reading legacy unassigned records"
ON finance_portfolio FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Allow reading legacy unassigned transactions"
ON finance_transactions FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);

-- 8. FUNCIÓN PARA ASIGNAR DATOS HISTÓRICOS A TU USUARIO
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
    RETURN 'Datos blindados correctamente!';
END;
$$;
