-- ==============================================================================
-- UNIVERSAL CONTROL PANEL (UCP) — TABLA DE COTIZACIONES EN VIVO 24/7
-- Fuente Oficial: Banco de México (Banxico SIE) & Bolsa Mexicana de Valores (BMV)
-- Ejecutar en: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Crear tabla centralizada de cotizaciones de mercado
CREATE TABLE IF NOT EXISTS finance_market_quotes (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price NUMERIC(14, 4) NOT NULL,
    change_pct NUMERIC(8, 4) DEFAULT 0,
    change_abs NUMERIC(12, 4) DEFAULT 0,
    asset_type VARCHAR(20) DEFAULT 'stock', -- cetes, currency, fibra, etf, stock, index
    market VARCHAR(30) DEFAULT 'BMV',       -- Banxico, BMV, SIC / BMV
    currency VARCHAR(10) DEFAULT 'MXN',
    source VARCHAR(50) DEFAULT 'Banxico / BMV',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar Seguridad por Nivel de Fila (RLS)
ALTER TABLE finance_market_quotes ENABLE ROW LEVEL SECURITY;

-- Permitir lectura pública a cualquier usuario o visitante
DROP POLICY IF EXISTS "Permitir lectura publica de cotizaciones" ON finance_market_quotes;
CREATE POLICY "Permitir lectura publica de cotizaciones"
    ON finance_market_quotes FOR SELECT
    USING (true);

-- Permitir inserción y actualización mediante scripts autorizados o clave anon/service
DROP POLICY IF EXISTS "Permitir upsert de cotizaciones de mercado" ON finance_market_quotes;
CREATE POLICY "Permitir upsert de cotizaciones de mercado"
    ON finance_market_quotes FOR ALL
    USING (true)
    WITH CHECK (true);

-- 3. Pre-sembrado con cotizaciones institucionales reales vigentes
INSERT INTO finance_market_quotes (symbol, name, price, change_pct, change_abs, asset_type, market, currency, source, updated_at)
VALUES
    ('CETES28D', 'CETES 28 Días (Subasta Banxico)',  6.2500,  0.0000,  0.0000, 'cetes', 'Banxico / Directo', 'MXN', 'Banxico SIE (SF43718)', NOW()),
    ('USDMXN',   'Dólar FIX Oficial Banxico',        17.2425, -0.0500, -0.0080, 'currency', 'Banxico', 'MXN', 'Banxico SIE (SF60653)', NOW()),
    ('UDIS',     'Unidades de Inversión (UDI)',       8.1924,  0.0200,  0.0016, 'index', 'Banxico', 'MXN', 'Banxico SIE (SP68257)', NOW()),
    ('IPC',      'S&P / BMV IPC Índice Líder',    63510.0000, -0.6500, -415.0000, 'index', 'BMV', 'MXN', 'Bolsa Mexicana de Valores', NOW()),
    ('FUNO11',   'Fibra Uno Administradora',         29.1500, -2.8700, -0.8600, 'fibra', 'BMV', 'MXN', 'BMV / Yahoo Finance', NOW()),
    ('IVVPESO',  'iShares Core S&P 500 Peso Hedged', 154.9800,  0.8100,  1.2400, 'etf', 'SIC / BMV', 'MXN', 'SIC / BMV (IVVPESO.MX)', NOW()),
    ('FMTY14',   'Fibra Monterrey Inmobiliaria',     14.0900, -1.4700, -0.2100, 'fibra', 'BMV', 'MXN', 'BMV / Yahoo Finance', NOW()),
    ('TIIE28',   'TIIE de Fondeo Banxico a 28D',      6.5000,  0.0000,  0.0000, 'cetes', 'Banxico', 'MXN', 'Banxico SIE (SF43783)', NOW())
ON CONFLICT (symbol) DO UPDATE SET
    price = EXCLUDED.price,
    change_pct = EXCLUDED.change_pct,
    change_abs = EXCLUDED.change_abs,
    updated_at = EXCLUDED.updated_at;

COMMENT ON TABLE finance_market_quotes IS 'Cotizaciones financieras en tiempo real y subastas semanales de Banxico y BMV para Universal Control Panel';
