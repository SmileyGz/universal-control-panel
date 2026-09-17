-- ============================================================
-- SMILEY UNIVERSAL CONTROL PANEL (UCP)
-- Inversiones: Acciones, ETFs, FIBRAs, CETES y Lotes de Compra
-- ============================================================

-- 1. Extender tabla existente finance_portfolio con campos para trading bursátil
ALTER TABLE finance_portfolio 
ADD COLUMN IF NOT EXISTS ticker TEXT,
ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'otro', -- 'fibra', 'etf', 'stock', 'cetes', 'negocio', 'otro'
ADD COLUMN IF NOT EXISTS current_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS target_allocation NUMERIC DEFAULT 0;

-- 2. Crear tabla de lotes de compra / transacciones de inversión
CREATE TABLE IF NOT EXISTS finance_investment_lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id BIGINT REFERENCES finance_portfolio(id) ON DELETE CASCADE,
    ticker TEXT NOT NULL,
    transaction_type TEXT NOT NULL DEFAULT 'buy', -- 'buy', 'sell', 'dividend'
    buy_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shares NUMERIC NOT NULL CHECK (shares > 0),
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    fee NUMERIC DEFAULT 0,
    broker TEXT DEFAULT 'GBM+',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para acelerar consultas
CREATE INDEX IF NOT EXISTS idx_investment_lots_portfolio ON finance_investment_lots(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_investment_lots_ticker ON finance_investment_lots(ticker);
CREATE INDEX IF NOT EXISTS idx_investment_lots_date ON finance_investment_lots(buy_date);

-- 4. Habilitar políticas de seguridad si RLS está activo (Permitir lectura y escritura)
ALTER TABLE finance_investment_lots ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'finance_investment_lots' 
        AND policyname = 'Allow public access to investment lots'
    ) THEN
        CREATE POLICY "Allow public access to investment lots" 
        ON finance_investment_lots FOR ALL 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
