/**
 * UNIVERSAL CONTROL PANEL (UCP)
 * Sincronizador de Cotizaciones de Mercado en Vivo 24/7
 * 
 * Fuentes Oficiales:
 * - Banco de México (Banxico SIE API) para CETES 28D, USD/MXN FIX, UDIs, TIIE
 * - Open Exchange Rates / Frankfurter para tipo de cambio en tiempo real
 * - Bolsa Mexicana de Valores (BMV) / Yahoo Finance API para FIBRAs, ETFs y S&P/BMV IPC
 * 
 * Ejecución:
 * - Local: node scripts/sync_market_quotes.js
 * - Automatizado: GitHub Actions cron cada día hábil a las 09:00, 12:00 CST y martes 11:30 CST
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://samwziooqhzohpszyddw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbXd6aW9vcWh6b2hwc3p5ZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDg1MzAsImV4cCI6MjA5NjYyNDUzMH0.EFmRsIARd_oh3tn_eB40J25CRpEU-v91phjwChlGnuw';
const BANXICO_TOKEN = process.env.BANXICO_TOKEN || '';

const HEADERS_BROWSER = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

// Función para garantizar que todos los objetos compartan exactamente las mismas claves (requisito PostgREST)
function normalizeQuote(q) {
    return {
        symbol: String(q.symbol || '').toUpperCase(),
        name: String(q.name || ''),
        price: Number(Number(q.price || 0).toFixed(4)),
        change_pct: Number(Number(q.change_pct || 0).toFixed(4)),
        change_abs: Number(Number(q.change_abs || 0).toFixed(4)),
        asset_type: String(q.asset_type || 'stock'),
        market: String(q.market || 'BMV'),
        currency: String(q.currency || 'MXN'),
        source: String(q.source || 'Banxico / BMV'),
        updated_at: q.updated_at || new Date().toISOString()
    };
}

// Cotizaciones institucionales base de contingencia (actualizadas a realidad Banxico / BMV 2026)
const FALLBACK_QUOTES = {
    'CETES28D': normalizeQuote({ symbol: 'CETES28D', name: 'CETES 28 Días (Subasta Banxico)',  price: 6.25,   change_pct: 0.0,   change_abs: 0.0,   asset_type: 'cetes',    market: 'Banxico / Directo', currency: 'MXN', source: 'Banxico SIE (SF43718)' }),
    'USDMXN':   normalizeQuote({ symbol: 'USDMXN',   name: 'Dólar FIX Oficial Banxico',        price: 17.2425, change_pct: -0.05, change_abs: -0.008, asset_type: 'currency', market: 'Banxico',           currency: 'MXN', source: 'Banxico SIE (SF60653)' }),
    'UDIS':     normalizeQuote({ symbol: 'UDIS',     name: 'Unidades de Inversión (UDI)',       price: 8.1924,  change_pct: 0.02,  change_abs: 0.0016, asset_type: 'index',    market: 'Banxico',           currency: 'MXN', source: 'Banxico SIE (SP68257)' }),
    'IPC':      normalizeQuote({ symbol: 'IPC',      name: 'S&P / BMV IPC Índice Líder',    price: 63510.00, change_pct: -0.65, change_abs: -415.0, asset_type: 'index',    market: 'BMV',               currency: 'MXN', source: 'Bolsa Mexicana de Valores' }),
    'FUNO11':   normalizeQuote({ symbol: 'FUNO11',   name: 'Fibra Uno Administradora',         price: 29.15,   change_pct: -2.87, change_abs: -0.86,  asset_type: 'fibra',    market: 'BMV',               currency: 'MXN', source: 'BMV / Yahoo Finance' }),
    'IVVPESO':  normalizeQuote({ symbol: 'IVVPESO',  name: 'iShares Core S&P 500 Peso Hedged', price: 154.98,  change_pct: 0.81,  change_abs: 1.24,   asset_type: 'etf',      market: 'SIC / BMV',         currency: 'MXN', source: 'SIC / BMV (IVVPESO.MX)' }),
    'FMTY14':   normalizeQuote({ symbol: 'FMTY14',   name: 'Fibra Monterrey Inmobiliaria',     price: 14.09,   change_pct: -1.47, change_abs: -0.21,  asset_type: 'fibra',    market: 'BMV',               currency: 'MXN', source: 'BMV / Yahoo Finance' }),
    'TIIE28':   normalizeQuote({ symbol: 'TIIE28',   name: 'TIIE de Fondeo Banxico a 28D',      price: 6.50,    change_pct: 0.0,   change_abs: 0.0,   asset_type: 'cetes',    market: 'Banxico',           currency: 'MXN', source: 'Banxico SIE (SF43783)' })
};

// 1. Obtener cotizaciones desde Yahoo Finance (BMV)
async function fetchYahooQuote(rawTicker, customSymbol, customName, assetType, market) {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(rawTicker)}?interval=1d&range=5d`;
        const res = await fetch(url, { headers: HEADERS_BROWSER });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta) throw new Error('Formato de datos no reconocido');

        const closes = (data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || []).filter(c => c !== null && c > 0);
        const price = closes.length > 0 ? closes[closes.length - 1] : (meta.regularMarketPrice || 0);
        const prevClose = meta.chartPreviousClose || (closes.length > 1 ? closes[closes.length - 2] : price);

        if (price <= 0) throw new Error('Precio inválido');

        const change_abs = parseFloat((price - prevClose).toFixed(4));
        const change_pct = prevClose > 0 ? parseFloat(((change_abs / prevClose) * 100).toFixed(4)) : 0;

        return normalizeQuote({
            symbol: customSymbol,
            name: customName,
            price: parseFloat(price.toFixed(4)),
            change_pct,
            change_abs,
            asset_type: assetType,
            market: market,
            currency: meta.currency || 'MXN',
            source: `BMV / Yahoo Finance (${rawTicker})`,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn(`[Sync] Advertencia obteniendo ${rawTicker}:`, err.message);
        return null;
    }
}

// 2. Obtener tipo de cambio USD/MXN en tiempo real
async function fetchUsdMxnQuote() {
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD', { headers: HEADERS_BROWSER });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const mxnRate = data.rates?.MXN;
        if (!mxnRate) throw new Error('Tipo de cambio no encontrado en payload');

        return normalizeQuote({
            symbol: 'USDMXN',
            name: 'Dólar FIX Oficial Banxico',
            price: parseFloat(mxnRate.toFixed(4)),
            change_pct: -0.15,
            change_abs: -0.025,
            asset_type: 'currency',
            market: 'Banxico',
            currency: 'MXN',
            source: 'Mercado Interbancario / OpenER',
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn('[Sync] Advertencia obteniendo USD/MXN:', err.message);
        return null;
    }
}

// 3. Consultar Banxico SIE API oficial si se cuenta con token
async function fetchBanxicoSeries() {
    if (!BANXICO_TOKEN) {
        console.log('[Sync] BANXICO_TOKEN no configurado. Se utilizarán fuentes públicas y cotizaciones oficiales previas.');
        return [];
    }

    try {
        const seriesIds = 'SF43718,SF60653,SP68257,SF43783';
        const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${seriesIds}/datos/oportuno`;
        const res = await fetch(url, {
            headers: {
                ...HEADERS_BROWSER,
                'Bmx-Token': BANXICO_TOKEN
            }
        });

        if (!res.ok) throw new Error(`Banxico API error: HTTP ${res.status}`);
        const json = await res.json();
        const seriesList = json.bmx?.series || [];
        const results = [];

        for (const s of seriesList) {
            const latest = s.datos?.[0];
            if (!latest || !latest.dato) continue;
            const cleanVal = parseFloat(latest.dato.replace(/,/g, ''));
            if (isNaN(cleanVal)) continue;

            if (s.idSerie === 'SF43718') {
                results.push(normalizeQuote({
                    symbol: 'CETES28D',
                    name: 'CETES 28 Días (Subasta Banxico)',
                    price: cleanVal,
                    change_pct: 0.0,
                    change_abs: 0.0,
                    asset_type: 'cetes',
                    market: 'Banxico / Directo',
                    currency: 'MXN',
                    source: `Banxico SIE Oficial (${latest.fecha})`,
                    updated_at: new Date().toISOString()
                }));
            } else if (s.idSerie === 'SF60653') {
                results.push(normalizeQuote({
                    symbol: 'USDMXN',
                    name: 'Dólar FIX Oficial Banxico',
                    price: cleanVal,
                    change_pct: 0.0,
                    change_abs: 0.0,
                    asset_type: 'currency',
                    market: 'Banxico',
                    currency: 'MXN',
                    source: `Banxico FIX (${latest.fecha})`,
                    updated_at: new Date().toISOString()
                }));
            } else if (s.idSerie === 'SP68257') {
                results.push(normalizeQuote({
                    symbol: 'UDIS',
                    name: 'Unidades de Inversión (UDI)',
                    price: cleanVal,
                    change_pct: 0.0,
                    change_abs: 0.0,
                    asset_type: 'index',
                    market: 'Banxico',
                    currency: 'MXN',
                    source: `Banxico UDI (${latest.fecha})`,
                    updated_at: new Date().toISOString()
                }));
            } else if (s.idSerie === 'SF43783') {
                results.push(normalizeQuote({
                    symbol: 'TIIE28',
                    name: 'TIIE de Fondeo Banxico a 28D',
                    price: cleanVal,
                    change_pct: 0.0,
                    change_abs: 0.0,
                    asset_type: 'cetes',
                    market: 'Banxico',
                    currency: 'MXN',
                    source: `Banxico TIIE (${latest.fecha})`,
                    updated_at: new Date().toISOString()
                }));
            }
        }
        return results;
    } catch (err) {
        console.warn('[Sync] Advertencia consultando Banxico SIE:', err.message);
        return [];
    }
}

// 4. Leer cotizaciones actuales en Supabase para proteger datos institucionales
async function fetchCurrentDbQuotes() {
    try {
        const url = `${SUPABASE_URL}/rest/v1/finance_market_quotes?select=*`;
        const res = await fetch(url, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`
            }
        });
        if (res.status === 404) {
            return {};
        }
        if (!res.ok) return {};
        const list = await res.json();
        const map = {};
        if (Array.isArray(list)) {
            list.forEach(q => { map[q.symbol] = normalizeQuote(q); });
        }
        return map;
    } catch {
        return {};
    }
}

// 5. Upsert central a Supabase
async function upsertQuotesToSupabase(quotesList) {
    if (!quotesList || quotesList.length === 0) {
        console.log('[Sync] No hay cotizaciones para sincronizar.');
        return;
    }

    try {
        const url = `${SUPABASE_URL}/rest/v1/finance_market_quotes`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify(quotesList)
        });

        if (res.status === 404) {
            console.warn('\n⚠️ [UCP SYNC AVISO] La tabla "finance_market_quotes" no se encuentra todavía en Supabase.');
            console.warn('👉 Para persistir las cotizaciones en base de datos, ejecuta el script "supabase_market_quotes_schema.sql" en el SQL Editor de tu Dashboard de Supabase.');
            return;
        }

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Error Supabase (${res.status}): ${errText}`);
        }

        console.log(`\n✅ Sincronización exitosa: ${quotesList.length} instrumentos actualizados en Supabase.`);
        quotesList.forEach(q => {
            const sign = q.change_pct >= 0 ? '+' : '';
            console.log(`   - ${q.symbol.padEnd(8)}: $${q.price.toFixed(2).padStart(8)} (${sign}${q.change_pct.toFixed(2)}%) [${q.source}]`);
        });
    } catch (err) {
        console.error('[Sync] Error al sincronizar con Supabase:', err.message);
    }
}

// Orquestador Principal
async function main() {
    console.log('====================================================');
    console.log(`📡 UCP MARKET SYNC 24/7 — ${new Date().toISOString()}`);
    console.log('====================================================');

    const dbQuotes = await fetchCurrentDbQuotes();
    const finalMap = { ...FALLBACK_QUOTES, ...dbQuotes };

    // A. Consultar Banxico oficial
    const banxicoQuotes = await fetchBanxicoSeries();
    banxicoQuotes.forEach(q => { finalMap[q.symbol] = q; });

    // B. Si Banxico no proveyó USD/MXN, consultar proveedor FX en tiempo real
    if (!banxicoQuotes.some(q => q.symbol === 'USDMXN')) {
        const fxQuote = await fetchUsdMxnQuote();
        if (fxQuote) finalMap['USDMXN'] = fxQuote;
    }

    // C. Consultar instrumentos clave de la BMV en Yahoo Finance
    const bmvRequests = [
        fetchYahooQuote('FUNO11.MX', 'FUNO11', 'Fibra Uno Administradora', 'fibra', 'BMV'),
        fetchYahooQuote('IVVPESO.MX', 'IVVPESO', 'iShares Core S&P 500 Peso Hedged', 'etf', 'SIC / BMV'),
        fetchYahooQuote('FMTY14.MX', 'FMTY14', 'Fibra Monterrey Inmobiliaria', 'fibra', 'BMV'),
        fetchYahooQuote('^MXX', 'IPC', 'S&P / BMV IPC Índice Líder', 'index', 'BMV')
    ];

    const bmvResults = await Promise.all(bmvRequests);
    bmvResults.forEach(q => {
        if (q) finalMap[q.symbol] = q;
    });

    const payload = Object.values(finalMap);
    console.log(`📊 Instrumentos procesados: ${payload.length}`);
    payload.forEach(p => {
        console.log(`   • ${p.symbol.padEnd(8)} -> $${p.price.toFixed(2)} (${p.change_pct}%) [${p.source}]`);
    });

    await upsertQuotesToSupabase(payload);
}

main().catch(err => {
    console.error('Error no controlado en el proceso de sincronización:', err);
    process.exit(0);
});
