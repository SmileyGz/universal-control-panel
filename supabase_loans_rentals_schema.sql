-- ============================================================
-- SMILEY UNIVERSAL CONTROL PANEL (UCP)
-- Módulo: Préstamos Otorgados e Inmuebles en Renta
-- ============================================================

-- 1. Tabla de Préstamos Personales / Comerciales Otorgados
CREATE TABLE IF NOT EXISTS finance_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower TEXT NOT NULL,
    initial_amount NUMERIC NOT NULL CHECK (initial_amount > 0),
    current_balance NUMERIC NOT NULL CHECK (current_balance >= 0),
    interest_rate_pct NUMERIC NOT NULL DEFAULT 1.5, -- Tasa mensual % (ej. 1.5% = 18% anual)
    rate_frequency TEXT DEFAULT 'monthly',           -- 'monthly' o 'annual'
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    start_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT DEFAULT 'active',                   -- 'active', 'paid_off', 'defaulted'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Propiedades e Inmuebles en Renta
CREATE TABLE IF NOT EXISTS finance_rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    property_value NUMERIC NOT NULL CHECK (property_value > 0), -- Valor comercial del activo
    monthly_rent NUMERIC NOT NULL CHECK (monthly_rent >= 0),     -- Renta bruta mensual
    monthly_expenses NUMERIC DEFAULT 0 CHECK (monthly_expenses >= 0), -- Mantenimiento, cuotas, etc.
    tenant_name TEXT,
    payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 31),
    contract_end_date DATE,
    notes TEXT,
    status TEXT DEFAULT 'occupied',                 -- 'occupied', 'vacant', 'maintenance'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_loans_status ON finance_loans(status);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON finance_rentals(status);

-- 4. Habilitar políticas de seguridad si RLS está activo
ALTER TABLE finance_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_rentals ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'finance_loans' 
        AND policyname = 'Allow public access to finance_loans'
    ) THEN
        CREATE POLICY "Allow public access to finance_loans" 
        ON finance_loans FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'finance_rentals' 
        AND policyname = 'Allow public access to finance_rentals'
    ) THEN
        CREATE POLICY "Allow public access to finance_rentals" 
        ON finance_rentals FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
