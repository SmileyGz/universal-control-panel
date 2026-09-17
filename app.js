// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL = 'https://samwziooqhzohpszyddw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbXd6aW9vcWh6b2hwc3p5ZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDg1MzAsImV4cCI6MjA5NjYyNDUzMH0.EFmRsIARd_oh3tn_eB40J25CRpEU-v91phjwChlGnuw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const updateStatusIndicator = () => {
    const indicator = document.querySelector('.status-indicator');
    if (!indicator) return;
    indicator.innerHTML = `<span class="dot pulse" style="background-color: var(--success);"></span> Connected to Supabase`;
};

// ============================================================
// STATE
// ============================================================
let cashflowChartInstance = null;
let portfolioChartInstance = null;
let currentYear = new Date().getFullYear().toString();

// ============================================================
// UTILS
// ============================================================
const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);

const todayISO = () => new Date().toISOString().split('T')[0];

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimer = null;
const showToast = (message, type = 'success') => {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.className = 'toast hidden', 3500);
};

// ============================================================
// MODAL
// ============================================================
const openModal = () => {
    document.getElementById('f-date').value = todayISO();
    document.getElementById('tx-form').reset();
    document.getElementById('f-date').value = todayISO();
    document.getElementById('modal-overlay').classList.remove('hidden');
};
const closeModal = () => document.getElementById('modal-overlay').classList.add('hidden');

document.getElementById('fab-add').addEventListener('click', openModal);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('btn-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

document.getElementById('tx-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const tx = {
        date:     document.getElementById('f-date').value,
        description: document.getElementById('f-desc').value.trim(),
        amount:   parseFloat(document.getElementById('f-amount').value),
        type:     document.getElementById('f-type').value,
        category: document.getElementById('f-category').value,
        notes:    document.getElementById('f-notes').value.trim(),
    };

    if (!tx.description || !tx.amount || tx.amount <= 0 || !tx.date) {
        showToast('Por favor completa todos los campos.', 'error');
        return;
    }

    try {
        // En Supabase table, the columns are: date, description, amount, type, category, notes
        const { error } = await supabaseClient.from('finance_transactions').insert([tx]);
        if (error) throw error;

        closeModal();
        showToast(`✅ "${tx.description}" guardado en Supabase!`);
        
        // Refresh views
        const txYear = tx.date.split('-')[0];
        if (txYear !== currentYear) {
            currentYear = txYear;
            const sel = document.getElementById('year-selector');
            if (!Array.from(sel.options).find(o => o.value === currentYear)) {
                const opt = document.createElement('option');
                opt.value = currentYear;
                opt.textContent = currentYear;
                sel.appendChild(opt);
            }
            sel.value = currentYear;
        }
        await loadYearlyData(currentYear);
    } catch (err) {
        console.error('Insert error:', err);
        showToast('Error al guardar la transacción.', 'error');
    }
});

// ============================================================
// NAVIGATION
// ============================================================
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');

        const target = item.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
        document.getElementById(`view-${target}`).classList.add('active');

        const titles = { 
            dashboard: 'Overview', 
            transactions: 'Mis Transacciones', 
            portfolio: 'Business Assets & Portfolio',
            investments: 'Portafolio de Inversiones (GBM+ / Bolsa)'
        };
        document.getElementById('current-page-title').textContent = titles[target] || 'Overview';

        if (target === 'dashboard') {
            cashflowChartInstance?.update();
            portfolioChartInstance?.update();
        }
    });
});

// ============================================================
// RENDER CASHFLOW CHART
// ============================================================
const renderCashflowChart = (data) => {
    const ctx = document.getElementById('cashflowChart').getContext('2d');
    if (cashflowChartInstance) cashflowChartInstance.destroy();

    cashflowChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: data.income,
                    backgroundColor: 'rgba(0, 168, 89, 0.85)',
                    hoverBackgroundColor: 'rgba(0, 200, 105, 1)',
                    borderRadius: 6
                },
                {
                    label: 'Gastos',
                    data: data.expenses,
                    backgroundColor: 'rgba(229, 57, 53, 0.85)',
                    hoverBackgroundColor: 'rgba(255, 77, 77, 1)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#F8FAF9',
                        font: { family: 'Outfit', size: 13, weight: '600' },
                        boxWidth: 12,
                        borderRadius: 4
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(9, 17, 14, 0.95)',
                    titleColor: '#FFC72C',
                    bodyColor: '#F8FAF9',
                    borderColor: 'rgba(0, 168, 89, 0.4)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit', weight: 'bold' },
                    bodyFont: { family: 'JetBrains Mono' },
                    callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 168, 89, 0.12)' },
                    ticks: {
                        color: '#7E988C',
                        font: { family: 'JetBrains Mono', size: 11 },
                        callback: (value) => '$' + value.toLocaleString('es-MX')
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#C3D5CC',
                        font: { family: 'Inter', size: 12, weight: '500' }
                    }
                }
            }
        }
    });
};

// ============================================================
// LOAD YEARLY DATA (SUPABASE)
// ============================================================
const loadYearlyData = async (year) => {
    try {
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;
        
        const { data: transactions, error } = await supabaseClient
            .from('finance_transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false });

        if (error) throw error;

        let totalIncome = 0, totalExpenses = 0;
        const monthlyData = {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
            income:   new Array(12).fill(0),
            expenses: new Array(12).fill(0)
        };

        transactions.forEach(tx => {
            const amount = parseFloat(tx.amount);
            if (tx.type === 'expense') totalExpenses += amount;
            if (tx.type === 'income')  totalIncome   += amount;

            if (tx.date) {
                const parts = tx.date.split('-');
                if(parts.length >= 2) {
                    const m = parseInt(parts[1], 10) - 1;
                    if (m >= 0 && m < 12) {
                        if (tx.type === 'expense') monthlyData.expenses[m] += amount;
                        else                       monthlyData.income[m]   += amount;
                    }
                }
            }
        });

        // Update KPIs
        document.getElementById('kpi-income').textContent   = formatCurrency(totalIncome);
        document.getElementById('kpi-expenses').textContent = formatCurrency(totalExpenses);
        const net   = totalIncome - totalExpenses;
        const netEl = document.getElementById('kpi-net');
        netEl.textContent = formatCurrency(net);
        netEl.className   = `amount ${net >= 0 ? 'text-green' : 'text-red'}`;
        document.getElementById('kpi-net-trend').textContent = net >= 0 ? '↗ Flujo Positivo' : '↘ Flujo Negativo';

        renderTransactions(transactions);
        renderCashflowChart(monthlyData);

    } catch (err) {
        console.error('Error loading yearly data', err);
        showToast('Error al cargar transacciones desde Supabase.', 'error');
    }
};

// ============================================================
// SEARCH FILTER
// ============================================================
document.getElementById('tx-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('#transactions-body tr').forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
});

// ============================================================
// RENDER TRANSACTIONS TABLE
// ============================================================
const renderTransactions = (transactions) => {
    const tbody = document.getElementById('transactions-body');
    tbody.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:32px;color:var(--text-muted)">Sin transacciones para este año.</td></tr>`;
        return;
    }

    transactions.forEach(tx => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${tx.date || '-'}</td>
            <td>
                <strong>${tx.description || 'Desconocido'}</strong>
                ${tx.category ? `<br><span style="font-size:12px;color:var(--text-muted)">${tx.category}</span>` : ''}
                ${tx.notes    ? `<br><span style="font-size:12px;color:var(--text-muted);font-style:italic">${tx.notes}</span>` : ''}
            </td>
            <td class="align-right ${tx.type === 'income' ? 'text-green' : ''}">${formatCurrency(tx.amount)}</td>
            <td><span class="badge ${tx.type}">${tx.type === 'income' ? 'Ingreso' : 'Gasto'}</span></td>
            <td><button class="delete-btn" data-id="${tx.id}" title="Eliminar">✕</button></td>
        `;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            if (!confirm('¿Seguro que deseas eliminar esta transacción?')) return;
            const id = e.target.dataset.id;
            try {
                const { error } = await supabaseClient.from('finance_transactions').delete().eq('id', id);
                if (error) throw error;
                showToast('Transacción eliminada.', 'success');
                loadYearlyData(currentYear);
            } catch (err) {
                console.error('Delete error:', err);
                showToast('Error al eliminar.', 'error');
            }
        });
    });
};

// ============================================================
// LOAD PORTFOLIO (SUPABASE)
// ============================================================
const CATEGORY_META = {
    'Préstamos':  { icon: '🏦', color: '#C8973A' },
    'Inversiones':{ icon: '📈', color: '#008c5b' },
    'Liquidez':   { icon: '💵', color: '#006847' },
    'Ahorro':     { icon: '🏧', color: '#9A6E22' },
    'Negocios':   { icon: '🛒', color: '#7a288a' }, // Added for Bazarito and Business Assets
    'Inmuebles':  { icon: '🏠', color: '#2a9d8f' },
    'Otros':      { icon: '💰', color: '#6B3A1F' },
};

const renderPortfolioFromAssets = (assets) => {
    const grid = document.getElementById('portfolio-grid');
    if (grid) grid.innerHTML = '';

    const validAssets = (assets || []).filter(a => a.name && a.name.trim() !== '');
    const countLabel = validAssets.length;

    const grouped = {};
    let grandTotal = 0;
    validAssets.forEach(a => {
        const cat = a.category || 'Otros';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(a);
        const val = parseFloat(a.value || 0);
        grandTotal += val;
    });

    const kpiSavings = document.getElementById('kpi-savings');
    if (kpiSavings) kpiSavings.textContent = formatCurrency(grandTotal);

    const portfolioTotalKpi = document.getElementById('portfolio-kpi-total');
    if (portfolioTotalKpi) portfolioTotalKpi.textContent = formatCurrency(grandTotal);

    const portfolioTotalLabel = document.getElementById('portfolio-total-label');
    if (portfolioTotalLabel) {
        portfolioTotalLabel.textContent = `Total: ${formatCurrency(grandTotal)} — ${countLabel} activos`;
    }

    const chartLabels = [], chartData = [];
    for (const [cat, items] of Object.entries(grouped)) {
        const meta = CATEGORY_META[cat] || CATEGORY_META['Otros'];
        const subTotal = items.reduce((s, a) => s + parseFloat(a.value || 0), 0);
        chartLabels.push(cat);
        chartData.push(subTotal);

        if (grid) {
            grid.innerHTML += `
                <div class="portfolio-card glass-panel" style="border-left: 3px solid ${meta.color}; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; padding: 12px 20px;">
                    <h4 style="color:${meta.color}; font-size: 15px;">${meta.icon} ${cat}</h4>
                    <span style="color:var(--text-on-dark); font-family:var(--font-heading); font-size: 18px; font-weight: 600;">${formatCurrency(subTotal)}</span>
                </div>`;

            items.forEach(a => {
                const icon = a.icon || meta.icon;
                const safeName = (a.name || '').replace(/"/g, '&quot;');

                // Detect storefront URL
                let storeUrl = '';
                if (a.url) {
                    storeUrl = a.url;
                } else if (a.notes && a.notes.includes('http')) {
                    const m = a.notes.match(/https?:\/\/[^\s]+/);
                    if (m) storeUrl = m[0];
                } else if (a.name && a.name.toLowerCase().includes('bazarito')) {
                    storeUrl = 'https://smileygz.github.io/Bazarito-cancun';
                }

                // Clean notes display if URL is in notes
                const displayNotes = (a.notes || '').replace(/https?:\/\/[^\s]+/, '').replace(/\|\s*URL:?\s*/i, '').trim();

                grid.innerHTML += `
                    <div class="portfolio-card glass-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
                        <div>
                            <div class="p-card-header" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                <h4 style="font-size: 15px; word-break: break-word;">${icon} ${a.name}</h4>
                                <button class="delete-btn btn-delete-asset" data-id="${a.id}" data-name="${safeName}" title="Eliminar negocio/activo" style="font-size: 11px; padding: 2px 7px;">✕</button>
                            </div>
                            <p class="p-card-amount" style="margin-top: 8px;">${formatCurrency(parseFloat(a.value || 0))}</p>
                            ${displayNotes ? `<p style="color:var(--text-muted); font-size: 12px; margin-top: 6px; line-height: 1.4;">${displayNotes}</p>` : ''}
                        </div>
                        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                            ${storeUrl ? `
                                <a href="${storeUrl}" target="_blank" rel="noopener noreferrer" class="btn-action-loan" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 4px 9px; color: var(--mexican-gold); border-color: var(--mexican-gold);">
                                    <span>Tienda en Vivo</span> ↗
                                </a>
                            ` : ''}
                            <button class="btn-action-loan btn-edit-asset-val" data-id="${a.id}" data-name="${safeName}" data-value="${a.value || 0}" style="font-size: 11px; padding: 4px 9px;">
                                ✏️ Valuación
                            </button>
                        </div>
                    </div>`;
            });
        }
    }

    if (grid) {
        // Delete Asset listener
        grid.querySelectorAll('.btn-delete-asset').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const name = btn.dataset.name;
                if (!confirm(`¿Estás seguro de eliminar "${name}" del portafolio?`)) return;
                try {
                    const { error } = await supabaseClient.from('finance_portfolio').delete().eq('id', id);
                    if (error) throw error;
                    showToast(`🗑️ "${name}" eliminado con éxito.`, 'info');
                    await loadSavingsData();
                } catch (err) {
                    console.error('Error deleting asset:', err);
                    showToast('Error al eliminar negocio/activo.', 'error');
                }
            });
        });

        // Edit Asset Valuation listener
        grid.querySelectorAll('.btn-edit-asset-val').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const name = btn.dataset.name;
                const val = btn.dataset.value;
                openEditAssetModal(id, name, val);
            });
        });
    }

    renderPortfolioChart(chartLabels, chartData);
};

const renderPortfolioChart = (labels, data) => {
    const canvas = document.getElementById('portfolioChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (portfolioChartInstance) portfolioChartInstance.destroy();

    // Vibrant FinTech Aztec Color Palette for Asset Classes
    const assetColors = [
        '#00A859', // Esmeralda: Inversiones / Bolsa / FIBRAs
        '#FFC72C', // Oro Solar: CETES / Liquidez / Ahorro
        '#38BDF8', // Banxico Blue: Préstamos Otorgados
        '#A855F7', // Modern Purple: Negocios / Storefronts (Bazarito, etc.)
        '#FB923C', // Naranja Cobre: Rentas / Inmuebles
        '#F43F5E', // Rosa Mexicano
        '#2DD4BF', // Turquesa Caribe
        '#94A3B8'  // Slate / Otros
    ];

    portfolioChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: assetColors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#09110E',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#F8FAF9',
                        font: { family: 'Outfit', size: 12, weight: '500' },
                        padding: 14,
                        boxWidth: 10,
                        borderRadius: 3
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(9, 17, 14, 0.95)',
                    titleColor: '#FFC72C',
                    bodyColor: '#F8FAF9',
                    borderColor: 'rgba(0, 168, 89, 0.4)',
                    borderWidth: 1,
                    titleFont: { family: 'Outfit', weight: 'bold' },
                    bodyFont: { family: 'JetBrains Mono' },
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`
                    }
                }
            },
            cutout: '68%'
        }
    });
};

const loadSavingsData = async () => {
    try {
        const { data: assets, error } = await supabaseClient.from('finance_portfolio').select('*').order('category');
        if (error) throw error;
        
        const safeAssets = assets || [];
        renderPortfolioFromAssets(safeAssets);
        await loadLoansData(safeAssets);
        await loadRentalsData(safeAssets);
        updatePortfolioPassiveKPIs();
    } catch (err) {
        console.error('Error loading portfolio:', err);
        const grid = document.getElementById('portfolio-grid');
        if (grid) grid.innerHTML = '<p class="text-red">Error cargando activos desde Supabase.</p>';
    }
};

// ============================================================
// INVESTMENTS & STOCKS MODULE (GBM+ / FIBRAs / ETFs / CETES)
// ============================================================
let investmentsHoldings = [];
let allInvestmentLots = [];
let activeInvestmentFilter = 'all';

const ASSET_TYPE_META = {
    fibra: { label: 'FIBRA', badgeClass: 'fibra', icon: '🏢' },
    etf:   { label: 'ETF',   badgeClass: 'etf',   icon: '📈' },
    stock: { label: 'Acción',badgeClass: 'stock', icon: '📊' },
    cetes: { label: 'CETES', badgeClass: 'cetes', icon: '🏛️' },
    otro:  { label: 'Otro',  badgeClass: 'otro',  icon: '💰' }
};

const loadInvestmentsData = async () => {
    try {
        // 1. Fetch investment holdings from finance_portfolio
        const { data: portfolioRows, error: pError } = await supabaseClient
            .from('finance_portfolio')
            .select('*')
            .or('category.eq.Inversiones,asset_type.neq.null');

        if (pError) throw pError;

        // 2. Fetch lots from finance_investment_lots (graceful fallback if table not yet created)
        let lots = [];
        try {
            const { data: lotsData, error: lError } = await supabaseClient
                .from('finance_investment_lots')
                .select('*')
                .order('buy_date', { ascending: false });
            if (!lError && lotsData) lots = lotsData;
        } catch (lotErr) {
            console.warn('finance_investment_lots table not yet provisioned in Supabase:', lotErr);
        }

        allInvestmentLots = lots;

        // 3. Process holdings with aggregated lot calculations
        investmentsHoldings = (portfolioRows || []).map(row => {
            const rowLots = lots.filter(l => 
                (l.portfolio_id && l.portfolio_id == row.id) || 
                (l.ticker && row.ticker && l.ticker.trim().toUpperCase() === row.ticker.trim().toUpperCase())
            );
            
            let totalShares = 0;
            let totalInvested = 0;

            if (rowLots.length > 0) {
                rowLots.forEach(l => {
                    const sh = parseFloat(l.shares || 0);
                    const pr = parseFloat(l.purchase_price || 0);
                    const fee = parseFloat(l.fee || 0);
                    totalShares += sh;
                    totalInvested += (sh * pr) + fee;
                });
            } else {
                // If no lots recorded yet, fallback to row value and price
                totalInvested = parseFloat(row.value || 0);
                const pr = parseFloat(row.current_price || 0);
                totalShares = pr > 0 ? (totalInvested / pr) : 1;
            }

            const avgCost = totalShares > 0 ? (totalInvested / totalShares) : 0;
            const currentPrice = parseFloat(row.current_price || avgCost || 0);
            const marketValue = totalShares * currentPrice;
            const pnl = marketValue - totalInvested;
            const pnlPct = totalInvested > 0 ? ((pnl / totalInvested) * 100) : 0;

            return {
                id: row.id,
                ticker: (row.ticker || row.name.split(' ')[0]).toUpperCase(),
                name: row.name,
                asset_type: (row.asset_type || 'otro').toLowerCase(),
                broker: rowLots[0]?.broker || 'GBM+',
                totalShares,
                avgCost,
                currentPrice,
                totalInvested,
                marketValue,
                pnl,
                pnlPct,
                lotsCount: rowLots.length,
                lots: rowLots
            };
        });

        renderInvestmentsTable();
        updateInvestmentsKPIs();

    } catch (err) {
        console.error('Error loading investments:', err);
        const tbody = document.getElementById('investments-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 24px;">
                        <p class="text-red">Aviso: No se pudieron cargar las inversiones bursátiles.</p>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                            Recuerda ejecutar el archivo <code>supabase_investments_schema.sql</code> en tu Supabase SQL Editor.
                        </p>
                    </td>
                </tr>`;
        }
    }
};

const updateInvestmentsKPIs = () => {
    let grandInvested = 0;
    let grandMarket = 0;
    let topHolding = null;
    let topValue = 0;

    investmentsHoldings.forEach(h => {
        grandInvested += h.totalInvested;
        grandMarket += h.marketValue;
        if (h.marketValue > topValue) {
            topValue = h.marketValue;
            topHolding = h;
        }
    });

    const grandPnl = grandMarket - grandInvested;
    const grandPnlPct = grandInvested > 0 ? ((grandPnl / grandInvested) * 100) : 0;

    const investedEl = document.getElementById('inv-kpi-invested');
    const marketEl = document.getElementById('inv-kpi-market');
    const pnlEl = document.getElementById('inv-kpi-pnl');
    const pnlPctEl = document.getElementById('inv-kpi-pnl-pct');
    const countEl = document.getElementById('inv-kpi-count');
    const topEl = document.getElementById('inv-kpi-top');
    const topPctEl = document.getElementById('inv-kpi-top-pct');

    if (investedEl) investedEl.textContent = formatCurrency(grandInvested);
    if (marketEl) marketEl.textContent = formatCurrency(grandMarket);
    if (countEl) countEl.textContent = `${investmentsHoldings.length} posiciones`;

    if (pnlEl) {
        pnlEl.textContent = `${grandPnl >= 0 ? '+' : ''}${formatCurrency(grandPnl)}`;
        pnlEl.className = `amount ${grandPnl >= 0 ? 'text-green' : 'text-red'}`;
    }
    if (pnlPctEl) {
        pnlPctEl.textContent = `${grandPnl >= 0 ? '↗ +' : '↘ '}${grandPnlPct.toFixed(2)}% Retorno`;
        pnlPctEl.style.color = grandPnl >= 0 ? 'var(--mx-green-light)' : 'var(--mx-red-light)';
    }

    if (topEl) {
        topEl.textContent = topHolding ? `${topHolding.ticker}` : '-';
    }
    if (topPctEl) {
        topPctEl.textContent = topHolding ? `${formatCurrency(topHolding.marketValue)} (${((topHolding.marketValue / (grandMarket || 1)) * 100).toFixed(1)}%)` : '-';
    }
};

const renderInvestmentsTable = () => {
    const tbody = document.getElementById('investments-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('inv-search')?.value || '').toLowerCase();
    
    const filtered = investmentsHoldings.filter(h => {
        const matchesFilter = activeInvestmentFilter === 'all' || h.asset_type === activeInvestmentFilter;
        const matchesQuery = h.ticker.toLowerCase().includes(query) || h.name.toLowerCase().includes(query);
        return matchesFilter && matchesQuery;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="padding: 32px; color: var(--text-muted);">No hay inversiones que coincidan con los filtros. Haz clic en "+ Registrar Compra".</td></tr>`;
        return;
    }

    filtered.forEach(h => {
        const meta = ASSET_TYPE_META[h.asset_type] || ASSET_TYPE_META['otro'];
        const isPositive = h.pnl >= 0;
        const pnlClass = isPositive ? 'pnl-positive' : 'pnl-negative';
        const pnlSign = isPositive ? '+' : '';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${h.ticker}</strong>
                <br><span style="font-size: 12px; color: var(--text-muted);">${h.name}</span>
            </td>
            <td>
                <span class="badge ${meta.badgeClass}">${meta.icon} ${meta.label}</span>
            </td>
            <td class="align-right">
                ${Number.isInteger(h.totalShares) ? h.totalShares : h.totalShares.toFixed(4)}
            </td>
            <td class="align-right">
                ${formatCurrency(h.avgCost)}
            </td>
            <td class="align-right">
                <span class="price-tag-clickable btn-edit-price" data-id="${h.id}" data-ticker="${h.ticker}" data-price="${h.currentPrice}" title="Clic para actualizar precio">
                    ${formatCurrency(h.currentPrice)} ✏️
                </span>
            </td>
            <td class="align-right">
                ${formatCurrency(h.totalInvested)}
            </td>
            <td class="align-right text-gold" style="font-weight: 600;">
                ${formatCurrency(h.marketValue)}
            </td>
            <td class="align-right ${pnlClass}">
                ${pnlSign}${formatCurrency(h.pnl)}
                <br><span style="font-size: 11px;">(${pnlSign}${h.pnlPct.toFixed(2)}%)</span>
            </td>
            <td class="align-center">
                <button class="action-btn-sm btn-view-lots" data-id="${h.id}" data-ticker="${h.ticker}" title="Ver compras registradas">
                    📋 Lotes (${h.lotsCount})
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Attach row events
    tbody.querySelectorAll('.btn-edit-price').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            openQuickPriceModal(target.dataset.id, target.dataset.ticker, target.dataset.price);
        });
    });

    tbody.querySelectorAll('.btn-view-lots').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget;
            openLotsModal(target.dataset.id, target.dataset.ticker);
        });
    });
};

// Filter pills
document.querySelectorAll('#inv-filter-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#inv-filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeInvestmentFilter = e.currentTarget.dataset.filter;
        renderInvestmentsTable();
    });
});

// Search input
document.getElementById('inv-search')?.addEventListener('input', () => {
    renderInvestmentsTable();
});

// ============================================================
// MODALS: ADD INVESTMENT & LOTS
// ============================================================
const openAddInvestmentModal = () => {
    const today = todayISO();
    document.getElementById('inv-form').reset();
    document.getElementById('inv-date').value = today;
    document.getElementById('inv-broker').value = 'GBM+';
    document.getElementById('inv-fee').value = '0.00';
    document.getElementById('modal-investment').classList.remove('hidden');
};

const closeAddInvestmentModal = () => {
    document.getElementById('modal-investment').classList.add('hidden');
};

document.getElementById('btn-open-add-investment')?.addEventListener('click', openAddInvestmentModal);
document.getElementById('inv-modal-close')?.addEventListener('click', closeAddInvestmentModal);
document.getElementById('btn-cancel-inv')?.addEventListener('click', closeAddInvestmentModal);
document.getElementById('modal-investment')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-investment')) closeAddInvestmentModal();
});

// Form Submit: Add Investment
document.getElementById('inv-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const type = document.getElementById('inv-type').value;
    const ticker = document.getElementById('inv-ticker').value.trim().toUpperCase();
    const name = document.getElementById('inv-name').value.trim();
    const date = document.getElementById('inv-date').value;
    const broker = document.getElementById('inv-broker').value.trim() || 'GBM+';
    const shares = parseFloat(document.getElementById('inv-shares').value);
    const price = parseFloat(document.getElementById('inv-price').value);
    const currentPriceInput = document.getElementById('inv-current-price').value;
    const currentPrice = currentPriceInput ? parseFloat(currentPriceInput) : price;
    const fee = parseFloat(document.getElementById('inv-fee').value || 0);
    const notes = document.getElementById('inv-notes').value.trim();

    if (!ticker || !name || !date || isNaN(shares) || shares <= 0 || isNaN(price) || price < 0) {
        showToast('Por favor completa todos los campos requeridos correctamente.', 'error');
        return;
    }

    try {
        // 1. Find or create holding in finance_portfolio
        let holding = investmentsHoldings.find(h => h.ticker.toUpperCase() === ticker);
        let holdingId = holding?.id;

        const iconMap = { fibra: '🏢', etf: '📈', stock: '📊', cetes: '🏛️' };
        const icon = iconMap[type] || '📈';

        if (!holdingId) {
            const newPortfolioRow = {
                name: `${ticker} - ${name}`,
                category: 'Inversiones',
                ticker: ticker,
                asset_type: type,
                current_price: currentPrice,
                value: shares * currentPrice,
                notes: notes,
                icon: icon
            };

            const { data: inserted, error: insertErr } = await supabaseClient
                .from('finance_portfolio')
                .insert([newPortfolioRow])
                .select();

            if (insertErr) throw insertErr;
            if (inserted && inserted.length > 0) {
                holdingId = inserted[0].id;
            }
        } else {
            // Update holding current price and metadata
            await supabaseClient
                .from('finance_portfolio')
                .update({
                    ticker: ticker,
                    asset_type: type,
                    current_price: currentPrice
                })
                .eq('id', holdingId);
        }

        // 2. Insert lot into finance_investment_lots
        const lotRow = {
            portfolio_id: holdingId,
            ticker: ticker,
            transaction_type: 'buy',
            buy_date: date,
            shares: shares,
            purchase_price: price,
            fee: fee,
            broker: broker,
            notes: notes
        };

        const { error: lotErr } = await supabaseClient
            .from('finance_investment_lots')
            .insert([lotRow]);

        if (lotErr) {
            console.warn('Could not insert to finance_investment_lots (schema may need update):', lotErr);
        }

        // 3. Recalculate portfolio row value
        if (holdingId) {
            // Compute total shares across all lots for this holding
            const rowLots = allInvestmentLots.filter(l => 
                (l.portfolio_id && l.portfolio_id == holdingId) || 
                (l.ticker && l.ticker.trim().toUpperCase() === ticker)
            );
            const totalShares = rowLots.reduce((sum, l) => sum + parseFloat(l.shares || 0), 0) + shares;
            const updatedValue = totalShares * currentPrice;

            await supabaseClient
                .from('finance_portfolio')
                .update({ value: updatedValue })
                .eq('id', holdingId);
        }

        closeAddInvestmentModal();
        showToast(`✅ Compra de ${shares} ${ticker} registrada con éxito!`, 'success');

        await loadInvestmentsData();
        await loadSavingsData();

    } catch (err) {
        console.error('Error saving investment:', err);
        showToast('Error al guardar la inversión en Supabase.', 'error');
    }
});

// ============================================================
// QUICK PRICE UPDATE MODAL
// ============================================================
const openQuickPriceModal = (holdingId, ticker, currentPrice) => {
    document.getElementById('price-target-id').value = holdingId;
    document.getElementById('price-target-label').textContent = `Nuevo Precio de Mercado para ${ticker} (MXN)`;
    document.getElementById('price-input-val').value = currentPrice || '';
    document.getElementById('modal-price').classList.remove('hidden');
    document.getElementById('price-input-val').focus();
};

const closeQuickPriceModal = () => {
    document.getElementById('modal-price').classList.add('hidden');
};

document.getElementById('price-modal-close')?.addEventListener('click', closeQuickPriceModal);
document.getElementById('price-cancel-btn')?.addEventListener('click', closeQuickPriceModal);
document.getElementById('modal-price')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-price')) closeQuickPriceModal();
});

document.getElementById('price-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const holdingId = document.getElementById('price-target-id').value;
    const newPrice = parseFloat(document.getElementById('price-input-val').value);

    if (!holdingId || isNaN(newPrice) || newPrice <= 0) {
        showToast('Ingresa un precio válido.', 'error');
        return;
    }

    try {
        const holding = investmentsHoldings.find(h => h.id == holdingId);
        const newMarketValue = holding ? (holding.totalShares * newPrice) : 0;

        const { error } = await supabaseClient
            .from('finance_portfolio')
            .update({
                current_price: newPrice,
                value: newMarketValue > 0 ? newMarketValue : undefined
            })
            .eq('id', holdingId);

        if (error) throw error;

        closeQuickPriceModal();
        showToast(`✅ Precio actualizado a ${formatCurrency(newPrice)}!`, 'success');

        await loadInvestmentsData();
        await loadSavingsData();
    } catch (err) {
        console.error('Error updating price:', err);
        showToast('Error al actualizar precio en Supabase.', 'error');
    }
});

// ============================================================
// LOTS HISTORY MODAL
// ============================================================
const openLotsModal = (holdingId, ticker) => {
    const holding = investmentsHoldings.find(h => h.id == holdingId || h.ticker === ticker);
    const lots = holding ? holding.lots : [];

    document.getElementById('lots-modal-title').textContent = `📋 Lotes de Compra — ${ticker}`;
    const summaryEl = document.getElementById('lots-modal-summary');
    if (summaryEl) {
        summaryEl.innerHTML = `
            <strong>${holding?.name || ticker}</strong> &bull; Total acumulado: 
            <span class="text-gold" style="font-weight: 600;">${holding?.totalShares || 0} títulos</span> | 
            Costo Promedio: <span class="text-gold">${formatCurrency(holding?.avgCost || 0)}</span>
        `;
    }

    const tbody = document.getElementById('lots-table-body');
    tbody.innerHTML = '';

    if (!lots || lots.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center" style="padding: 24px; color: var(--text-muted);">Sin lotes individuales registrados aún. Puedes agregar uno en "+ Registrar Compra".</td></tr>`;
    } else {
        lots.forEach(lot => {
            const sh = parseFloat(lot.shares || 0);
            const pr = parseFloat(lot.purchase_price || 0);
            const fee = parseFloat(lot.fee || 0);
            const total = (sh * pr) + fee;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(0, 104, 71, 0.15)';
            tr.innerHTML = `
                <td style="padding: 10px 8px;">${lot.buy_date}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 500;">${sh}</td>
                <td style="padding: 10px 8px; text-align: right;">${formatCurrency(pr)}</td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 600;">${formatCurrency(total)}</td>
                <td style="padding: 10px 8px;"><span class="badge" style="font-size: 11px;">${lot.broker || 'GBM+'}</span></td>
                <td style="padding: 10px 8px; text-align: center;">
                    <button class="delete-btn btn-delete-lot" data-lot-id="${lot.id}" title="Eliminar este lote">✕</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-delete-lot').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const lotId = e.currentTarget.dataset.lotId;
                if (!confirm('¿Deseas eliminar este lote de compra?')) return;

                try {
                    const { error } = await supabaseClient
                        .from('finance_investment_lots')
                        .delete()
                        .eq('id', lotId);

                    if (error) throw error;

                    showToast('Lote eliminado.', 'success');
                    closeLotsModal();
                    await loadInvestmentsData();
                    await loadSavingsData();
                } catch (delErr) {
                    console.error('Delete lot error:', delErr);
                    showToast('Error al eliminar lote.', 'error');
                }
            });
        });
    }

    document.getElementById('modal-lots').classList.remove('hidden');
};

const closeLotsModal = () => {
    document.getElementById('modal-lots').classList.add('hidden');
};

document.getElementById('lots-modal-close')?.addEventListener('click', closeLotsModal);
document.getElementById('btn-close-lots')?.addEventListener('click', closeLotsModal);
document.getElementById('modal-lots')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-lots')) closeLotsModal();
});

// ============================================================
// LOANS & RENTALS MODULE
// ============================================================
let loansData = [];
let rentalsData = [];

const loadLoansData = async (rawAssets = []) => {
    const grid = document.getElementById('loans-grid');
    if (!grid) return;

    try {
        let loans = [];
        try {
            const { data, error } = await supabaseClient
                .from('finance_loans')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                loans = data;
            }
        } catch (queryErr) {
            console.warn('finance_loans table query notice:', queryErr);
        }

        // Fallback: check if rawAssets from finance_portfolio has loan records
        if (!loans || loans.length === 0) {
            const legacyLoans = (rawAssets || [])
                .filter(a => {
                    const cat = (a.category || '').toLowerCase();
                    const name = (a.name || '').toLowerCase();
                    return cat.includes('préstamo') || cat.includes('prestamo') || name.includes('intereses');
                })
                .map(a => ({
                    id: a.id,
                    borrower: a.name || 'Préstamo',
                    initial_amount: parseFloat(a.value || 0),
                    current_balance: parseFloat(a.value || 0),
                    interest_rate_pct: 1.5,
                    payment_day: 15,
                    start_date: todayISO(),
                    notes: a.notes || 'Sincronizado desde portafolio',
                    status: 'active',
                    isLegacy: true
                }));
            loans = legacyLoans;
        }

        loansData = loans || [];
        renderLoansGrid();
    } catch (err) {
        console.error('Error loading loans:', err);
        loansData = [];
        renderLoansGrid();
    }
};

const renderLoansGrid = () => {
    const grid = document.getElementById('loans-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (loansData.length === 0) {
        grid.innerHTML = `
            <div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 24px;">
                <p style="color: var(--text-muted); font-size: 14px;">No tienes préstamos registrados por ahora. Haz clic en "Nuevo Préstamo" para dar seguimiento a capital e intereses.</p>
            </div>`;
        return;
    }

    loansData.forEach(loan => {
        const initial = parseFloat(loan.initial_amount || 0);
        const current = parseFloat(loan.current_balance || 0);
        const rate = parseFloat(loan.interest_rate_pct || 1.5);
        const monthlyInterest = current * (rate / 100);
        const repaid = Math.max(0, initial - current);
        const progressPct = initial > 0 ? Math.min(100, (repaid / initial) * 100) : 0;
        const isPaidOff = current <= 0 || loan.status === 'paid_off';

        const card = document.createElement('div');
        card.className = 'portfolio-card glass-panel';
        card.style.borderLeft = `3px solid ${isPaidOff ? 'var(--mx-green-light)' : 'var(--eagle-gold)'}`;
        card.innerHTML = `
            <div class="p-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="font-size: 15px; color: var(--text-on-dark);">🏦 ${loan.borrower}</h4>
                    <span style="font-size: 11px; color: var(--text-muted);">${loan.notes || 'Préstamo con interés'}</span>
                </div>
                <button class="delete-btn btn-delete-loan" data-id="${loan.id}" title="Eliminar" style="font-size: 11px;">✕</button>
            </div>

            <div class="loan-card-balance">
                ${formatCurrency(current)}
                <span style="font-size: 12px; color: var(--text-muted); font-weight: normal;"> / ${formatCurrency(initial)}</span>
            </div>

            <div class="loan-progress-container">
                <div class="loan-progress-fill" style="width: ${progressPct}%"></div>
            </div>

            <div class="loan-metrics-row">
                <span>Pagado: ${progressPct.toFixed(1)}% (${formatCurrency(repaid)})</span>
                <span>Tasa: <strong>${rate}% / mes</strong></span>
            </div>
            <div class="loan-metrics-row" style="color: var(--mx-green-light); font-weight: 500;">
                <span>Interés mensual: <strong>+${formatCurrency(monthlyInterest)}</strong></span>
                <span>Corte: Día ${loan.payment_day || 1}</span>
            </div>

            <div class="loan-actions-bar">
                <button class="btn-loan-action btn-loan-principal" data-id="${loan.id}" data-borrower="${loan.borrower}" data-balance="${current}" title="Registrar abono de capital">
                    💰 Abono Capital
                </button>
                <button class="btn-loan-action interest btn-loan-interest" data-id="${loan.id}" data-borrower="${loan.borrower}" data-interest="${monthlyInterest}" title="Registrar cobro de interés">
                    📈 Cobro Interés
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Event listeners for loan cards
    grid.querySelectorAll('.btn-delete-loan').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!confirm('¿Eliminar este préstamo?')) return;
            try {
                await supabaseClient.from('finance_loans').delete().eq('id', id);
                showToast('Préstamo eliminado.', 'success');
                await loadSavingsData();
            } catch (err) {
                console.error(err);
                showToast('Error al eliminar préstamo.', 'error');
            }
        });
    });

    grid.querySelectorAll('.btn-loan-principal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const b = e.currentTarget;
            openLoanActionModal(b.dataset.id, b.dataset.borrower, parseFloat(b.dataset.balance), 'principal');
        });
    });

    grid.querySelectorAll('.btn-loan-interest').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const b = e.currentTarget;
            openLoanActionModal(b.dataset.id, b.dataset.borrower, parseFloat(b.dataset.interest), 'interest');
        });
    });
};

const loadRentalsData = async (rawAssets = []) => {
    const grid = document.getElementById('rentals-grid');
    if (!grid) return;

    try {
        let rentals = [];
        try {
            const { data, error } = await supabaseClient
                .from('finance_rentals')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) {
                rentals = data;
            }
        } catch (queryErr) {
            console.warn('finance_rentals query notice:', queryErr);
        }

        // Fallback: check if rawAssets has real estate / rental items
        if (!rentals || rentals.length === 0) {
            const legacyRentals = (rawAssets || [])
                .filter(a => {
                    const cat = (a.category || '').toLowerCase();
                    return cat.includes('inmueble') || cat.includes('renta');
                })
                .map(a => ({
                    id: a.id,
                    name: a.name,
                    property_value: parseFloat(a.value || 0),
                    monthly_rent: parseFloat(a.value || 0) * 0.006,
                    monthly_expenses: 0,
                    tenant_name: '',
                    payment_day: 1,
                    contract_end_date: null,
                    notes: a.notes || '',
                    status: 'occupied',
                    isLegacy: true
                }));
            rentals = legacyRentals;
        }

        rentalsData = rentals || [];
        renderRentalsGrid();
    } catch (err) {
        console.error('Error loading rentals:', err);
        rentalsData = [];
        renderRentalsGrid();
    }
};

const renderRentalsGrid = () => {
    const grid = document.getElementById('rentals-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (rentalsData.length === 0) {
        grid.innerHTML = `
            <div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 24px;">
                <p style="color: var(--text-muted); font-size: 14px;">No tienes propiedades en renta registradas. Haz clic en "Nueva Propiedad" para dar seguimiento al flujo de rentas y Cap Rate.</p>
            </div>`;
        return;
    }

    rentalsData.forEach(rental => {
        const val = parseFloat(rental.property_value || 0);
        const rent = parseFloat(rental.monthly_rent || 0);
        const exp = parseFloat(rental.monthly_expenses || 0);
        const net = Math.max(0, rent - exp);
        const annualNet = net * 12;
        const capRate = val > 0 ? ((annualNet / val) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'portfolio-card glass-panel';
        card.style.borderLeft = '3px solid #2a9d8f';
        card.innerHTML = `
            <div class="p-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="font-size: 15px; color: var(--text-on-dark);">🏠 ${rental.name}</h4>
                    <span style="font-size: 12px; color: var(--text-muted);">${rental.tenant_name ? `Inquilino: ${rental.tenant_name}` : 'Sin inquilino'}</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span class="cap-rate-badge" title="Tasa de Capitalización anual">Cap Rate: ${capRate.toFixed(1)}%</span>
                    <button class="delete-btn btn-delete-rental" data-id="${rental.id}" title="Eliminar">✕</button>
                </div>
            </div>

            <div class="rental-net-callout">
                <div>
                    <span style="font-size: 11px; color: var(--text-secondary); display: block;">Renta Neta Mensual</span>
                    <strong style="font-size: 18px; color: var(--mx-green-light);">${formatCurrency(net)}</strong>
                </div>
                <div style="text-align: right; font-size: 12px; color: var(--text-muted);">
                    <span>Bruta: ${formatCurrency(rent)}</span><br>
                    <span>Gastos: -${formatCurrency(exp)}</span>
                </div>
            </div>

            <div class="loan-metrics-row">
                <span>Valor estimado: <strong>${formatCurrency(val)}</strong></span>
                <span>Cobro: Día ${rental.payment_day || 1}</span>
            </div>

            <div class="loan-actions-bar">
                <button class="btn-loan-action interest btn-record-rent" data-name="${rental.name}" data-rent="${rent}" title="Registrar ingreso de renta este mes">
                    💵 Registrar Renta Cobrada
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Event listeners for rental cards
    grid.querySelectorAll('.btn-delete-rental').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.dataset.id;
            if (!confirm('¿Eliminar esta propiedad?')) return;
            try {
                await supabaseClient.from('finance_rentals').delete().eq('id', id);
                showToast('Propiedad eliminada.', 'success');
                await loadRentalsData();
                updatePortfolioPassiveKPIs();
            } catch (err) {
                console.error(err);
                showToast('Error al eliminar propiedad.', 'error');
            }
        });
    });

    grid.querySelectorAll('.btn-record-rent').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const name = e.currentTarget.dataset.name;
            const rent = parseFloat(e.currentTarget.dataset.rent);
            const today = todayISO();

            if (!confirm(`¿Registrar cobro de renta de ${formatCurrency(rent)} para "${name}"?`)) return;

            try {
                const tx = {
                    date: today,
                    description: `Renta: ${name}`,
                    amount: rent,
                    type: 'income',
                    category: 'Renta',
                    notes: `Cobro automático de renta mensual`
                };
                await supabaseClient.from('finance_transactions').insert([tx]);
                showToast(`✅ Renta de ${formatCurrency(rent)} registrada como Ingreso!`, 'success');
                await loadYearlyData(currentYear);
            } catch (err) {
                console.error(err);
                showToast('Error al registrar ingreso de renta.', 'error');
            }
        });
    });
};

const updatePortfolioPassiveKPIs = () => {
    let totalLoanBalance = 0;
    let monthlyInterest = 0;
    let activeLoansCount = 0;

    loansData.forEach(l => {
        const bal = parseFloat(l.current_balance || 0);
        const rate = parseFloat(l.interest_rate_pct || 0);
        if (bal > 0 && l.status !== 'paid_off') {
            totalLoanBalance += bal;
            monthlyInterest += (bal * (rate / 100));
            activeLoansCount++;
        }
    });

    let totalRentalValue = 0;
    let monthlyNetRent = 0;
    let totalAnnualNet = 0;

    rentalsData.forEach(r => {
        const val = parseFloat(r.property_value || 0);
        const rent = parseFloat(r.monthly_rent || 0);
        const exp = parseFloat(r.monthly_expenses || 0);
        const net = Math.max(0, rent - exp);
        totalRentalValue += val;
        monthlyNetRent += net;
        totalAnnualNet += (net * 12);
    });

    const totalPassiveMonthly = monthlyInterest + monthlyNetRent;
    const avgCapRate = totalRentalValue > 0 ? ((totalAnnualNet / totalRentalValue) * 100) : 0;

    const passiveEl = document.getElementById('portfolio-kpi-passive');
    const loansEl = document.getElementById('portfolio-kpi-loans');
    const loansCountEl = document.getElementById('portfolio-kpi-loans-count');
    const rentalsEl = document.getElementById('portfolio-kpi-rentals');
    const capRateEl = document.getElementById('portfolio-kpi-caprate');

    if (passiveEl) passiveEl.textContent = `${formatCurrency(totalPassiveMonthly)} / mes`;
    if (loansEl) loansEl.textContent = formatCurrency(totalLoanBalance);
    if (loansCountEl) loansCountEl.textContent = `${activeLoansCount} préstamos activos`;
    if (rentalsEl) rentalsEl.textContent = formatCurrency(totalRentalValue);
    if (capRateEl) capRateEl.textContent = `Cap Rate Prom: ${avgCapRate.toFixed(1)}%`;
};

// ============================================================
// MODALS: LOANS & RENTALS
// ============================================================
// Loan Modal
const openAddLoanModal = () => {
    document.getElementById('loan-form').reset();
    document.getElementById('loan-date').value = todayISO();
    document.getElementById('loan-rate').value = '1.5';
    document.getElementById('loan-day').value = '15';
    document.getElementById('modal-loan').classList.remove('hidden');
};

const closeAddLoanModal = () => {
    document.getElementById('modal-loan').classList.add('hidden');
};

document.getElementById('btn-open-add-loan')?.addEventListener('click', openAddLoanModal);
document.getElementById('loan-modal-close')?.addEventListener('click', closeAddLoanModal);
document.getElementById('btn-cancel-loan')?.addEventListener('click', closeAddLoanModal);
document.getElementById('modal-loan')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-loan')) closeAddLoanModal();
});

document.getElementById('loan-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrower = document.getElementById('loan-borrower').value.trim();
    const initial = parseFloat(document.getElementById('loan-initial').value);
    const balanceInput = document.getElementById('loan-balance').value;
    const balance = balanceInput ? parseFloat(balanceInput) : initial;
    const rate = parseFloat(document.getElementById('loan-rate').value);
    const day = parseInt(document.getElementById('loan-day').value, 10);
    const date = document.getElementById('loan-date').value;
    const status = document.getElementById('loan-status').value;
    const notes = document.getElementById('loan-notes').value.trim();

    if (!borrower || isNaN(initial) || isNaN(balance) || isNaN(rate)) {
        showToast('Completa los campos requeridos.', 'error');
        return;
    }

    try {
        const loanRow = {
            borrower,
            initial_amount: initial,
            current_balance: balance,
            interest_rate_pct: rate,
            payment_day: day || 1,
            start_date: date,
            status,
            notes
        };

        const { error } = await supabaseClient.from('finance_loans').insert([loanRow]);
        if (error) throw error;

        // Sync to finance_portfolio
        await supabaseClient.from('finance_portfolio').insert([{
            name: borrower,
            category: 'Préstamos',
            value: balance,
            notes: `Tasa: ${rate}%/mes - Corte día ${day}`,
            icon: '🏦'
        }]);

        closeAddLoanModal();
        showToast(`✅ Préstamo a "${borrower}" registrado!`, 'success');
        await loadLoansData();
        await loadSavingsData();
    } catch (err) {
        console.error('Error saving loan:', err);
        showToast('Error al guardar préstamo en Supabase.', 'error');
    }
});

// Loan Action Modal
const openLoanActionModal = (id, borrower, defaultAmount, actionType = 'interest') => {
    const loan = loansData.find(l => l.id == id);
    document.getElementById('loan-action-id').value = id;
    document.getElementById('loan-action-borrower-label').textContent = borrower;
    document.getElementById('loan-action-balance-label').textContent = `Saldo insoluto actual: ${formatCurrency(loan?.current_balance || 0)}`;
    document.getElementById('loan-action-type').value = actionType;
    document.getElementById('loan-action-amount').value = (defaultAmount || 0).toFixed(2);
    document.getElementById('loan-action-date').value = todayISO();
    document.getElementById('loan-action-notes').value = '';
    document.getElementById('modal-loan-action').classList.remove('hidden');
};

const closeLoanActionModal = () => {
    document.getElementById('modal-loan-action').classList.add('hidden');
};

document.getElementById('loan-action-close')?.addEventListener('click', closeLoanActionModal);
document.getElementById('btn-cancel-loan-action')?.addEventListener('click', closeLoanActionModal);
document.getElementById('modal-loan-action')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-loan-action')) closeLoanActionModal();
});

document.getElementById('loan-action-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('loan-action-id').value;
    const type = document.getElementById('loan-action-type').value;
    const amount = parseFloat(document.getElementById('loan-action-amount').value);
    const date = document.getElementById('loan-action-date').value;
    const notes = document.getElementById('loan-action-notes').value.trim();

    const loan = loansData.find(l => l.id == id);
    if (!loan || isNaN(amount) || amount <= 0) {
        showToast('Ingresa un monto válido.', 'error');
        return;
    }

    try {
        if (type === 'principal') {
            const newBal = Math.max(0, parseFloat(loan.current_balance || 0) - amount);
            const newStatus = newBal <= 0 ? 'paid_off' : 'active';

            await supabaseClient
                .from('finance_loans')
                .update({ current_balance: newBal, status: newStatus })
                .eq('id', id);

            // Record transaction in finance_transactions
            await supabaseClient.from('finance_transactions').insert([{
                date,
                description: `${loan.borrower} — Abono Capital`,
                amount,
                type: 'income',
                category: 'Tía — Abono Capital',
                notes: notes || `Abono al préstamo. Nuevo saldo: ${formatCurrency(newBal)}`
            }]);

            // Sync with finance_portfolio row
            await supabaseClient
                .from('finance_portfolio')
                .update({ value: newBal })
                .eq('name', loan.borrower);

            showToast(`✅ Abono de ${formatCurrency(amount)} aplicado. Saldo: ${formatCurrency(newBal)}`, 'success');
        } else {
            // Interest payment
            await supabaseClient.from('finance_transactions').insert([{
                date,
                description: `${loan.borrower} — Interés Recibido`,
                amount,
                type: 'income',
                category: 'Tía — Interés Recibido',
                notes: notes || `Cobro de interés pactado`
            }]);

            showToast(`✅ Interés de ${formatCurrency(amount)} registrado como Ingreso!`, 'success');
        }

        closeLoanActionModal();
        await loadLoansData();
        await loadSavingsData();
        await loadYearlyData(currentYear);
    } catch (err) {
        console.error('Error recording loan action:', err);
        showToast('Error al registrar movimiento del préstamo.', 'error');
    }
});

// Rental Modal
const openAddRentalModal = () => {
    document.getElementById('rental-form').reset();
    document.getElementById('rental-expenses').value = '0.00';
    document.getElementById('rental-day').value = '1';
    document.getElementById('modal-rental').classList.remove('hidden');
};

const closeAddRentalModal = () => {
    document.getElementById('modal-rental').classList.add('hidden');
};

document.getElementById('btn-open-add-rental')?.addEventListener('click', openAddRentalModal);
document.getElementById('rental-modal-close')?.addEventListener('click', closeAddRentalModal);
document.getElementById('btn-cancel-rental')?.addEventListener('click', closeAddRentalModal);
document.getElementById('modal-rental')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-rental')) closeAddRentalModal();
});

document.getElementById('rental-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('rental-name').value.trim();
    const val = parseFloat(document.getElementById('rental-value').value);
    const rent = parseFloat(document.getElementById('rental-rent').value);
    const exp = parseFloat(document.getElementById('rental-expenses').value || 0);
    const day = parseInt(document.getElementById('rental-day').value, 10);
    const tenant = document.getElementById('rental-tenant').value.trim();
    const endDate = document.getElementById('rental-end-date').value;
    const status = document.getElementById('rental-status').value;
    const notes = document.getElementById('rental-notes').value.trim();

    if (!name || isNaN(val) || isNaN(rent)) {
        showToast('Completa los campos requeridos.', 'error');
        return;
    }

    try {
        const rentalRow = {
            name,
            property_value: val,
            monthly_rent: rent,
            monthly_expenses: exp,
            tenant_name: tenant,
            payment_day: day || 1,
            contract_end_date: endDate || null,
            status,
            notes
        };

        const { error } = await supabaseClient.from('finance_rentals').insert([rentalRow]);
        if (error) throw error;

        // Sync to finance_portfolio
        await supabaseClient.from('finance_portfolio').insert([{
            name,
            category: 'Inmuebles',
            value: val,
            notes: `Renta neta: ${formatCurrency(rent - exp)}/mes - Inquilino: ${tenant || 'N/A'}`,
            icon: '🏠'
        }]);

        closeAddRentalModal();
        showToast(`✅ Propiedad "${name}" registrada!`, 'success');
        await loadRentalsData();
        await loadSavingsData();
    } catch (err) {
        console.error('Error saving rental:', err);
        showToast('Error al guardar propiedad en Supabase.', 'error');
    }
});

// ============================================================
// MODALS: BUSINESS & ASSETS
// ============================================================
const openAddAssetModal = () => {
    document.getElementById('asset-form')?.reset();
    const catSelect = document.getElementById('asset-category');
    if (catSelect) catSelect.value = 'Negocios';
    const valInput = document.getElementById('asset-value');
    if (valInput) valInput.value = '0.00';
    document.getElementById('modal-asset')?.classList.remove('hidden');
};

const closeAddAssetModal = () => {
    document.getElementById('modal-asset')?.classList.add('hidden');
};

const openEditAssetModal = (id, name, currentValue) => {
    const idInput = document.getElementById('edit-asset-id');
    const nameLabel = document.getElementById('edit-asset-name-label');
    const valInput = document.getElementById('edit-asset-new-value');
    if (idInput) idInput.value = id;
    if (nameLabel) nameLabel.textContent = `Activo: ${name}`;
    if (valInput) valInput.value = parseFloat(currentValue || 0).toFixed(2);
    document.getElementById('modal-edit-asset')?.classList.remove('hidden');
};

const closeEditAssetModal = () => {
    document.getElementById('modal-edit-asset')?.classList.add('hidden');
};

document.getElementById('btn-open-add-asset')?.addEventListener('click', openAddAssetModal);
document.getElementById('asset-modal-close')?.addEventListener('click', closeAddAssetModal);
document.getElementById('btn-cancel-asset')?.addEventListener('click', closeAddAssetModal);
document.getElementById('modal-asset')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-asset')) closeAddAssetModal();
});

document.getElementById('edit-asset-close')?.addEventListener('click', closeEditAssetModal);
document.getElementById('btn-cancel-edit-asset')?.addEventListener('click', closeEditAssetModal);
document.getElementById('modal-edit-asset')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-edit-asset')) closeEditAssetModal();
});

// Form: Add Asset / Business
document.getElementById('asset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('asset-name').value.trim();
    const category = document.getElementById('asset-category').value;
    const value = parseFloat(document.getElementById('asset-value').value || 0);
    const url = document.getElementById('asset-url').value.trim();
    let notes = document.getElementById('asset-notes').value.trim();

    if (!name) {
        showToast('El nombre del activo es obligatorio.', 'error');
        return;
    }

    if (url) {
        notes = notes ? `${notes} | URL: ${url}` : `URL: ${url}`;
    }

    const iconMap = {
        'Negocios': '🛒',
        'Liquidez': '💵',
        'Ahorro': '🏧',
        'Otros': '💰'
    };

    try {
        const { error } = await supabaseClient
            .from('finance_portfolio')
            .insert([{
                name,
                category,
                value,
                notes,
                icon: iconMap[category] || '🛒'
            }]);

        if (error) throw error;

        closeAddAssetModal();
        showToast(`✅ "${name}" registrado correctamente!`, 'success');
        await loadSavingsData();
    } catch (err) {
        console.error('Error saving business/asset:', err);
        showToast('Error al guardar en Supabase.', 'error');
    }
});

// Form: Edit Asset Valuation
document.getElementById('edit-asset-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-asset-id').value;
    const val = parseFloat(document.getElementById('edit-asset-new-value').value || 0);

    try {
        const { error } = await supabaseClient
            .from('finance_portfolio')
            .update({ value: val })
            .eq('id', id);

        if (error) throw error;

        closeEditAssetModal();
        showToast('✅ Valuación actualizada exitosamente!', 'success');
        await loadSavingsData();
    } catch (err) {
        console.error('Error updating asset valuation:', err);
        showToast('Error al actualizar valuación en Supabase.', 'error');
    }
});

// ============================================================
// INIT
// ============================================================
const initApp = async () => {
    updateStatusIndicator();

    // Year selector
    const selector = document.getElementById('year-selector');
    selector.innerHTML = '';
    
    // Default available years from Supabase or at least 2017-2026
    const years = ['2026','2025','2024','2023','2022','2021','2020','2019','2018','2017'];
    years.forEach(year => {
        const opt = document.createElement('option');
        opt.value = year;
        opt.textContent = year;
        selector.appendChild(opt);
    });

    selector.addEventListener('change', (e) => {
        currentYear = e.target.value;
        loadYearlyData(currentYear);
    });

    // Custom Styles
    const style = document.createElement('style');
    style.textContent = `
    .delete-btn { background: none; border: 1px solid rgba(206,17,38,0.3); color: #e8293c; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 12px; transition: all 0.2s; }
    .delete-btn:hover { background: rgba(206,17,38,0.15); }
    `;
    document.head.appendChild(style);

    await loadSavingsData();
    await loadInvestmentsData();
    await loadYearlyData(currentYear);
};

document.addEventListener('DOMContentLoaded', initApp);
