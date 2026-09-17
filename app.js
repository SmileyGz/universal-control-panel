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
                    backgroundColor: 'rgba(0, 140, 91, 0.85)',
                    hoverBackgroundColor: 'rgba(0, 180, 115, 1)',
                    borderRadius: 6
                },
                {
                    label: 'Gastos',
                    data: data.expenses,
                    backgroundColor: 'rgba(206, 17, 38, 0.8)',
                    hoverBackgroundColor: 'rgba(232, 41, 60, 1)',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#C8973A', font: { family: 'Outfit', size: 13 }, boxWidth: 12, borderRadius: 4 }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 16, 13, 0.95)', titleColor: '#C8973A', bodyColor: '#F2F2EF',
                    borderColor: 'rgba(0, 104, 71, 0.4)', borderWidth: 1
                }
            },
            scales: {
                y: { grid: { color: 'rgba(0, 104, 71, 0.12)' }, ticks: { color: '#9A6E22', font: { family: 'Inter' } } },
                x: { grid: { display: false }, ticks: { color: '#9A6E22', font: { family: 'Inter' } } }
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
    'Otros':      { icon: '💰', color: '#6B3A1F' },
};

const renderPortfolioFromAssets = (assets) => {
    const grid = document.getElementById('portfolio-grid');
    grid.innerHTML = '';

    const validAssets = assets.filter(a => a.name && a.name.trim() !== '');
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

    document.getElementById('kpi-savings').textContent = formatCurrency(grandTotal);
    document.getElementById('portfolio-total-label').textContent =
        `Total: ${formatCurrency(grandTotal)} — ${countLabel} activos`;

    const chartLabels = [], chartData = [];
    for (const [cat, items] of Object.entries(grouped)) {
        const meta = CATEGORY_META[cat] || CATEGORY_META['Otros'];
        const subTotal = items.reduce((s, a) => s + parseFloat(a.value || 0), 0);
        chartLabels.push(cat);
        chartData.push(subTotal);

        grid.innerHTML += `
            <div class="portfolio-card glass-panel" style="border-left: 3px solid ${meta.color}; grid-column: 1 / -1; display: flex; justify-content: space-between; align-items: center; padding: 12px 20px;">
                <h4 style="color:${meta.color}; font-size: 15px;">${meta.icon} ${cat}</h4>
                <span style="color:var(--text-on-dark); font-family:var(--font-heading); font-size: 18px; font-weight: 600;">${formatCurrency(subTotal)}</span>
            </div>`;

        items.forEach(a => {
            const icon = a.icon || meta.icon;
            grid.innerHTML += `
                <div class="portfolio-card glass-panel">
                    <div class="p-card-header">
                        <h4>${icon} ${a.name}</h4>
                    </div>
                    <p class="p-card-amount">${formatCurrency(parseFloat(a.value || 0))}</p>
                    <p style="color:var(--text-muted); font-size: 12px; margin-top: 4px;">${a.notes || ''}</p>
                </div>`;
        });
    }

    renderPortfolioChart(chartLabels, chartData);
};

const renderPortfolioChart = (labels, data) => {
    const ctx = document.getElementById('portfolioChart').getContext('2d');
    if (portfolioChartInstance) portfolioChartInstance.destroy();

    portfolioChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: [ '#006847', '#CE1126', '#C8973A', '#008c5b', '#7a288a', '#9A6E22', '#6B3A1F' ],
                borderWidth: 2, borderColor: '#0A100D', hoverOffset: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#C8973A', font: { family: 'Outfit', size: 12 }, padding: 16, boxWidth: 10 } },
                tooltip: { backgroundColor: 'rgba(10, 16, 13, 0.95)', titleColor: '#C8973A', bodyColor: '#F2F2EF', borderColor: 'rgba(0, 104, 71, 0.4)', borderWidth: 1 }
            }, cutout: '68%'
        }
    });
};

const loadSavingsData = async () => {
    try {
        const { data: assets, error } = await supabaseClient.from('finance_portfolio').select('*').order('category');
        if (error) throw error;
        
        renderPortfolioFromAssets(assets);
    } catch (err) {
        console.error('Error loading portfolio:', err);
        document.getElementById('portfolio-grid').innerHTML = '<p class="text-red">Error cargando activos desde Supabase.</p>';
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
