// ============================================================
// SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL = 'https://samwziooqhzohpszyddw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhbXd6aW9vcWh6b2hwc3p5ZGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwNDg1MzAsImV4cCI6MjA5NjYyNDUzMH0.EFmRsIARd_oh3tn_eB40J25CRpEU-v91phjwChlGnuw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
        const { error } = await supabase.from('finance_transactions').insert([tx]);
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

        const titles = { dashboard: 'Overview', transactions: 'Mis Transacciones', portfolio: 'Business Assets & Portfolio' };
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
        
        const { data: transactions, error } = await supabase
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
                const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
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

    const validAssets = assets.filter(a => a.asset_name && a.asset_name.trim() !== '');
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
                        <h4>${icon} ${a.asset_name}</h4>
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
        const { data: assets, error } = await supabase.from('finance_portfolio').select('*').order('category');
        if (error) throw error;
        
        // Add Bazarito as an explicit Business Asset if not already present
        const hasBazarito = assets.some(a => a.asset_name.toLowerCase().includes('bazarito'));
        if (!hasBazarito) {
            assets.push({
                asset_name: 'Bazarito Cancún',
                category: 'Negocios',
                value: 0,
                notes: 'Storefront (Connected to Supabase DB)',
                icon: '🛒'
            });
        }
        
        renderPortfolioFromAssets(assets);
    } catch (err) {
        console.error('Error loading portfolio:', err);
        document.getElementById('portfolio-grid').innerHTML = '<p class="text-red">Error cargando activos desde Supabase.</p>';
    }
};

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
    await loadYearlyData(currentYear);
};

document.addEventListener('DOMContentLoaded', initApp);
