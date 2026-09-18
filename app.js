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
let currentUser = null;

const withUser = (row) => {
    if (currentUser && currentUser.id) {
        return { ...row, user_id: currentUser.id };
    }
    return row;
};

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
// DYNAMIC CATEGORY CATALOG BY TRANSACTION TYPE (PHASE 6)
// ============================================================
const TRANSACTION_CATEGORIES = {
    expense: [
        {
            group: '⚡ Gastos Fijos & Servicios',
            options: [
                { value: 'Luz / CFE', label: '💡 Luz / CFE' },
                { value: 'Agua Potable', label: '💧 Agua Potable' },
                { value: 'Gas', label: '⛽ Gas (LP / Natural)' },
                { value: 'Internet / WiFi', label: '🌐 Internet & WiFi' },
                { value: 'Telefonía / Recargas', label: '📱 Telefonía / Recargas' },
                { value: 'Renta / Vivienda', label: '🏠 Renta / Vivienda' },
                { value: 'Gasolina / Transporte', label: '🚗 Gasolina & Transporte' },
                { value: 'Suscripciones / Software', label: '💻 Suscripciones & Apps' },
                { value: 'Seguros / Pólizas', label: '🛡️ Seguros & Pólizas' }
            ]
        },
        {
            group: '🛒 Gastos Variables & Estilo de Vida',
            options: [
                { value: 'Súper / Despensa', label: '🛒 Súper / Despensa' },
                { value: 'Restaurantes / Comida', label: '🍽️ Restaurantes & Comida' },
                { value: 'Salud / Farmacia', label: '💊 Salud & Farmacia' },
                { value: 'Ropa / Compras', label: '👕 Ropa & Compras' },
                { value: 'Ocio / Entretenimiento', label: '🍿 Ocio & Entretenimiento' },
                { value: 'Educación / Cursos', label: '📚 Educación & Libros' },
                { value: 'Otros Gastos', label: '💳 Otros Gastos Personales' }
            ]
        },
        {
            group: '📦 Negocios & Operación',
            options: [
                { value: 'Inventario / Mercancía', label: '📦 Inventario & Mercancía' },
                { value: 'Envíos / Logística', label: '🚚 Envíos & Guías' },
                { value: 'Marketing / Publicidad', label: '📢 Marketing & Meta Ads' },
                { value: 'Empaque / Materiales', label: '📦 Empaque & Insumos' },
                { value: 'Comisiones / Pasarelas', label: '💳 Comisiones Pasarelas' }
            ]
        }
    ],
    income: [
        {
            group: '💼 Negocios & Ingresos Activos',
            options: [
                { value: 'Ventas Tienda', label: '🛒 Ventas Tienda / E-commerce' },
                { value: 'Freelance / Upwork', label: '💻 Freelance / Clientes / Upwork' },
                { value: 'Sueldo / Honorarios', label: '💼 Sueldo / Honorarios' },
                { value: 'Comisiones Ventas', label: '🤝 Comisiones por Venta' }
            ]
        },
        {
            group: '📈 Flujo Pasivo & Rentas',
            options: [
                { value: 'Préstamo — Interés Recibido', label: '🏦 Préstamo — Interés Recibido' },
                { value: 'Préstamo — Abono a Capital', label: '🏦 Préstamo — Abono a Capital' },
                { value: 'CETES — Rendimiento', label: '🏛️ CETES — Rendimiento' },
                { value: 'Bolsa / FIBRAs — Rendimiento', label: '📈 Bolsa / FIBRAs — Rendimiento' },
                { value: 'Rentas Cobradas', label: '🏠 Renta Cobrada (Inmueble)' }
            ]
        },
        {
            group: '🏦 Otros Ingresos',
            options: [
                { value: 'Depósito / Transferencia', label: '🔄 Depósito / Transferencia' },
                { value: 'Reembolso / Devolución', label: '↩️ Reembolso / Devolución' },
                { value: 'Otros Ingresos', label: '💰 Otros Ingresos' }
            ]
        }
    ],
    portfolio: [
        {
            group: '🏛️ Patrimonio & Movimientos de Capital',
            options: [
                { value: 'Aportación a Negocio', label: '💼 Aportación a Negocio' },
                { value: 'Compra de Acciones / Títulos', label: '📈 Compra Títulos / FIBRAs' },
                { value: 'Aporte a CETES', label: '🏛️ Depósito CETES / Renta Fija' },
                { value: 'Fondeo de Préstamo', label: '🤝 Fondeo de Préstamo' },
                { value: 'Traspaso entre Cuentas', label: '🔄 Traspaso entre Cuentas' }
            ]
        }
    ]
};

const updateCategoryDropdown = (type = 'expense', selectedVal = null) => {
    const catSelect = document.getElementById('f-category');
    if (!catSelect) return;
    catSelect.innerHTML = '';

    const groups = TRANSACTION_CATEGORIES[type] || TRANSACTION_CATEGORIES.expense;
    groups.forEach(g => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = g.group;
        g.options.forEach(opt => {
            const optionEl = document.createElement('option');
            optionEl.value = opt.value;
            optionEl.textContent = opt.label;
            if (selectedVal && selectedVal === opt.value) {
                optionEl.selected = true;
            }
            optgroup.appendChild(optionEl);
        });
        catSelect.appendChild(optgroup);
    });
};

// ============================================================
// MODAL
// ============================================================
const openModal = () => {
    document.getElementById('tx-form').reset();
    document.getElementById('f-date').value = todayISO();
    const typeSelect = document.getElementById('f-type');
    if (typeSelect) typeSelect.value = 'expense';
    updateCategoryDropdown('expense');
    document.getElementById('modal-overlay').classList.remove('hidden');
};
const closeModal = () => document.getElementById('modal-overlay').classList.add('hidden');

document.getElementById('fab-add')?.addEventListener('click', openModal);
document.getElementById('btn-open-add-tx')?.addEventListener('click', openModal);
document.getElementById('modal-close')?.addEventListener('click', closeModal);
document.getElementById('btn-cancel')?.addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// Dynamic Cascading Category Switcher
document.getElementById('f-type')?.addEventListener('change', (e) => {
    updateCategoryDropdown(e.target.value);
});

const readFileAsDataURL = (file) => new Promise((resolve) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
});

// Client-side image compressor (reduces 6MB phone tickets to ~200KB)
const compressImageFile = (file, maxWidth = 1400, quality = 0.82) => {
    return new Promise((resolve) => {
        if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
            return resolve(file);
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (blob && blob.size < file.size) {
                        const cleanName = file.name.replace(/\.[^.]+$/, '.jpg');
                        const compressedFile = new File([blob], cleanName, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        });
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };
        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

// Cloud uploader to Supabase Storage bucket 'expense-receipts'
const uploadFileToSupabaseStorage = async (file, txId, year) => {
    if (!supabaseClient) throw new Error('Supabase client not initialized');

    let userId = 'public';
    try {
        const { data: authData } = await supabaseClient.auth.getUser();
        if (authData?.user?.id) userId = authData.user.id;
    } catch (e) {
        // use 'public'
    }

    const cleanName = (file.name || 'comprobante')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');

    const fileYear = year || currentYear || new Date().getFullYear();
    const storagePath = `${userId}/${fileYear}/${txId}_${Date.now()}_${cleanName}`;

    const { error: uploadError } = await supabaseClient.storage
        .from('expense-receipts')
        .upload(storagePath, file, {
            cacheControl: '31536000',
            upsert: true
        });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabaseClient.storage
        .from('expense-receipts')
        .getPublicUrl(storagePath);

    return {
        path: storagePath,
        url: publicUrl
    };
};

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

    // Process attached receipt file if present
    let rawReceiptFile = null;
    const receiptInput = document.getElementById('f-receipt-file');
    if (receiptInput && receiptInput.files && receiptInput.files[0]) {
        rawReceiptFile = await compressImageFile(receiptInput.files[0]);
    }

    try {
        // En Supabase table, insert transaction
        const { data: insertedRows, error } = await supabaseClient
            .from('finance_transactions')
            .insert([withUser(tx)])
            .select();

        if (error) throw error;

        // If an attachment was provided, upload to Supabase Storage and update row
        if (insertedRows && insertedRows.length > 0 && rawReceiptFile) {
            const newId = insertedRows[0].id;
            const isImg = rawReceiptFile.type.startsWith('image/');
            const isPdf = rawReceiptFile.type === 'application/pdf' || rawReceiptFile.name.toLowerCase().endsWith('.pdf');
            const isXml = rawReceiptFile.type === 'text/xml' || rawReceiptFile.type === 'application/xml' || rawReceiptFile.name.toLowerCase().endsWith('.xml');

            try {
                const uploadRes = await uploadFileToSupabaseStorage(rawReceiptFile, newId, tx.date?.split('-')[0]);
                const attachedObj = {
                    id: 'att_' + Date.now(),
                    name: rawReceiptFile.name,
                    type: isImg ? 'image' : (isPdf ? 'pdf' : (isXml ? 'xml' : 'doc')),
                    size: (rawReceiptFile.size / 1024).toFixed(0) + ' KB',
                    date: tx.date,
                    url: uploadRes.url,
                    path: uploadRes.path
                };

                // Update database row directly
                await supabaseClient
                    .from('finance_transactions')
                    .update({ attachments: [attachedObj] })
                    .eq('id', newId);

                // Also update local store
                const store = getStoredTxData();
                store[newId] = {
                    attachments: [attachedObj],
                    is_deductible: false,
                    notes: tx.notes || ''
                };
                saveStoredTxData(store);
            } catch (storageErr) {
                console.warn('Storage upload error, falling back to local store:', storageErr);
                const dataUrl = await readFileAsDataURL(rawReceiptFile);
                const store = getStoredTxData();
                store[newId] = {
                    attachments: [{
                        id: 'att_' + Date.now(),
                        name: rawReceiptFile.name,
                        type: isImg ? 'image' : (isPdf ? 'pdf' : (isXml ? 'xml' : 'doc')),
                        size: (rawReceiptFile.size / 1024).toFixed(0) + ' KB',
                        date: tx.date,
                        url: dataUrl
                    }],
                    is_deductible: false,
                    notes: tx.notes || ''
                };
                saveStoredTxData(store);
            }
        }

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
const switchView = (target) => {
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.getAttribute('data-target') === target) n.classList.add('active');
        else n.classList.remove('active');
    });
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    const targetSection = document.getElementById(`view-${target}`);
    if (targetSection) targetSection.classList.add('active');

    const titles = { 
        dashboard: 'Overview', 
        transactions: 'Mis Transacciones', 
        portfolio: 'Business Assets & Portfolio',
        investments: 'Portafolio de Inversiones (GBM+ / Bolsa)'
    };
    const titleEl = document.getElementById('current-page-title');
    if (titleEl) titleEl.textContent = titles[target] || 'Overview';

    if (target === 'dashboard') {
        cashflowChartInstance?.update();
        portfolioChartInstance?.update();
    }
};

document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-target');
        switchView(target);
    });
});

// Interactive Tier Bridges
document.getElementById('kpi-card-networth')?.addEventListener('click', () => switchView('portfolio'));
document.getElementById('btn-jump-to-investments')?.addEventListener('click', () => switchView('investments'));

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
    if (!currentUser) {
        // Private Vault Lock: Protect transactions against public/unauthenticated view
        const incomeEl = document.getElementById('kpi-income');
        if (incomeEl) incomeEl.textContent = '$0.00';
        const expEl = document.getElementById('kpi-expenses');
        if (expEl) expEl.textContent = '$0.00';
        const netEl = document.getElementById('kpi-net');
        if (netEl) {
            netEl.textContent = '$0.00';
            netEl.className = 'amount text-gold';
        }
        const trendEl = document.getElementById('kpi-net-trend');
        if (trendEl) trendEl.textContent = '🔒 Inicia sesión para ver tu balance';
        const rollingEl = document.getElementById('kpi-rolling-balance-val');
        if (rollingEl) rollingEl.textContent = '$0.00';

        const tbody = document.getElementById('transactions-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 70px 20px;">
                        <div style="font-size: 42px; margin-bottom: 14px;">🔒</div>
                        <h4 style="color: var(--text-on-dark); font-size: 17px; margin-bottom: 6px;">Bóveda Financiera Protegida</h4>
                        <p style="color: var(--text-secondary); font-size: 13px; max-width: 440px; margin: 0 auto 18px auto; line-height: 1.5;">
                            Tus transacciones, ingresos y compras están cifradas y privadas. Inicia sesión con tu cuenta para desbloquear tu libro diario.
                        </p>
                        <button class="btn btn-primary" onclick="openAuthModal('login')">
                            Iniciar Sesión
                        </button>
                    </td>
                </tr>`;
        }

        const subtotalBar = document.getElementById('tx-subtotal-bar');
        if (subtotalBar) subtotalBar.innerHTML = '<span style="color: var(--text-secondary); font-size: 13px;">🔒 Inicia sesión para ver movimientos y subtotales</span>';

        const canvas = document.getElementById('cashflowChart');
        if (canvas && cashflowChartInstance) cashflowChartInstance.destroy();
        return;
    }

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

        // Calculate Cumulative Rolling Balance (Arrastre Histórico de Caja) up to selected year
        let cumulativeBalance = 0;
        try {
            const { data: allPriorTxs, error: priorErr } = await supabaseClient
                .from('finance_transactions')
                .select('type, amount')
                .lte('date', `${year}-12-31`);

            if (!priorErr && allPriorTxs) {
                allPriorTxs.forEach(tx => {
                    const amt = parseFloat(tx.amount || 0);
                    if (tx.type === 'income') cumulativeBalance += amt;
                    else if (tx.type === 'expense') cumulativeBalance -= amt;
                });
            }
        } catch (priorErr) {
            console.warn('Error fetching cumulative balance:', priorErr);
        }

        const rollingEl = document.getElementById('kpi-rolling-balance-val');
        if (rollingEl) {
            rollingEl.textContent = formatCurrency(cumulativeBalance);
            rollingEl.style.color = cumulativeBalance >= 0 ? 'var(--azteca-gold)' : 'var(--mexican-red)';
            rollingEl.title = `Arrastre acumulado de caja hasta el 31 de diciembre de ${year}`;
        }

        const yearTag = document.getElementById('kpi-net-year-tag');
        if (yearTag) yearTag.textContent = year;

        renderTransactions(transactions);
        renderCashflowChart(monthlyData);

    } catch (err) {
        console.error('Error loading yearly data', err);
        showToast('Error al cargar transacciones desde Supabase.', 'error');
    }
};

// ============================================================
// RECEIPT & EXPENSE MANAGEMENT (PHASE 5 / OPTION B)
// ============================================================
const ATTACHMENTS_STORAGE_KEY = 'ucp_expense_attachments_v2';

const MOCK_RECEIPT_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="340" height="470" viewBox="0 0 340 470" style="background:#fff; font-family:'Courier New', monospace; color:#111;">
  <rect width="100%" height="100%" fill="#fafafa"/>
  <text x="170" y="32" font-size="14" font-weight="bold" text-anchor="middle" fill="#000">SUPERMERCADO CENTRAL</text>
  <text x="170" y="48" font-size="10" text-anchor="middle" fill="#666">RFC: SMC-980412-8K1</text>
  <text x="170" y="62" font-size="10" text-anchor="middle" fill="#666">SUCURSAL 014 - PLAZA CANCÚN</text>
  <line x1="20" y1="72" x2="320" y2="72" stroke="#bbb" stroke-dasharray="3,3"/>
  <text x="24" y="90" font-size="11" fill="#333">FECHA: 12/03/2026 14:32</text>
  <text x="24" y="106" font-size="11" fill="#333">TICKET #: 9042-88219</text>
  <text x="24" y="122" font-size="11" fill="#333">CAJERO: #14 CARLOS M.</text>
  <line x1="20" y1="132" x2="320" y2="132" stroke="#bbb" stroke-dasharray="3,3"/>
  <text x="24" y="152" font-size="11" font-weight="bold" fill="#000">CANT  DESCRIPCIÓN          IMPORTE</text>
  <text x="24" y="172" font-size="11" fill="#222">1  MANZANA RED 1.2KG       $48.50</text>
  <text x="24" y="190" font-size="11" fill="#222">2  LECHE DESLACTOSADA      $64.00</text>
  <text x="24" y="208" font-size="11" fill="#222">1  ACEITE VEGETAL 900ML    $42.00</text>
  <text x="24" y="226" font-size="11" fill="#222">1  CAFÉ MOLIDO GOURMET    $115.00</text>
  <text x="24" y="244" font-size="11" fill="#222">1  ARTÍCULOS LIMPIEZA     $280.50</text>
  <text x="24" y="262" font-size="11" fill="#222">1  DESPENSA BÁSICA        $900.00</text>
  <line x1="20" y1="280" x2="320" y2="280" stroke="#000" stroke-width="1.5"/>
  <text x="24" y="302" font-size="13" font-weight="bold" fill="#000">TOTAL PAGADO:        $1,450.00</text>
  <text x="24" y="322" font-size="11" fill="#555">IVA 16% TRASLADADO:   $180.20</text>
  <line x1="20" y1="334" x2="320" y2="334" stroke="#bbb" stroke-dasharray="3,3"/>
  <text x="170" y="355" font-size="10" text-anchor="middle" fill="#444">MÉTODO: TARJETA DE DÉBITO</text>
  <text x="170" y="370" font-size="10" text-anchor="middle" fill="#444">AUT: 088492  VISA **** 4892</text>
  <text x="170" y="398" font-size="11" font-weight="bold" text-anchor="middle" fill="#059669">*** COMPROBANTE VÁLIDO ***</text>
  <text x="170" y="418" font-size="9" text-anchor="middle" fill="#777">Conserve este ticket para aclaraciones contables</text>
  <rect x="50" y="432" width="240" height="14" fill="#ccc"/>
</svg>
`);

const getStoredTxData = () => {
    try {
        return JSON.parse(localStorage.getItem(ATTACHMENTS_STORAGE_KEY) || '{}');
    } catch (e) {
        return {};
    }
};

const saveStoredTxData = (store) => {
    try {
        localStorage.setItem(ATTACHMENTS_STORAGE_KEY, JSON.stringify(store));
    } catch (e) {
        console.warn('LocalStorage quota or write error', e);
    }
};

// ============================================================
// TRANSACTION FILTERS & DYNAMIC SUBTOTAL LEDGER
// ============================================================
let currentTransactions = [];
let latestFilteredTransactions = [];
let activeTxFilter = 'all';

// State for active transaction in Receipt Hub
let activeReceiptTx = null;
let activeReceiptAttachments = [];

const applyTransactionsFilter = () => {
    const tbody = document.getElementById('transactions-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('tx-search')?.value || '').toLowerCase().trim();

    const filtered = currentTransactions.filter(tx => {
        // Filter by pill
        let matchesFilter = true;
        if (activeTxFilter === 'income') {
            matchesFilter = tx.type === 'income';
        } else if (activeTxFilter === 'expense') {
            matchesFilter = tx.type === 'expense';
        } else if (activeTxFilter === 'unbacked') {
            // Only expenses that lack any ticket or invoice attachment
            matchesFilter = tx.type === 'expense' && (!tx.attachments || tx.attachments.length === 0);
        } else if (activeTxFilter === 'backed') {
            // Transactions with at least 1 document attached
            matchesFilter = !!(tx.attachments && tx.attachments.length > 0);
        } else if (activeTxFilter === 'business') {
            const cat = (tx.category || '').toLowerCase();
            const desc = (tx.description || '').toLowerCase();
            const notes = (tx.notes || '').toLowerCase();
            matchesFilter = cat.includes('negocio') || cat.includes('venta') || cat.includes('comercio') || cat.includes('tienda') || cat.includes('store') || desc.includes('venta') || desc.includes('tienda') || notes.includes('tienda');
        } else if (activeTxFilter === 'passive') {
            const cat = (tx.category || '').toLowerCase();
            const desc = (tx.description || '').toLowerCase();
            matchesFilter = cat.includes('interés') || cat.includes('interes') || cat.includes('renta') || cat.includes('dividendo') || cat.includes('rendimiento') || cat.includes('cetes') || desc.includes('interés') || desc.includes('interes') || desc.includes('renta');
        }

        // Filter by search query
        let matchesQuery = true;
        if (query) {
            const searchable = `${tx.date || ''} ${tx.description || ''} ${tx.category || ''} ${tx.notes || ''} ${tx.amount || ''}`.toLowerCase();
            matchesQuery = searchable.includes(query);
        }

        return matchesFilter && matchesQuery;
    });

    latestFilteredTransactions = filtered;

    // Update dynamic subtotal bar
    let filteredIncome = 0;
    let filteredExpense = 0;
    filtered.forEach(tx => {
        const amt = parseFloat(tx.amount || 0);
        if (tx.type === 'income') filteredIncome += amt;
        else if (tx.type === 'expense') filteredExpense += amt;
    });
    const filteredNet = filteredIncome - filteredExpense;

    const countEl = document.getElementById('tx-stat-count');
    const incEl = document.getElementById('tx-stat-income');
    const expEl = document.getElementById('tx-stat-expense');
    const netEl = document.getElementById('tx-stat-net');

    if (countEl) countEl.textContent = `${filtered.length} mov.`;
    if (incEl) incEl.textContent = `+${formatCurrency(filteredIncome)}`;
    if (expEl) expEl.textContent = `-${formatCurrency(filteredExpense)}`;
    if (netEl) {
        netEl.textContent = `${filteredNet >= 0 ? '+' : ''}${formatCurrency(filteredNet)}`;
        netEl.className = `tx-stat-val ${filteredNet >= 0 ? 'text-green' : 'text-red'}`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="padding:32px;color:var(--text-muted)">No hay transacciones que coincidan con los filtros seleccionados.</td></tr>`;
        return;
    }

    filtered.forEach(tx => {
        const isIncome = tx.type === 'income';
        const attachments = tx.attachments || [];
        const hasAttachments = attachments.length > 0;
        const isDeductible = !!tx.is_deductible;

        let receiptBadgeHtml = '';
        if (hasAttachments) {
            receiptBadgeHtml = `
                <button class="receipt-badge has-files" data-tx-id="${tx.id}" title="Ver comprobantes y notas">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <span>${attachments.length} ${attachments.length === 1 ? 'doc' : 'docs'}</span>
                    ${isDeductible ? '<span class="tax-tag" title="Gasto Deducible / Factura CFDI">CFDI</span>' : ''}
                </button>
            `;
        } else {
            receiptBadgeHtml = `
                <button class="receipt-badge empty" data-tx-id="${tx.id}" title="Subir ticket o factura">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Adjuntar</span>
                </button>
            `;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-size: 13px; color: var(--text-secondary);">${tx.date || '-'}</td>
            <td>
                <strong>${tx.description || 'Desconocido'}</strong>
                ${tx.notes ? `<br><span style="font-size:11px;color:var(--text-muted);font-style:italic">${tx.notes}</span>` : ''}
            </td>
            <td>
                <span class="badge" style="background: rgba(255, 255, 255, 0.06); font-size: 11px;">${tx.category || 'General'}</span>
            </td>
            <td class="align-right ${isIncome ? 'text-green' : 'text-red'}" style="font-family: var(--font-mono); font-weight: 700;">
                ${isIncome ? '+' : '-'}${formatCurrency(tx.amount)}
            </td>
            <td>
                <span class="badge ${tx.type}">${isIncome ? 'Ingreso' : 'Gasto'}</span>
            </td>
            <td class="align-center">
                ${receiptBadgeHtml}
            </td>
            <td class="align-center">
                <button class="delete-btn" data-id="${tx.id}" title="Eliminar movimiento">✕</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Wire up Receipt Badge click listeners
    tbody.querySelectorAll('.receipt-badge').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const txId = btn.dataset.txId;
            openReceiptHub(txId);
        });
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

const renderTransactions = (transactions) => {
    currentTransactions = transactions || [];
    
    // Merge client-side attachments & notes store
    const store = getStoredTxData();

    // Auto-seed realistic demo attachments on the first 2 expense rows if store has never been seeded
    const hasSeeded = localStorage.getItem('ucp_demo_receipts_seeded_v2');
    if (!hasSeeded && currentTransactions.length > 0) {
        let seededCount = 0;
        currentTransactions.forEach(tx => {
            if (tx.type === 'expense' && seededCount < 2) {
                if (seededCount === 0) {
                    store[tx.id] = {
                        attachments: [
                            {
                                id: 'att_seed_1',
                                name: 'ticket_compra_super.png',
                                type: 'image',
                                size: '142 KB',
                                date: tx.date || todayISO(),
                                url: MOCK_RECEIPT_SVG
                            },
                            {
                                id: 'att_seed_2',
                                name: 'factura_CFDI_A491.pdf',
                                type: 'pdf',
                                size: '210 KB',
                                date: tx.date || todayISO(),
                                url: '#'
                            }
                        ],
                        is_deductible: true,
                        notes: tx.notes ? `${tx.notes} #Deducible #GastoOperativo` : 'Despensa de insumos #Deducible #GastoOperativo'
                    };
                } else if (seededCount === 1) {
                    store[tx.id] = {
                        attachments: [
                            {
                                id: 'att_seed_3',
                                name: 'recibo_combustible.png',
                                type: 'image',
                                size: '98 KB',
                                date: tx.date || todayISO(),
                                url: MOCK_RECEIPT_SVG
                            }
                        ],
                        is_deductible: false,
                        notes: tx.notes ? `${tx.notes} #CajaChica` : 'Traslado operativo #CajaChica'
                    };
                }
                seededCount++;
            }
        });
        saveStoredTxData(store);
        localStorage.setItem('ucp_demo_receipts_seeded_v2', 'true');
    }

    // Hydrate each transaction with attachments, is_deductible, and rich notes
    currentTransactions.forEach(tx => {
        const dbAttachments = Array.isArray(tx.attachments) ? tx.attachments : [];
        const localData = store[tx.id] || {};

        // Prioritize Supabase DB attachments if they exist, fallback to localStore
        tx.attachments = (dbAttachments.length > 0)
            ? dbAttachments
            : (localData.attachments || []);

        tx.is_deductible = (typeof tx.is_deductible === 'boolean')
            ? tx.is_deductible
            : !!localData.is_deductible;

        if (localData.notes !== undefined && localData.notes !== '' && !tx.notes) {
            tx.notes = localData.notes;
        }
    });

    applyTransactionsFilter();
};

// Hook up transaction filter pills & search input
document.querySelectorAll('#tx-filter-pills .pill-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('#tx-filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeTxFilter = e.currentTarget.dataset.txFilter;
        applyTransactionsFilter();
    });
});

document.getElementById('tx-search')?.addEventListener('input', () => {
    applyTransactionsFilter();
});

// ============================================================
// RECEIPT HUB & LIGHTBOX CONTROLLER
// ============================================================
const openReceiptHub = (txId) => {
    const tx = currentTransactions.find(t => String(t.id) === String(txId));
    if (!tx) {
        showToast('Transacción no encontrada.', 'warning');
        return;
    }

    activeReceiptTx = tx;
    activeReceiptAttachments = [...(tx.attachments || [])];

    // Populate Snapshot Card
    const isIncome = tx.type === 'income';
    const conceptEl = document.getElementById('rh-concept');
    const amountEl = document.getElementById('rh-amount');
    const dateEl = document.getElementById('rh-date');
    const badgeCatEl = document.getElementById('rh-badge-category');

    if (conceptEl) conceptEl.textContent = tx.description || 'Sin concepto';
    if (amountEl) {
        amountEl.textContent = `${isIncome ? '+' : '-'}${formatCurrency(tx.amount)} MXN`;
        amountEl.className = isIncome ? 'text-green' : 'text-red';
    }
    if (dateEl) dateEl.textContent = tx.date || '-';
    if (badgeCatEl) badgeCatEl.textContent = tx.category || 'General';

    // Populate Deductible toggle
    const toggle = document.getElementById('rh-deductible-toggle');
    const toggleLabel = document.getElementById('rh-deductible-label');
    if (toggle) {
        toggle.checked = !!tx.is_deductible;
        if (toggleLabel) {
            toggleLabel.textContent = toggle.checked ? 'Sí (Facturado / CFDI)' : 'No';
            toggleLabel.style.color = toggle.checked ? 'var(--azteca-green-vibrant)' : 'var(--text-secondary)';
        }
    }

    // Populate Notes
    const notesEl = document.getElementById('rh-notes');
    if (notesEl) notesEl.value = tx.notes || '';

    // Update Quick Tags active state based on note content
    updateQuickTagsVisualState(notesEl ? notesEl.value : '');

    // Render attachments
    renderReceiptHubAttachments();

    // Show modal
    document.getElementById('modal-receipt-hub')?.classList.remove('hidden');
};

const closeReceiptHub = () => {
    document.getElementById('modal-receipt-hub')?.classList.add('hidden');
    activeReceiptTx = null;
    activeReceiptAttachments = [];
};

const updateQuickTagsVisualState = (noteContent) => {
    document.querySelectorAll('.quick-tag-chip').forEach(chip => {
        const tag = chip.dataset.tag;
        if (tag && noteContent.includes(tag)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });
};

const renderReceiptHubAttachments = () => {
    const emptyEl = document.getElementById('rh-attachments-empty');
    const gridEl = document.getElementById('rh-attachments-grid');
    if (!emptyEl || !gridEl) return;

    if (!activeReceiptAttachments || activeReceiptAttachments.length === 0) {
        emptyEl.classList.remove('hidden');
        gridEl.classList.add('hidden');
        gridEl.innerHTML = '';
        return;
    }

    emptyEl.classList.add('hidden');
    gridEl.classList.remove('hidden');
    gridEl.innerHTML = '';

    activeReceiptAttachments.forEach((att, idx) => {
        const card = document.createElement('div');
        card.className = 'attachment-card';

        const isImage = att.type === 'image';
        const isPdf = att.type === 'pdf';
        const isXml = att.type === 'xml';

        let previewHtml = '';
        if (isImage) {
            previewHtml = `
                <div class="attachment-thumb-wrap" data-idx="${idx}" title="Clic para ampliar y hacer zoom">
                    <img src="${att.url}" alt="${att.name}">
                </div>
            `;
        } else if (isPdf) {
            previewHtml = `
                <div class="attachment-thumb-wrap" data-idx="${idx}" style="background: rgba(239, 68, 68, 0.1); color: #f87171;" title="Documento PDF">
                    <div class="attachment-doc-icon">📄</div>
                </div>
            `;
        } else if (isXml) {
            previewHtml = `
                <div class="attachment-thumb-wrap" data-idx="${idx}" style="background: rgba(16, 185, 129, 0.1); color: #6ee7b7;" title="Factura XML (CFDI)">
                    <div class="attachment-doc-icon">🏷️</div>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="attachment-thumb-wrap" data-idx="${idx}" style="background: rgba(255, 255, 255, 0.05);">
                    <div class="attachment-doc-icon">📁</div>
                </div>
            `;
        }

        card.innerHTML = `
            <button type="button" class="attachment-remove-btn" data-idx="${idx}" title="Eliminar este archivo">✕</button>
            ${previewHtml}
            <div class="attachment-info">
                <div class="attachment-name" title="${att.name}">${att.name}</div>
                <div class="attachment-meta">
                    <span>${(att.type || 'DOC').toUpperCase()}</span>
                    <span>${att.size || ''}</span>
                </div>
            </div>
        `;

        // Wire remove click
        card.querySelector('.attachment-remove-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            activeReceiptAttachments.splice(idx, 1);
            renderReceiptHubAttachments();
            showToast('Archivo removido del comprobante.', 'warning');
        });

        // Wire thumbnail preview click
        card.querySelector('.attachment-thumb-wrap')?.addEventListener('click', () => {
            if (isImage) {
                openLightbox(att.url, `${att.name} — ${activeReceiptTx?.description || ''}`);
            } else if (att.url && att.url !== '#') {
                const w = window.open(att.url, '_blank');
                if (!w) showToast('Descargando comprobante...', 'info');
            } else {
                showToast(`📄 Documento fiscal: ${att.name}`, 'info');
            }
        });

        gridEl.appendChild(card);
    });
};

// Process multiple uploaded files into activeReceiptAttachments
const processUploadedFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;

    for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i];
        if (file.type.startsWith('image/')) {
            file = await compressImageFile(file);
        }
        const dataUrl = await readFileAsDataURL(file);
        const isImg = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        const isXml = file.type === 'text/xml' || file.type === 'application/xml' || file.name.toLowerCase().endsWith('.xml');

        activeReceiptAttachments.push({
            id: 'att_' + Date.now() + '_' + i,
            name: file.name,
            type: isImg ? 'image' : (isPdf ? 'pdf' : (isXml ? 'xml' : 'doc')),
            size: (file.size / 1024).toFixed(0) + ' KB',
            date: todayISO(),
            url: dataUrl,
            rawFile: file,
            isPendingUpload: true
        });
    }

    renderReceiptHubAttachments();
    showToast(`📎 ${fileList.length} archivo(s) listo(s). Haz clic en 'Guardar' para subir a la nube.`, 'success');
};

// Wire Dropzone events
const dropzone = document.getElementById('rh-dropzone');
const fileInput = document.getElementById('rh-file-input');
const browseBtn = document.getElementById('rh-browse-btn');

browseBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    fileInput?.click();
});

dropzone?.addEventListener('click', (e) => {
    if (e.target !== browseBtn) fileInput?.click();
});

fileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
        processUploadedFiles(e.target.files);
        fileInput.value = '';
    }
});

if (dropzone) {
    ['dragenter', 'dragover'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('drag-over');
        });
    });

    ['dragleave', 'drop'].forEach(evtName => {
        dropzone.addEventListener(evtName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('drag-over');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            processUploadedFiles(dt.files);
        }
    });
}

// Wire Deductible toggle change
document.getElementById('rh-deductible-toggle')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const label = document.getElementById('rh-deductible-label');
    if (label) {
        label.textContent = isChecked ? 'Sí (Facturado / CFDI)' : 'No';
        label.style.color = isChecked ? 'var(--azteca-green-vibrant)' : 'var(--text-secondary)';
    }

    // Auto-toggle #Deducible tag in notes if checked
    const notesEl = document.getElementById('rh-notes');
    if (notesEl) {
        if (isChecked && !notesEl.value.includes('#Deducible')) {
            notesEl.value = (notesEl.value.trim() + ' #Deducible').trim();
            updateQuickTagsVisualState(notesEl.value);
        }
    }
});

// Wire Quick Tag Chips clicking
document.querySelectorAll('.quick-tag-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        const tag = chip.dataset.tag;
        const notesEl = document.getElementById('rh-notes');
        if (!tag || !notesEl) return;

        let currentNotes = notesEl.value.trim();
        if (currentNotes.includes(tag)) {
            // Remove tag
            currentNotes = currentNotes.replace(tag, '').replace(/\s{2,}/g, ' ').trim();
            chip.classList.remove('active');
        } else {
            // Add tag
            currentNotes = currentNotes ? `${currentNotes} ${tag}` : tag;
            chip.classList.add('active');
        }
        notesEl.value = currentNotes;
    });
});

// Wire Save Changes Button in Receipt Hub
document.getElementById('rh-btn-save')?.addEventListener('click', async () => {
    if (!activeReceiptTx) return;

    const saveBtn = document.getElementById('rh-btn-save');
    const originalText = saveBtn ? saveBtn.textContent : 'Guardar Comprobantes & Notas';
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = '☁️ Subiendo a la nube...';
    }

    const notesVal = document.getElementById('rh-notes')?.value.trim() || '';
    const isDeductible = !!document.getElementById('rh-deductible-toggle')?.checked;

    // 1. Upload any pending files to Supabase Storage
    let uploadFailNotice = false;

    for (let i = 0; i < activeReceiptAttachments.length; i++) {
        const att = activeReceiptAttachments[i];
        if (att.isPendingUpload && att.rawFile) {
            try {
                const year = activeReceiptTx.date ? activeReceiptTx.date.split('-')[0] : currentYear;
                const uploadRes = await uploadFileToSupabaseStorage(att.rawFile, activeReceiptTx.id, year);
                att.url = uploadRes.url;
                att.path = uploadRes.path;
                delete att.rawFile;
                delete att.isPendingUpload;
            } catch (upErr) {
                console.warn('Storage upload error for attachment:', att.name, upErr);
                uploadFailNotice = true;
                delete att.rawFile;
                delete att.isPendingUpload;
            }
        }
    }

    // Clean attachments array for database JSON serialization
    const sanitizedAttachments = activeReceiptAttachments.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        date: a.date,
        url: a.url,
        path: a.path || ''
    }));

    // Update in-memory active transaction
    activeReceiptTx.notes = notesVal;
    activeReceiptTx.is_deductible = isDeductible;
    activeReceiptTx.attachments = sanitizedAttachments;

    // Persist to local store cache
    const store = getStoredTxData();
    store[activeReceiptTx.id] = {
        attachments: sanitizedAttachments,
        is_deductible: isDeductible,
        notes: notesVal
    };
    saveStoredTxData(store);

    // 2. Persist directly to Supabase PostgreSQL database
    let dbUpdated = false;
    if (supabaseClient) {
        try {
            const { error: dbError } = await supabaseClient
                .from('finance_transactions')
                .update({
                    attachments: sanitizedAttachments,
                    is_deductible: isDeductible,
                    notes: notesVal
                })
                .eq('id', activeReceiptTx.id);

            if (dbError) {
                console.warn('Supabase DB update notice (attachments/is_deductible):', dbError);
                // Fallback to updating notes only if columns don't exist yet
                await supabaseClient
                    .from('finance_transactions')
                    .update({ notes: notesVal })
                    .eq('id', activeReceiptTx.id);
            } else {
                dbUpdated = true;
            }
        } catch (dbErr) {
            console.warn('Remote sync error:', dbErr);
        }
    }

    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }

    closeReceiptHub();
    applyTransactionsFilter();

    if (dbUpdated && !uploadFailNotice) {
        showToast('☁️ Comprobantes y notas guardados en Supabase con éxito!', 'success');
    } else if (uploadFailNotice) {
        showToast('⚠️ Comprobantes guardados localmente. Recuerda ejecutar el script SQL en Supabase para activar el bucket en la nube.', 'warning');
    } else {
        showToast('💾 Comprobantes y notas guardados correctamente.', 'success');
    }
});

// Close buttons for Receipt Hub
document.getElementById('rh-close')?.addEventListener('click', closeReceiptHub);
document.getElementById('rh-btn-close')?.addEventListener('click', closeReceiptHub);
document.getElementById('modal-receipt-hub')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-receipt-hub')) closeReceiptHub();
});

// Lightbox Zoom Modal
const openLightbox = (src, caption) => {
    const lightbox = document.getElementById('receipt-lightbox');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    if (!lightbox || !img) return;

    img.src = src;
    if (cap) cap.textContent = caption || '';
    lightbox.classList.remove('hidden');
};

const closeLightbox = () => {
    const lightbox = document.getElementById('receipt-lightbox');
    if (lightbox) lightbox.classList.add('hidden');
};

document.getElementById('lightbox-close')?.addEventListener('click', closeLightbox);
document.getElementById('receipt-lightbox')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('receipt-lightbox')) closeLightbox();
});

// ESC key closes modals
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const lightbox = document.getElementById('receipt-lightbox');
        if (lightbox && !lightbox.classList.contains('hidden')) {
            closeLightbox();
            return;
        }
        const rhModal = document.getElementById('modal-receipt-hub');
        if (rhModal && !rhModal.classList.contains('hidden')) {
            closeReceiptHub();
        }
    }
});

// Export Transactions to CSV / Excel with UTF-8 BOM
const exportTransactionsToCSV = () => {
    const listToExport = (latestFilteredTransactions && latestFilteredTransactions.length > 0) 
        ? latestFilteredTransactions 
        : currentTransactions;

    if (!listToExport || listToExport.length === 0) {
        showToast('No hay transacciones para exportar en este filtro.', 'warning');
        return;
    }

    const dataToExport = listToExport.map(tx => ({
        'Fecha': tx.date || '',
        'Concepto': tx.description || '',
        'Tipo': tx.type === 'income' ? 'Ingreso' : (tx.type === 'expense' ? 'Gasto' : tx.type),
        'Categoría': tx.category || 'General',
        'Monto (MXN)': parseFloat(tx.amount || 0).toFixed(2),
        'Notas': tx.notes || ''
    }));

    let csvContent = '';
    if (window.Papa && typeof window.Papa.unparse === 'function') {
        csvContent = window.Papa.unparse(dataToExport);
    } else {
        const headers = ['Fecha', 'Concepto', 'Tipo', 'Categoría', 'Monto (MXN)', 'Notas'];
        const rows = dataToExport.map(d => [
            `"${d.Fecha}"`,
            `"${(d.Concepto || '').replace(/"/g, '""')}"`,
            `"${d.Tipo}"`,
            `"${(d.Categoría || '').replace(/"/g, '""')}"`,
            d['Monto (MXN)'],
            `"${(d.Notas || '').replace(/"/g, '""')}"`
        ]);
        csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    }

    // Include UTF-8 BOM so Microsoft Excel renders Spanish accents flawlessly
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const yearStr = currentYear || 'todas';
    link.setAttribute('download', `transacciones_ucp_${yearStr}_${todayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`📥 ${dataToExport.length} transacciones exportadas a CSV con éxito.`, 'success');
};

document.getElementById('btn-export-csv')?.addEventListener('click', exportTransactionsToCSV);

// ============================================================
// LOAD PORTFOLIO (SUPABASE)
// ============================================================
let rawPortfolioAssets = [];

const CATEGORY_META = {
    'Préstamos':  { icon: '🏦', color: '#38BDF8' },
    'Inversiones':{ icon: '📈', color: '#00A859' },
    'Liquidez':   { icon: '💵', color: '#FFC72C' },
    'Ahorro':     { icon: '🏧', color: '#EAB308' },
    'Negocios':   { icon: '🛒', color: '#A855F7' }, // E-commerce, Comercio y Storefronts
    'Inmuebles':  { icon: '🏠', color: '#FB923C' },
    'Otros':      { icon: '💰', color: '#94A3B8' },
};

const renderPortfolioFromAssets = (assets) => {
    rawPortfolioAssets = assets || [];
    const grid = document.getElementById('portfolio-grid');
    if (grid) grid.innerHTML = '';

    // STRICT ASSET DEDUPLICATION:
    // Loans have their dedicated interactive section (Section 1)
    // Rentals have their dedicated interactive section (Section 2)
    // Stocks & CETES have their dedicated trading terminal (Inversiones & Stocks)
    // Here in Section 3 we ONLY display Business Storefronts, Bank/Liquidity Accounts & General Funds
    const EXCLUDED_GRID_CATS = ['préstamos', 'prestamos', 'inversiones', 'inmuebles', 'rentas'];
    const businessAndLiquidAssets = (assets || []).filter(a => {
        if (!a.name || a.name.trim() === '') return false;
        const cat = (a.category || '').toLowerCase().trim();
        const type = (a.asset_type || '').toLowerCase().trim();
        if (EXCLUDED_GRID_CATS.includes(cat)) return false;
        if (['fibra', 'etf', 'stock', 'cetes'].includes(type)) return false;
        return true;
    });

    if (grid) {
        if (businessAndLiquidAssets.length === 0) {
            grid.innerHTML = `
                <div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 28px;">
                    <p style="color: var(--text-muted); font-size: 14px;">No tienes negocios comerciales ni cuentas de liquidez registradas por ahora.</p>
                    <p style="color: var(--text-secondary); font-size: 12px; margin-top: 6px;">Haz clic en "Nuevo Negocio / Activo" para dar de alta tus tiendas online (Bazarito, etc.) o cuentas de liquidez.</p>
                </div>`;
        } else {
            const grouped = {};
            businessAndLiquidAssets.forEach(a => {
                const cat = a.category || 'Otros';
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(a);
            });

            for (const [cat, items] of Object.entries(grouped)) {
                const meta = CATEGORY_META[cat] || CATEGORY_META['Otros'];
                const subTotal = items.reduce((s, a) => s + parseFloat(a.value || 0), 0);

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
};

const updateConsolidatedNetWorth = () => {
    if (!currentUser) return;

    // 1. Inversiones Bursátiles Total Market Value
    let investmentsTotal = 0;
    if (investmentsHoldings && investmentsHoldings.length > 0) {
        investmentsTotal = investmentsHoldings.reduce((sum, h) => sum + (parseFloat(h.marketValue) || 0), 0);
    } else if (rawPortfolioAssets && rawPortfolioAssets.length > 0) {
        const invItems = rawPortfolioAssets.filter(a => {
            const cat = (a.category || '').toLowerCase().trim();
            const type = (a.asset_type || '').toLowerCase().trim();
            return cat === 'inversiones' || ['fibra', 'etf', 'stock', 'cetes'].includes(type);
        });
        investmentsTotal = invItems.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
    }

    // 2. Préstamos Total Saldo por Cobrar
    let loansTotal = 0;
    if (loansData && loansData.length > 0) {
        loansTotal = loansData
            .filter(l => l.status === 'active')
            .reduce((sum, l) => sum + (parseFloat(l.current_balance) || 0), 0);
    }

    // 3. Inmuebles Total Property Value
    let rentalsTotal = 0;
    if (rentalsData && rentalsData.length > 0) {
        rentalsTotal = rentalsData.reduce((sum, r) => sum + (parseFloat(r.property_value) || 0), 0);
    }

    // 4. Negocios, Cuentas y Liquidez
    let businessTotal = 0;
    let liquidTotal = 0;
    let otrosTotal = 0;
    const EXCLUDED_GRID_CATS = ['préstamos', 'prestamos', 'inversiones', 'inmuebles', 'rentas'];
    const businessAndLiquidAssets = (rawPortfolioAssets || []).filter(a => {
        if (!a.name || a.name.trim() === '') return false;
        const cat = (a.category || '').toLowerCase().trim();
        const type = (a.asset_type || '').toLowerCase().trim();
        if (EXCLUDED_GRID_CATS.includes(cat)) return false;
        if (['fibra', 'etf', 'stock', 'cetes'].includes(type)) return false;
        return true;
    });

    businessAndLiquidAssets.forEach(a => {
        const cat = (a.category || '').toLowerCase().trim();
        const val = parseFloat(a.value || 0);
        if (cat === 'negocios') businessTotal += val;
        else if (cat === 'liquidez' || cat === 'ahorro') liquidTotal += val;
        else otrosTotal += val;
    });

    const businessAndLiquidTotal = businessTotal + liquidTotal + otrosTotal;

    // Consolidated Grand Total (Net Worth)
    const grandNetWorth = investmentsTotal + loansTotal + rentalsTotal + businessAndLiquidTotal;

    // Total distinct assets count
    const totalAssetsCount = (investmentsHoldings?.length || 0) + 
                            (loansData?.filter(l => l.status === 'active').length || 0) + 
                            (rentalsData?.length || 0) + 
                            businessAndLiquidAssets.length;

    // Update Portfolio Total KPI
    const portfolioTotalKpi = document.getElementById('portfolio-kpi-total');
    if (portfolioTotalKpi) portfolioTotalKpi.textContent = formatCurrency(grandNetWorth);

    const portfolioTotalLabel = document.getElementById('portfolio-total-label');
    if (portfolioTotalLabel) {
        portfolioTotalLabel.textContent = `Patrimonio Consolidado: ${formatCurrency(grandNetWorth)} (${totalAssetsCount} activos)`;
    }

    // Update Dashboard Net Worth KPI
    const kpiSavings = document.getElementById('kpi-savings');
    if (kpiSavings) kpiSavings.textContent = formatCurrency(grandNetWorth);

    const kpiNetWorthSub = document.getElementById('kpi-networth-sub');
    if (kpiNetWorthSub) {
        kpiNetWorthSub.textContent = `Consolidado: ${formatCurrency(grandNetWorth)}`;
    }

    // Update Portfolio Quick-Bridge Banner
    const invBannerVal = document.getElementById('portfolio-inv-banner-val');
    if (invBannerVal) invBannerVal.textContent = formatCurrency(investmentsTotal);

    const invBadgeCount = document.getElementById('portfolio-inv-badge-count');
    if (invBadgeCount) {
        const count = investmentsHoldings?.length || 0;
        invBadgeCount.textContent = `${count} ${count === 1 ? 'posición' : 'posiciones'}`;
    }

    // Update Macro Asset Allocation Chart (Doughnut) in Dashboard
    const macroLabels = [];
    const macroData = [];

    if (investmentsTotal > 0) {
        macroLabels.push('Inversiones Bursátiles');
        macroData.push(investmentsTotal);
    }
    if (loansTotal > 0) {
        macroLabels.push('Préstamos por Cobrar');
        macroData.push(loansTotal);
    }
    if (rentalsTotal > 0) {
        macroLabels.push('Bienes Raíces');
        macroData.push(rentalsTotal);
    }
    if (businessTotal > 0) {
        macroLabels.push('Negocios / Storefronts');
        macroData.push(businessTotal);
    }
    if (liquidTotal > 0) {
        macroLabels.push('Liquidez & Ahorro');
        macroData.push(liquidTotal);
    }
    if (otrosTotal > 0) {
        macroLabels.push('Otros Activos');
        macroData.push(otrosTotal);
    }

    if (macroLabels.length > 0) {
        renderPortfolioChart(macroLabels, macroData);
    }

    // FASE 3: Sub-breakdown of market holdings for continuous ribbon & passive flow
    let cetesTotal = 0;
    let fibraTotal = 0;
    let etfTotal = 0;
    let stockTotal = 0;
    (investmentsHoldings || []).forEach(h => {
        const val = parseFloat(h.marketValue) || 0;
        if (h.asset_type === 'cetes') cetesTotal += val;
        else if (h.asset_type === 'fibra') fibraTotal += val;
        else if (h.asset_type === 'etf') etfTotal += val;
        else if (h.asset_type === 'stock') stockTotal += val;
    });

    renderAllocationRibbon({
        cetesTotal,
        fibraTotal,
        etfTotal,
        stockTotal,
        rentalsTotal,
        loansTotal,
        businessTotal,
        liquidTotal,
        otrosTotal
    }, grandNetWorth);

    updateFreedomRatio({
        cetesTotal,
        fibraTotal,
        etfTotal,
        stockTotal
    });

    updateSidebarBadges();
};

const renderAllocationRibbon = (data, grandTotal) => {
    const bar = document.getElementById('allocation-ribbon-bar');
    const legend = document.getElementById('allocation-legend-pills');
    const totalDisp = document.getElementById('allocation-total-disp');
    if (!bar || !legend) return;

    if (totalDisp) {
        totalDisp.textContent = formatCurrency(grandTotal);
    }

    if (grandTotal <= 0) {
        bar.innerHTML = `<div class="ribbon-segment segment-empty" style="width: 100%;" title="Sin patrimonio registrado"></div>`;
        legend.innerHTML = `<span style="font-size: 11px; color: var(--text-muted);">🔒 Inicia sesión para ver tu distribución patrimonial continua.</span>`;
        return;
    }

    const categories = [
        { key: 'cetes', name: '🏛️ CETES & Fija', val: data.cetesTotal || 0, colorClass: 'segment-cetes', hex: '#FFC72C' },
        { key: 'realestate', name: '🏢 FIBRAs & Rentas', val: (data.rentalsTotal || 0) + (data.fibraTotal || 0), colorClass: 'segment-realestate', hex: '#00A859' },
        { key: 'stocks', name: '📈 ETFs & Acciones', val: (data.etfTotal || 0) + (data.stockTotal || 0), colorClass: 'segment-stocks', hex: '#38BDF8' },
        { key: 'loans', name: '🤝 Préstamos', val: data.loansTotal || 0, colorClass: 'segment-loans', hex: '#A855F7' },
        { key: 'business', name: '🛒 Negocios & Liquidez', val: (data.businessTotal || 0) + (data.liquidTotal || 0) + (data.otrosTotal || 0), colorClass: 'segment-business', hex: '#2DD4BF' }
    ].filter(c => c.val > 0);

    bar.innerHTML = '';
    legend.innerHTML = '';

    categories.forEach(cat => {
        const pct = (cat.val / grandTotal) * 100;
        const segment = document.createElement('div');
        segment.className = `ribbon-segment ${cat.colorClass}`;
        segment.style.width = `${pct}%`;
        segment.title = `${cat.name}: ${formatCurrency(cat.val)} (${pct.toFixed(1)}%)`;
        bar.appendChild(segment);

        const chip = document.createElement('div');
        chip.className = 'legend-chip';
        chip.innerHTML = `
            <span class="legend-dot" style="background-color: ${cat.hex};"></span>
            <span>${cat.name}: <strong>${pct.toFixed(1)}%</strong> <span class="amount" style="color: var(--text-muted); font-size: 10px;">(${formatCurrency(cat.val)})</span></span>
        `;
        legend.appendChild(chip);
    });
};

const updateFreedomRatio = (assetData) => {
    // 1. Monthly passive from Loans
    let monthlyLoanInterest = 0;
    if (loansData && loansData.length > 0) {
        monthlyLoanInterest = loansData
            .filter(l => l.status === 'active')
            .reduce((sum, l) => {
                const bal = parseFloat(l.current_balance || 0);
                const rate = parseFloat(l.interest_rate_pct || 0);
                return sum + (bal * (rate / 100));
            }, 0);
    }

    // 2. Monthly passive from Rentals (net rent)
    let monthlyNetRent = 0;
    if (rentalsData && rentalsData.length > 0) {
        monthlyNetRent = rentalsData.reduce((sum, r) => {
            const rent = parseFloat(r.monthly_rent || 0);
            const exp = parseFloat(r.monthly_expenses || 0);
            return sum + Math.max(0, rent - exp);
        }, 0);
    }

    // 3. Monthly distributions from Market Securities
    const cetesVal = assetData?.cetesTotal || 0;
    const monthlyCetes = cetesVal * (0.1075 / 12);

    const fibraVal = assetData?.fibraTotal || 0;
    const monthlyFibras = fibraVal * (0.085 / 12);

    const etfVal = (assetData?.etfTotal || 0) + (assetData?.stockTotal || 0);
    const monthlyEtfs = etfVal * (0.02 / 12);

    const monthlyMarket = monthlyFibras + monthlyEtfs;
    const totalPassiveMonthly = monthlyLoanInterest + monthlyNetRent + monthlyCetes + monthlyMarket;

    // 4. Monthly Living Expenses benchmark (from current year transactions or solopreneur baseline)
    let monthlyExpensesBenchmark = 15000;
    if (transactionsData && transactionsData.length > 0) {
        const yearExpenses = transactionsData
            .filter(t => t.type === 'expense' && (!currentYear || t.date?.startsWith(currentYear)))
            .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
        
        if (yearExpenses > 0) {
            const currentMonth = new Date().getMonth() + 1;
            monthlyExpensesBenchmark = Math.max(1000, yearExpenses / Math.max(1, currentMonth));
        }
    }

    const freedomRatio = monthlyExpensesBenchmark > 0 ? (totalPassiveMonthly / monthlyExpensesBenchmark) * 100 : 0;
    const gapMonthly = Math.max(0, monthlyExpensesBenchmark - totalPassiveMonthly);

    // Update DOM
    const passiveMonthlyEl = document.getElementById('freedom-passive-monthly');
    const pctLabelEl = document.getElementById('freedom-pct-label');
    const gapLabelEl = document.getElementById('freedom-gap-label');
    const progressBarEl = document.getElementById('freedom-progress-bar');
    const statusBadgeEl = document.getElementById('freedom-status-badge');

    if (passiveMonthlyEl) {
        passiveMonthlyEl.innerHTML = `${formatCurrency(totalPassiveMonthly)} <span style="font-size: 12px; font-weight: normal; color: var(--text-secondary);">/ mes</span>`;
    }
    if (pctLabelEl) {
        pctLabelEl.textContent = `${freedomRatio.toFixed(1)}% cubierto (Gastos est.: ${formatCurrency(monthlyExpensesBenchmark)}/m)`;
    }
    
    if (gapLabelEl) {
        if (freedomRatio >= 100) {
            gapLabelEl.textContent = `🎉 ¡100% de gastos cubiertos por flujo pasivo!`;
            gapLabelEl.style.color = 'var(--azteca-gold)';
        } else {
            gapLabelEl.textContent = `Faltan ${formatCurrency(gapMonthly)}/mes para el 100% (Libertad Total)`;
            gapLabelEl.style.color = 'var(--text-muted)';
        }
    }

    if (progressBarEl) {
        progressBarEl.style.width = `${Math.min(100, Math.max(0, freedomRatio))}%`;
    }

    if (statusBadgeEl) {
        statusBadgeEl.className = 'freedom-badge';
        if (freedomRatio >= 100) {
            statusBadgeEl.classList.add('complete');
            statusBadgeEl.textContent = '🌟 Libertad Total';
        } else if (freedomRatio >= 75) {
            statusBadgeEl.classList.add('high');
            statusBadgeEl.textContent = '🚀 Independencia';
        } else if (freedomRatio >= 50) {
            statusBadgeEl.classList.add('mid');
            statusBadgeEl.textContent = '🛡️ Estabilidad';
        } else if (freedomRatio >= 25) {
            statusBadgeEl.classList.add('mid');
            statusBadgeEl.textContent = '🌱 Seguridad Básica';
        } else {
            statusBadgeEl.classList.add('low');
            statusBadgeEl.textContent = '⏳ Fase Inicial';
        }
    }

    // Update sub-sources breakdown
    const bkLoans = document.getElementById('freedom-breakdown-loans');
    const bkRentals = document.getElementById('freedom-breakdown-rentals');
    const bkCetes = document.getElementById('freedom-breakdown-cetes');
    const bkMarket = document.getElementById('freedom-breakdown-market');

    if (bkLoans) bkLoans.textContent = `${formatCurrency(monthlyLoanInterest)}/m`;
    if (bkRentals) bkRentals.textContent = `${formatCurrency(monthlyNetRent)}/m`;
    if (bkCetes) bkCetes.textContent = `${formatCurrency(monthlyCetes)}/m`;
    if (bkMarket) bkMarket.textContent = `${formatCurrency(monthlyMarket)}/m`;

    // Sincronización con Micro-Widget Freedom Ratio en Sidebar
    const sbPct = document.getElementById('sidebar-freedom-pct');
    const sbBar = document.getElementById('sidebar-freedom-bar');
    const sbVal = document.getElementById('sidebar-freedom-val');
    if (sbPct) sbPct.textContent = `${freedomRatio.toFixed(1)}%`;
    if (sbBar) sbBar.style.width = `${Math.min(100, Math.max(0, freedomRatio))}%`;
    if (sbVal) sbVal.textContent = `${formatCurrency(totalPassiveMonthly)} / mes`;
};

// ============================================================
// DYNAMIC SIDEBAR BADGES (FASE 3 INSTITUTIONAL)
// ============================================================
const updateSidebarBadges = () => {
    // 1. Transactions badge
    const txBadge = document.getElementById('sidebar-badge-txs');
    if (txBadge) {
        const count = currentTransactions ? currentTransactions.length : (transactionsData ? transactionsData.length : 0);
        txBadge.textContent = `${count} txs`;
    }

    // 2. Portfolio assets badge
    const portBadge = document.getElementById('sidebar-badge-portfolio');
    if (portBadge) {
        let totalAssets = 0;
        if (loansData) totalAssets += loansData.filter(l => l.status === 'active').length;
        if (rentalsData) totalAssets += rentalsData.length;
        if (rawPortfolioAssets) {
            const EXCLUDED_CATS = ['préstamos', 'prestamos', 'inversiones', 'inmuebles', 'rentas'];
            const businessAssets = rawPortfolioAssets.filter(a => {
                if (!a.name || a.name.trim() === '') return false;
                const cat = (a.category || '').toLowerCase().trim();
                const type = (a.asset_type || '').toLowerCase().trim();
                if (EXCLUDED_CATS.includes(cat)) return false;
                if (['fibra', 'etf', 'stock', 'cetes'].includes(type)) return false;
                return true;
            });
            totalAssets += businessAssets.length;
        }
        portBadge.textContent = `${totalAssets} act`;
    }

    // 3. Investments holdings badge
    const invBadge = document.getElementById('sidebar-badge-investments');
    if (invBadge) {
        const count = investmentsHoldings ? investmentsHoldings.length : 0;
        invBadge.textContent = `${count} pos`;
    }
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
        '#A855F7', // Modern Purple: Negocios / Storefronts
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
    if (!currentUser) {
        const kpiSavings = document.getElementById('kpi-savings');
        if (kpiSavings) kpiSavings.textContent = '$0.00';
        const portfolioTotalKpi = document.getElementById('portfolio-kpi-total');
        if (portfolioTotalKpi) portfolioTotalKpi.textContent = '$0.00';
        const portfolioTotalLabel = document.getElementById('portfolio-total-label');
        if (portfolioTotalLabel) portfolioTotalLabel.textContent = '🔒 Inicia sesión para ver tu patrimonio';

        const passiveEl = document.getElementById('portfolio-kpi-passive');
        if (passiveEl) passiveEl.textContent = '$0.00 / mes';
        const loansEl = document.getElementById('portfolio-kpi-loans');
        if (loansEl) loansEl.textContent = '$0.00';
        const loansCountEl = document.getElementById('portfolio-kpi-loans-count');
        if (loansCountEl) loansCountEl.textContent = '🔒 Protegido';
        const rentalsEl = document.getElementById('portfolio-kpi-rentals');
        if (rentalsEl) rentalsEl.textContent = '$0.00';
        const capRateEl = document.getElementById('portfolio-kpi-caprate');
        if (capRateEl) capRateEl.textContent = '🔒 Protegido';

        const loansGrid = document.getElementById('loans-grid');
        if (loansGrid) loansGrid.innerHTML = '<div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 24px;"><p style="color:var(--text-secondary); font-size: 13px;">🔒 Préstamos privados protegidos.</p></div>';

        const rentalsGrid = document.getElementById('rentals-grid');
        if (rentalsGrid) rentalsGrid.innerHTML = '<div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 24px;"><p style="color:var(--text-secondary); font-size: 13px;">🔒 Inmuebles y rentas protegidas.</p></div>';

        const grid = document.getElementById('portfolio-grid');
        if (grid) grid.innerHTML = '<div class="portfolio-card glass-panel" style="grid-column: 1 / -1; text-align: center; padding: 24px;"><p style="color:var(--text-secondary); font-size: 13px;">🔒 Negocios y activos protegidos. Inicia sesión para acceder.</p></div>';

        renderAllocationRibbon({}, 0);
        updateFreedomRatio({});

        if (portfolioChartInstance) portfolioChartInstance.destroy();
        return;
    }

    try {
        const { data: assets, error } = await supabaseClient.from('finance_portfolio').select('*').order('category');
        if (error) throw error;
        
        const safeAssets = assets || [];
        renderPortfolioFromAssets(safeAssets);
        await loadLoansData(safeAssets);
        await loadRentalsData(safeAssets);
        updatePortfolioPassiveKPIs();
        updateConsolidatedNetWorth();
    } catch (err) {
        console.error('Error loading portfolio:', err);
        const grid = document.getElementById('portfolio-grid');
        if (grid) grid.innerHTML = '<p class="text-red">Error cargando activos desde Supabase.</p>';
    }
};

// ============================================================
// LIVE MARKET QUOTES ENGINE (BANXICO SIE & BMV 24/7)
// ============================================================
let latestMarketQuotes = {};

const DEFAULT_MARKET_QUOTES = [
    { symbol: 'CETES28D', name: 'CETES 28 Días (Subasta Banxico)', price: 10.75, change_pct: 0.0, change_abs: 0.0, asset_type: 'cetes', market: 'Banxico / Directo', currency: 'MXN', source: 'Banxico SIE (SF43718)' },
    { symbol: 'USDMXN',   name: 'Dólar FIX Oficial Banxico',        price: 18.35, change_pct: -0.42, change_abs: -0.077, asset_type: 'currency', market: 'Banxico', currency: 'MXN', source: 'Banxico SIE (SF60653)' },
    { symbol: 'UDIS',     name: 'Unidades de Inversión (UDI)',       price: 8.1924, change_pct: 0.04, change_abs: 0.0032, asset_type: 'index', market: 'Banxico', currency: 'MXN', source: 'Banxico SIE (SP68257)' },
    { symbol: 'IPC',      name: 'S&P / BMV IPC Índice Líder',    price: 63509.87, change_pct: -0.65, change_abs: -414.90, asset_type: 'index', market: 'BMV', currency: 'MXN', source: 'Bolsa Mexicana de Valores' },
    { symbol: 'FUNO11',   name: 'Fibra Uno Administradora',         price: 29.15, change_pct: -2.87, change_abs: -0.86, asset_type: 'fibra', market: 'BMV', currency: 'MXN', source: 'BMV / Yahoo Finance' },
    { symbol: 'IVVPESO',  name: 'iShares Core S&P 500 Peso Hedged', price: 153.60, change_pct: -0.99, change_abs: -1.53, asset_type: 'etf', market: 'SIC / BMV', currency: 'MXN', source: 'SIC / BMV (IVVPESO.MX)' },
    { symbol: 'FMTY14',   name: 'Fibra Monterrey Inmobiliaria',     price: 14.09, change_pct: -1.47, change_abs: -0.21, asset_type: 'fibra', market: 'BMV', currency: 'MXN', source: 'BMV / Yahoo Finance' },
    { symbol: 'TIIE28',   name: 'TIIE de Fondeo Banxico a 28D',     price: 11.00, change_pct: 0.0, change_abs: 0.0, asset_type: 'cetes', market: 'Banxico', currency: 'MXN', source: 'Banxico SIE (SF43783)' }
];

const resolveMarketQuote = (rawTicker = '', name = '') => {
    const cleanSym = String(rawTicker || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanName = String(name || '').trim().toUpperCase();

    // Direct match by symbol
    if (latestMarketQuotes[cleanSym]) return latestMarketQuotes[cleanSym];

    // Normalized BMV / Banxico aliases
    if (cleanSym.includes('FUNO') || cleanName.includes('FUNO')) return latestMarketQuotes['FUNO11'];
    if (cleanSym.includes('FMTY') || cleanName.includes('FMTY')) return latestMarketQuotes['FMTY14'];
    if (cleanSym.includes('IVV') || cleanName.includes('IVV') || cleanName.includes('IVVPESO')) return latestMarketQuotes['IVVPESO'];
    if (cleanSym.includes('CETE') || cleanName.includes('CETE')) return latestMarketQuotes['CETES28D'];
    if (cleanSym.includes('USD') || cleanName.includes('DOLAR') || cleanName.includes('DÓLAR')) return latestMarketQuotes['USDMXN'];
    if (cleanSym.includes('UDI') || cleanName.includes('UDI')) return latestMarketQuotes['UDIS'];
    if (cleanSym.includes('IPC') || cleanName.includes('IPC') || cleanName.includes('BMV')) return latestMarketQuotes['IPC'];

    return null;
};

const renderTickerTrack = () => {
    const track = document.getElementById('ticker-track');
    if (!track) return;

    // 1. Core Macro Anchors (Official Mexican Benchmarks: USD/MXN, CETES 28D, IPC, UDIs)
    const macroSymbols = ['USDMXN', 'CETES28D', 'IPC', 'UDIS'];
    const macroQuotes = macroSymbols.map(s => latestMarketQuotes[s] || DEFAULT_MARKET_QUOTES.find(d => d.symbol === s)).filter(Boolean);

    const macroHtml = macroQuotes.map(q => {
        let priceStr = '';
        let badgeHtml = '';
        let isGold = false;

        if (q.asset_type === 'cetes') {
            priceStr = `${q.price.toFixed(2)}%`;
            isGold = true;
            badgeHtml = `<span class="ticker-tag">Tasa Fija</span>`;
        } else if (q.symbol === 'UDIS') {
            priceStr = q.price.toFixed(4);
            isGold = true;
            badgeHtml = `<span class="ticker-tag">Inflación</span>`;
        } else if (q.symbol === 'USDMXN') {
            priceStr = `$${q.price.toFixed(2)}`;
            const isUp = q.change_pct >= 0;
            const sign = isUp ? '+' : '';
            badgeHtml = `<span class="ticker-badge-chg ${isUp ? 'down' : 'up'}">${sign}${q.change_pct.toFixed(2)}% ${isUp ? '▲' : '▼'}</span>`;
        } else if (q.symbol === 'IPC') {
            priceStr = q.price.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const isUp = q.change_pct >= 0;
            const sign = isUp ? '+' : '';
            badgeHtml = `<span class="ticker-badge-chg ${isUp ? 'up' : 'down'}">${sign}${q.change_pct.toFixed(2)}% ${isUp ? '▲' : '▼'}</span>`;
        } else {
            priceStr = `$${q.price.toFixed(2)}`;
            const isUp = q.change_pct >= 0;
            const sign = isUp ? '+' : '';
            badgeHtml = `<span class="ticker-badge-chg ${isUp ? 'up' : 'down'}">${sign}${q.change_pct.toFixed(2)}% ${isUp ? '▲' : '▼'}</span>`;
        }

        let dispSym = q.symbol;
        if (q.symbol === 'USDMXN') dispSym = 'USD/MXN';
        else if (q.symbol === 'CETES28D') dispSym = 'CETES 28D';
        else if (q.symbol === 'IPC') dispSym = 'S&P/BMV IPC';

        return `<div class="ticker-item" title="${q.name} • Fuente Oficial: ${q.source}"><span class="ticker-sym">${dispSym}</span><span class="ticker-price ${isGold ? 'gold' : ''}">${priceStr}</span>${badgeHtml}</div>`;
    }).join('');

    // 2. Dynamic Personal Holdings Section (Model B: Private to each user)
    let userHoldingsHtml = '';
    const userItems = (currentUser && Array.isArray(investmentsHoldings) && investmentsHoldings.length > 0)
        ? investmentsHoldings.filter(h => h.ticker && h.ticker !== 'CETES28D' && h.ticker !== 'USDMXN')
        : [];

    if (userItems.length > 0) {
        // Unique user holdings by ticker (prevent duplicate ticker items)
        const seenTickers = new Set();
        const uniqueUserHoldings = [];
        userItems.forEach(h => {
            const clean = h.ticker.trim().toUpperCase();
            if (!seenTickers.has(clean)) {
                seenTickers.add(clean);
                uniqueUserHoldings.push(h);
            }
        });

        const itemsHtml = uniqueUserHoldings.map(h => {
            const quote = resolveMarketQuote(h.ticker, h.name);
            const price = quote?.price || h.currentPrice || h.avgCost || 0;
            const changePct = quote?.change_pct != null ? quote.change_pct : (h.pnlPct || 0);
            const isUp = changePct >= 0;
            const sign = isUp ? '+' : '';
            const priceStr = `$${price.toFixed(2)}`;
            const badgeHtml = `<span class="ticker-badge-chg ${isUp ? 'up' : 'down'}">${sign}${changePct.toFixed(2)}% ${isUp ? '▲' : '▼'}</span>`;

            return `<div class="ticker-item" title="Activo en tu portafolio: ${h.name}"><span class="ticker-sym" style="color: var(--azteca-green-vibrant); font-weight: 700;">💼 ${h.ticker}</span><span class="ticker-price">${priceStr}</span>${badgeHtml}<span class="ticker-tag portfolio">MI CARTERA</span></div>`;
        }).join('');

        userHoldingsHtml = `<div class="ticker-divider">│</div><div class="ticker-section-pill"><span class="ticker-pulse"></span> MI PORTAFOLIO</div>${itemsHtml}`;
    } else {
        // Fallback default BMV leaders if user is guest or has no stocks registered yet
        const fallbackSymbols = ['FUNO11', 'IVVPESO', 'FMTY14'];
        const fallbackQuotes = fallbackSymbols.map(s => latestMarketQuotes[s] || DEFAULT_MARKET_QUOTES.find(d => d.symbol === s)).filter(Boolean);
        const fallbackHtml = fallbackQuotes.map(q => {
            const isUp = q.change_pct >= 0;
            const sign = isUp ? '+' : '';
            const priceStr = `$${q.price.toFixed(2)}`;
            const badgeHtml = `<span class="ticker-badge-chg ${isUp ? 'up' : 'down'}">${sign}${q.change_pct.toFixed(2)}% ${isUp ? '▲' : '▼'}</span>`;
            let dispSym = q.symbol === 'FUNO11' ? 'FUNO 11' : (q.symbol === 'FMTY14' ? 'FMTY 14' : q.symbol);
            return `<div class="ticker-item" title="${q.name} • BMV"><span class="ticker-sym">${dispSym}</span><span class="ticker-price">${priceStr}</span>${badgeHtml}</div>`;
        }).join('');

        userHoldingsHtml = `<div class="ticker-divider">│</div>${fallbackHtml}`;
    }

    const setHtml = `${macroHtml}${userHoldingsHtml}`;
    // Duplicate set for seamless -50% CSS infinite marquee
    track.innerHTML = `${setHtml}${setHtml}`;
};

const updateSidebarMacroCard = () => {
    const cetesEl = document.getElementById('sidebar-macro-cetes');
    const usdEl = document.getElementById('sidebar-macro-usd');
    const udiEl = document.getElementById('sidebar-macro-udi');

    const cetes = latestMarketQuotes['CETES28D'] || DEFAULT_MARKET_QUOTES.find(q => q.symbol === 'CETES28D');
    const usd = latestMarketQuotes['USDMXN'] || DEFAULT_MARKET_QUOTES.find(q => q.symbol === 'USDMXN');
    const udi = latestMarketQuotes['UDIS'] || DEFAULT_MARKET_QUOTES.find(q => q.symbol === 'UDIS');

    if (cetesEl && cetes) cetesEl.textContent = `${cetes.price.toFixed(2)}%`;
    if (usdEl && usd) usdEl.textContent = `$${usd.price.toFixed(2)}`;
    if (udiEl && udi) udiEl.textContent = udi.price.toFixed(4);

    if (cetes) {
        document.querySelectorAll('.cetes-benchmark-pill').forEach(pill => {
            pill.textContent = `🏛️ Benchmark CETES: ${cetes.price.toFixed(2)}% Anual`;
        });
        const snowballRate = document.getElementById('snowball-rate-val');
        if (snowballRate) snowballRate.textContent = `${cetes.price.toFixed(2)}% (CETES)`;
    }
};

const loadLiveMarketQuotes = async () => {
    DEFAULT_MARKET_QUOTES.forEach(q => {
        latestMarketQuotes[q.symbol] = { ...q };
    });

    try {
        const cached = localStorage.getItem('ucp_market_quotes_v1');
        if (cached) {
            const parsed = JSON.parse(cached);
            Object.assign(latestMarketQuotes, parsed);
        }
    } catch {
        // Continue if cache corrupt
    }

    updateSidebarMacroCard();
    renderTickerTrack();

    try {
        const { data, error } = await supabaseClient
            .from('finance_market_quotes')
            .select('*');

        if (!error && Array.isArray(data) && data.length > 0) {
            data.forEach(q => {
                latestMarketQuotes[q.symbol.toUpperCase()] = q;
            });
            localStorage.setItem('ucp_market_quotes_v1', JSON.stringify(latestMarketQuotes));
            updateSidebarMacroCard();
            renderTickerTrack();
            return;
        }
    } catch (dbErr) {
        console.warn('Market quotes DB notice:', dbErr.message);
    }

    // Direct FX fallback fetch for instant client-side USD/MXN rate
    try {
        const res = await fetch('https://open.er-api.com/v6/latest/USD');
        if (res.ok) {
            const json = await res.json();
            if (json.rates?.MXN) {
                latestMarketQuotes['USDMXN'].price = parseFloat(json.rates.MXN.toFixed(4));
                latestMarketQuotes['USDMXN'].source = 'Mercado FX Interbancario';
                updateSidebarMacroCard();
                renderTickerTrack();
                localStorage.setItem('ucp_market_quotes_v1', JSON.stringify(latestMarketQuotes));
            }
        }
    } catch {
        // Silent fallback to defaults
    }
};

const syncHoldingsWithLiveQuotes = async () => {
    let updatedCount = 0;
    for (const h of investmentsHoldings) {
        const quote = resolveMarketQuote(h.ticker, h.name);
        if (quote && quote.price > 0 && h.id) {
            const newMarketValue = h.totalShares * quote.price;
            try {
                await supabaseClient
                    .from('finance_portfolio')
                    .update({
                        current_price: quote.price,
                        value: newMarketValue > 0 ? newMarketValue : undefined
                    })
                    .eq('id', h.id);
                updatedCount++;
            } catch (err) {
                console.warn('Could not persist holding live quote:', err);
            }
        }
    }
    await loadInvestmentsData();
    await loadSavingsData();
    return updatedCount;
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
    if (!currentUser) {
        const invEl = document.getElementById('inv-kpi-invested');
        if (invEl) invEl.textContent = '$0.00';
        const countEl = document.getElementById('inv-kpi-count');
        if (countEl) countEl.textContent = '🔒 Protegido';
        const marketEl = document.getElementById('inv-kpi-market');
        if (marketEl) marketEl.textContent = '$0.00';
        const pnlEl = document.getElementById('inv-kpi-pnl');
        if (pnlEl) pnlEl.textContent = '$0.00';
        const pnlPctEl = document.getElementById('inv-kpi-pnl-pct');
        if (pnlPctEl) pnlPctEl.textContent = '0.00%';

        const tbody = document.getElementById('investments-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 60px 20px;">
                        <div style="font-size: 38px; margin-bottom: 12px;">🔒</div>
                        <h4 style="color: var(--text-on-dark); font-size: 17px; margin-bottom: 6px;">Portafolio Bursátil Privado</h4>
                        <p style="color: var(--text-secondary); font-size: 13px; max-width: 460px; margin: 0 auto 18px auto; line-height: 1.5;">
                            Tus posiciones de CETES, FIBRAs, ETFs y acciones están cifradas. Inicia sesión con tu cuenta para visualizar y gestionar tus inversiones.
                        </p>
                        <button class="btn btn-primary" onclick="openAuthModal('login')">
                            Iniciar Sesión
                        </button>
                    </td>
                </tr>`;
        }
        investmentsHoldings = [];
        renderTickerTrack();
        return;
    }

    try {
        // 1. Fetch investment holdings from finance_portfolio safely
        const { data: allRows, error: pError } = await supabaseClient
            .from('finance_portfolio')
            .select('*');

        if (pError) throw pError;

        // STRICT ASSET SEGREGATION: Only real financial market securities in this terminal
        const EXCLUDED_CATEGORIES = ['negocios', 'préstamos', 'prestamos', 'inmuebles', 'liquidez', 'ahorro'];

        const portfolioRows = (allRows || []).filter(row => {
            const cat = (row.category || '').toLowerCase().trim();
            const rawType = (row.asset_type || '').toLowerCase().trim();
            const name = (row.name || '').toLowerCase().trim();

            // 1. Exclude operational businesses, storefronts, loans, real estate, cash boxes, and liquidity
            if (EXCLUDED_CATEGORIES.includes(cat)) {
                return false;
            }

            // 2. Reject cash, currency, loan or business keywords in name
            if (name.includes('caja') || name.includes('interés') || name.includes('interes') || name.includes('préstamo') || name.includes('prestamo') || name.includes('usd') || name.includes('dólar') || name.includes('dolar')) {
                return false;
            }

            // 3. Include if category is explicitly 'inversiones'
            if (cat === 'inversiones') {
                return true;
            }

            // 4. Include if asset_type is an explicit market security (not 'otro')
            if (['fibra', 'etf', 'stock', 'cetes'].includes(rawType)) {
                return true;
            }

            return false;
        });

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

        // 3. Process holdings with aggregated lot calculations and smart classification
        investmentsHoldings = (portfolioRows || []).map(row => {
            const rowLots = lots.filter(l => 
                (l.portfolio_id && l.portfolio_id == row.id) || 
                (l.ticker && row.ticker && l.ticker.trim().toUpperCase() === row.ticker.trim().toUpperCase())
            );

            // Smart extraction of ticker and asset type
            let rawTicker = (row.ticker || '').trim().toUpperCase();
            const upperName = row.name.toUpperCase();
            if (!rawTicker) {
                if (upperName.includes('FUNO')) rawTicker = 'FUNO11';
                else if (upperName.includes('FMTY')) rawTicker = 'FMTY14';
                else if (upperName.includes('IVV')) rawTicker = 'IVVPESO';
                else if (upperName.includes('CETES')) rawTicker = 'CETES';
                else rawTicker = (row.name.split(' ')[0] || 'INV').toUpperCase();
            }

            let resolvedType = (row.asset_type || '').toLowerCase();
            if (!resolvedType || resolvedType === 'otro') {
                const text = `${row.name} ${row.notes || ''}`.toLowerCase();
                if (text.includes('fibra') || text.includes('funo') || text.includes('fmt') || text.includes('terrafina')) resolvedType = 'fibra';
                else if (text.includes('etf') || text.includes('ivv') || text.includes('voo') || text.includes('spy')) resolvedType = 'etf';
                else if (text.includes('cete') || text.includes('bono') || text.includes('udibono')) resolvedType = 'cetes';
                else if (text.includes('accion') || text.includes('acción') || text.includes('stock')) resolvedType = 'stock';
                else resolvedType = 'stock';
            }

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
                let pr = parseFloat(row.current_price || 0);
                if (pr <= 0) {
                    if (resolvedType === 'cetes') pr = 10.00; // Valor nominal CETES 28D (~$10 MXN)
                    else pr = totalInvested > 0 ? totalInvested : 1;
                }
                totalShares = pr > 0 ? (totalInvested / pr) : 1;
            }

            const avgCost = totalShares > 0 ? (totalInvested / totalShares) : 0;
            
            // Live market price resolution from Banxico SIE / BMV
            const liveQuote = resolveMarketQuote(rawTicker, row.name);
            let currentPrice = parseFloat(row.current_price || 0);
            let isLivePrice = false;

            if (liveQuote && liveQuote.price > 0) {
                // If current_price is missing, 0, or equal to avgCost, seamlessly adopt live market price
                if (!currentPrice || Math.abs(currentPrice - avgCost) < 0.001) {
                    currentPrice = liveQuote.price;
                    isLivePrice = true;
                } else if (Math.abs(currentPrice - liveQuote.price) / liveQuote.price < 0.01) {
                    isLivePrice = true;
                }
            }

            if (!currentPrice || currentPrice <= 0) {
                currentPrice = avgCost > 0 ? avgCost : 1;
            }

            const marketValue = totalShares * currentPrice;
            const pnl = marketValue - totalInvested;
            const pnlPct = totalInvested > 0 ? ((pnl / totalInvested) * 100) : 0;

            // Resolve proper institutional broker
            let defaultBroker = 'GBM+';
            if (resolvedType === 'cetes') defaultBroker = 'Cetesdirecto';
            else if (resolvedType === 'fibra' || resolvedType === 'etf' || resolvedType === 'stock') defaultBroker = 'GBM+';

            return {
                id: row.id,
                ticker: rawTicker,
                name: row.name,
                asset_type: resolvedType,
                broker: rowLots[0]?.broker || defaultBroker,
                totalShares,
                avgCost,
                currentPrice,
                isLivePrice,
                liveQuoteSource: liveQuote ? liveQuote.source : null,
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
        updateConsolidatedNetWorth();
        renderTickerTrack();

    } catch (err) {
        console.error('Error loading investments:', err);
        const tbody = document.getElementById('investments-body');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center" style="padding: 24px;">
                        <p class="text-red">Aviso: No se pudieron cargar las inversiones bursátiles.</p>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">
                            ${err.message || 'Error de conexión con Supabase.'}
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

// FASE 3: Micro-Sparklines SVG Generator (Native, zero dependencies)
const generateSparklineSVG = (pnlPct, isPositive, assetType) => {
    const width = 74;
    const height = 24;
    const count = 7;
    const points = [];
    const basePnl = typeof pnlPct === 'number' ? pnlPct : 0;
    
    // Pseudo-random seeded micro-trend points leading to current performance
    for (let i = 0; i < count; i++) {
        const progress = i / (count - 1);
        let val;
        if (assetType === 'cetes') {
            val = progress * 8 + (Math.sin(i * 1.5) * 0.4);
        } else if (isPositive) {
            const noise = Math.sin(i * 2.1) * 1.2;
            val = (progress * Math.max(4, Math.abs(basePnl))) + noise;
        } else {
            const noise = Math.sin(i * 2.1) * 1.2;
            val = -(progress * Math.max(4, Math.abs(basePnl))) + noise;
        }
        points.push(val);
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const padding = 3;

    const coords = points.map((p, idx) => {
        const x = padding + (idx / (count - 1)) * (width - padding * 2);
        const y = (height - padding) - ((p - min) / range) * (height - padding * 2);
        return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
    });

    // Smooth bezier curve path
    let linePath = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const midX = (prev.x + curr.x) / 2;
        linePath += ` Q ${prev.x} ${prev.y}, ${midX} ${(prev.y + curr.y) / 2} T ${curr.x} ${curr.y}`;
    }

    const strokeColor = assetType === 'cetes' ? '#FFC72C' : (isPositive ? '#00A859' : '#E53935');
    const fillColor = assetType === 'cetes' ? 'rgba(255, 199, 44, 0.18)' : (isPositive ? 'rgba(0, 168, 89, 0.18)' : 'rgba(229, 57, 53, 0.18)');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

    return `
        <svg class="sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" title="Tendencia estimada de mercado">
            <path d="${areaPath}" fill="${fillColor}" />
            <path class="spark-line" d="${linePath}" stroke="${strokeColor}" />
            <circle cx="${coords[coords.length - 1].x}" cy="${coords[coords.length - 1].y}" r="2.5" fill="${strokeColor}" />
        </svg>
    `;
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
        tbody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center" style="padding: 44px 20px;">
                    <div style="font-size: 36px; margin-bottom: 8px;">📈</div>
                    <h4 style="color: var(--text-on-dark); font-size: 16px; margin-bottom: 6px;">Sin posiciones de inversión registradas</h4>
                    <p style="font-size: 13px; color: var(--text-secondary); max-width: 440px; margin: 0 auto 16px auto; line-height: 1.5;">
                        Comienza a dar seguimiento a tus acciones, ETFs, FIBRAs o CETES haciendo clic en el botón <strong>"+ Registrar Compra"</strong>.
                    </p>
                </td>
            </tr>`;
        return;
    }

    filtered.forEach(h => {
        const meta = ASSET_TYPE_META[h.asset_type] || ASSET_TYPE_META['otro'];
        const isPositive = h.pnl >= 0;
        const isNeutral = Math.abs(h.pnl) < 0.001;
        const pnlSign = isPositive ? '+' : '';
        const arrow = isNeutral ? '—' : (isPositive ? '▲' : '▼');
        const pnlPillClass = isNeutral ? 'neutral' : (isPositive ? 'pos' : 'neg');
        const meterFillWidth = Math.min(100, Math.max(8, Math.abs(h.pnlPct)));
        const meterClass = isPositive ? 'gain' : 'loss';
        const marketLabel = h.asset_type === 'cetes' ? 'Banxico / Directo' : (h.asset_type === 'fibra' ? 'BMV' : 'SIC / BMV');

        // Real Yield net of Banxico 4.5% annual inflation (UDIs / INPC)
        let realYieldBadge = '';
        if (h.asset_type === 'cetes') {
            realYieldBadge = `<span class="badge-real-yield" title="Tasa libre de riesgo Banxico 10.75% anual menos 4.5% inflación (INPC)">R. Real: +6.25%</span>`;
        } else if (h.asset_type === 'fibra') {
            realYieldBadge = `<span class="badge-real-yield" title="Rendimiento por distribuciones BMV estimado ~8.5% menos 4.5% inflación">Yield Real: +4.00%</span>`;
        } else if (Math.abs(h.pnlPct) > 0.01) {
            const realGain = h.pnlPct - 4.5;
            realYieldBadge = `<span class="badge-real-yield ${realGain >= 0 ? '' : 'warning'}" title="Retorno neto descontando 4.5% de inflación Banxico">R. Real: ${realGain >= 0 ? '+' : ''}${realGain.toFixed(1)}%</span>`;
        }

        const sparklineSVG = generateSparklineSVG(h.pnlPct, isPositive, h.asset_type);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <div class="ticker-cell">
                    <div class="ticker-icon ${meta.badgeClass}">
                        ${h.ticker.substring(0, 3)}
                    </div>
                    <div class="ticker-title-group">
                        <span class="ticker-code">${h.ticker}</span>
                        <span class="ticker-name" title="${h.name}">${h.name}</span>
                        <span class="broker-tag">🏛️ ${h.broker || 'GBM+'}</span>
                    </div>
                </div>
            </td>
            <td>
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; gap: 5px; align-items: center; flex-wrap: wrap;">
                        <span class="badge ${meta.badgeClass}" style="width: fit-content;">${meta.icon} ${meta.label}</span>
                        ${realYieldBadge}
                    </div>
                    <span style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono);">${marketLabel}</span>
                </div>
            </td>
            <td class="align-right" style="font-family: var(--font-mono); font-weight: 600;">
                ${Number.isInteger(h.totalShares) ? h.totalShares.toLocaleString() : h.totalShares.toFixed(4)}
            </td>
            <td class="align-right" style="font-family: var(--font-mono); color: var(--text-secondary);">
                ${formatCurrency(h.avgCost)}
            </td>
            <td class="align-right">
                <div class="price-meter-container">
                    <span class="price-tag-clickable btn-edit-price" data-id="${h.id}" data-ticker="${h.ticker}" data-price="${h.currentPrice}" title="${h.isLivePrice ? `Cotización en vivo (${h.liveQuoteSource || 'BMV / Banxico'}). Clic para editar precio.` : 'Clic para actualizar precio'}">
                        ${formatCurrency(h.currentPrice)} ${h.isLivePrice ? '<span class="badge-live-quote">VIVO</span>' : '✏️'}
                    </span>
                    <div class="price-meter-bar" title="Rendimiento: ${pnlSign}${h.pnlPct.toFixed(2)}%">
                        <div class="price-meter-fill ${meterClass}" style="width: ${meterFillWidth}%;"></div>
                    </div>
                </div>
            </td>
            <td class="align-right" style="font-family: var(--font-mono); color: var(--text-secondary);">
                ${formatCurrency(h.totalInvested)}
            </td>
            <td class="align-right" style="font-family: var(--font-mono); font-weight: 700; color: var(--azteca-gold);">
                ${formatCurrency(h.marketValue)}
            </td>
            <td class="align-right">
                <div class="pnl-pill ${pnlPillClass}">
                    <span>${arrow} ${pnlSign}${formatCurrency(h.pnl)}</span>
                    <span class="pnl-pct-tag">${pnlSign}${h.pnlPct.toFixed(2)}%</span>
                </div>
            </td>
            <td class="align-center">
                ${sparklineSVG}
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

// Live Quotes Sync Button
document.getElementById('btn-sync-live-quotes')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-live-quotes');
    if (btn) btn.style.opacity = '0.6';
    showToast('📡 Sincronizando cotizaciones en vivo...', 'info');
    await loadLiveMarketQuotes();
    const updated = await syncHoldingsWithLiveQuotes();
    if (btn) btn.style.opacity = '1';
    if (updated > 0) {
        showToast(`✅ ${updated} posición(es) sincronizada(s) con cotizaciones en vivo de Banxico & BMV!`, 'success');
    } else {
        showToast('✅ Cotizaciones en vivo sincronizadas con éxito.', 'success');
    }
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

            let insertedId = null;
            const { data: inserted, error: insertErr } = await supabaseClient
                .from('finance_portfolio')
                .insert([withUser(newPortfolioRow)])
                .select();

            if (insertErr) {
                console.warn('Enriched insert notice, trying basic schema:', insertErr);
                // Fallback for basic schema without custom trading columns
                const fallbackRow = {
                    name: `${ticker} - ${name}`,
                    category: 'Inversiones',
                    value: shares * currentPrice,
                    notes: `Ticker: ${ticker} | Tipo: ${type.toUpperCase()} | Broker: ${broker} | ${notes}`,
                    icon: icon
                };
                const { data: fallbackInserted, error: fallbackErr } = await supabaseClient
                    .from('finance_portfolio')
                    .insert([withUser(fallbackRow)])
                    .select();

                if (fallbackErr) throw fallbackErr;
                if (fallbackInserted && fallbackInserted.length > 0) {
                    insertedId = fallbackInserted[0].id;
                }
            } else if (inserted && inserted.length > 0) {
                insertedId = inserted[0].id;
            }

            holdingId = insertedId;
        } else {
            // Update holding current price and metadata safely
            try {
                await supabaseClient
                    .from('finance_portfolio')
                    .update({
                        ticker: ticker,
                        asset_type: type,
                        current_price: currentPrice,
                        value: shares * currentPrice
                    })
                    .eq('id', holdingId);
            } catch (updErr) {
                console.warn('Metadata update notice:', updErr);
            }
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
            .insert([withUser(lotRow)]);

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
        const annualRate = rate * 12;
        const cetesSpread = annualRate - 10.75;
        const cetesBadge = `<span class="cetes-spread-badge ${cetesSpread >= 0 ? 'positive' : 'warning'}" title="Tasa anualizada: ${annualRate.toFixed(1)}% vs CETES 28D (10.75%)">${cetesSpread >= 0 ? '▲ +' : '▼ '}${cetesSpread.toFixed(2)}% vs CETES</span>`;

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
                <div style="display: flex; gap: 6px; align-items: center;">
                    <span>Tasa: <strong>${rate}%/m</strong> (${annualRate.toFixed(1)}%a)</span>
                    ${cetesBadge}
                </div>
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
        const capSpread = capRate - 10.75;
        const capSpreadBadge = `<span class="cetes-spread-badge ${capSpread >= 0 ? 'positive' : 'warning'}" title="Cap Rate vs CETES 28D (10.75%)">${capSpread >= 0 ? '▲ +' : '▼ '}${capSpread.toFixed(2)}% vs CETES</span>`;

        const card = document.createElement('div');
        card.className = 'portfolio-card glass-panel';
        card.style.borderLeft = '3px solid #2a9d8f';
        card.innerHTML = `
            <div class="p-card-header" style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                    <h4 style="font-size: 15px; color: var(--text-on-dark);">🏠 ${rental.name}</h4>
                    <span style="font-size: 12px; color: var(--text-muted);">${rental.tenant_name ? `Inquilino: ${rental.tenant_name}` : 'Sin inquilino'}</span>
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                    <span class="cap-rate-badge" title="Tasa de Capitalización anual">Cap Rate: ${capRate.toFixed(1)}%</span>
                    ${capSpreadBadge}
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
// Loan Modal & Live Preview
const updateLoanPreview = () => {
    const balanceInput = document.getElementById('loan-balance')?.value;
    const initialInput = document.getElementById('loan-initial')?.value;
    const balance = parseFloat(balanceInput) || parseFloat(initialInput) || 0;
    const rate = parseFloat(document.getElementById('loan-rate')?.value) || 0;
    const monthlyInterest = balance * (rate / 100);
    const annualRate = rate * 12;
    const spread = annualRate - 10.75;

    const monthlyEl = document.getElementById('loan-preview-monthly');
    const spreadEl = document.getElementById('loan-preview-spread');

    if (monthlyEl) monthlyEl.textContent = formatCurrency(monthlyInterest);
    if (spreadEl) {
        spreadEl.textContent = `${spread >= 0 ? '▲ +' : '▼ '}${spread.toFixed(2)}% vs CETES`;
        spreadEl.className = `cetes-spread-badge ${spread >= 0 ? 'positive' : 'warning'}`;
    }
};

const openAddLoanModal = () => {
    document.getElementById('loan-form').reset();
    document.getElementById('loan-date').value = todayISO();
    document.getElementById('loan-rate').value = '1.5';
    document.getElementById('loan-day').value = '15';
    updateLoanPreview();
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

// Live preview listeners for loan form inputs
['loan-initial', 'loan-balance', 'loan-rate'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateLoanPreview);
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

        const { error } = await supabaseClient.from('finance_loans').insert([withUser(loanRow)]);
        if (error) throw error;

        // Sync to finance_portfolio
        await supabaseClient.from('finance_portfolio').insert([withUser({
            name: borrower,
            category: 'Préstamos',
            value: balance,
            notes: `Tasa: ${rate}%/mes - Corte día ${day}`,
            icon: '🏦'
        })]);

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
            await supabaseClient.from('finance_transactions').insert([withUser({
                date,
                description: `${loan.borrower} — Abono Capital`,
                amount,
                type: 'income',
                category: 'Tía — Abono Capital',
                notes: notes || `Abono al préstamo. Nuevo saldo: ${formatCurrency(newBal)}`
            })]);

            // Sync with finance_portfolio row
            await supabaseClient
                .from('finance_portfolio')
                .update({ value: newBal })
                .eq('name', loan.borrower);

            showToast(`✅ Abono de ${formatCurrency(amount)} aplicado. Saldo: ${formatCurrency(newBal)}`, 'success');
        } else {
            // Interest payment
            await supabaseClient.from('finance_transactions').insert([withUser({
                date,
                description: `${loan.borrower} — Interés Recibido`,
                amount,
                type: 'income',
                category: 'Tía — Interés Recibido',
                notes: notes || `Cobro de interés pactado`
            })]);

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

// Rental Modal & Live Preview
const updateRentalPreview = () => {
    const val = parseFloat(document.getElementById('rental-value')?.value) || 0;
    const rent = parseFloat(document.getElementById('rental-rent')?.value) || 0;
    const exp = parseFloat(document.getElementById('rental-expenses')?.value) || 0;
    const net = Math.max(0, rent - exp);
    const annualNet = net * 12;
    const capRate = val > 0 ? ((annualNet / val) * 100) : 0;
    const spread = capRate - 10.75;

    const capEl = document.getElementById('rental-preview-caprate');
    const spreadEl = document.getElementById('rental-preview-spread');

    if (capEl) capEl.textContent = `${capRate.toFixed(2)}%`;
    if (spreadEl) {
        spreadEl.textContent = `${spread >= 0 ? '▲ +' : '▼ '}${spread.toFixed(2)}% vs CETES`;
        spreadEl.className = `cetes-spread-badge ${spread >= 0 ? 'positive' : 'warning'}`;
    }
};

const openAddRentalModal = () => {
    document.getElementById('rental-form').reset();
    document.getElementById('rental-expenses').value = '0.00';
    document.getElementById('rental-day').value = '1';
    updateRentalPreview();
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

// Live preview listeners for rental form inputs
['rental-value', 'rental-rent', 'rental-expenses'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateRentalPreview);
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

        const { error } = await supabaseClient.from('finance_rentals').insert([withUser(rentalRow)]);
        if (error) throw error;

        // Sync to finance_portfolio
        await supabaseClient.from('finance_portfolio').insert([withUser({
            name,
            category: 'Inmuebles',
            value: val,
            notes: `Renta neta: ${formatCurrency(rent - exp)}/mes - Inquilino: ${tenant || 'N/A'}`,
            icon: '🏠'
        })]);

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
            .insert([withUser({
                name,
                category,
                value,
                notes,
                icon: iconMap[category] || '🛒'
            })]);

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
// FASE 3: AUTHENTICATION & SAAS MULTI-TENANCY
// ============================================================
const updateAuthUI = (user) => {
    currentUser = user;
    const btnOpenAuth = document.getElementById('btn-open-auth');
    const profileBadge = document.getElementById('user-profile-badge');
    const emailDisplay = document.getElementById('user-email-display');
    const dropdownEmail = document.getElementById('dropdown-user-email');
    const initialsDisplay = document.getElementById('user-avatar-initials');

    if (user && user.email) {
        if (btnOpenAuth) btnOpenAuth.classList.add('hidden');
        if (profileBadge) profileBadge.classList.remove('hidden');

        const email = user.email;
        if (emailDisplay) emailDisplay.textContent = email;
        if (dropdownEmail) dropdownEmail.textContent = email;
        if (initialsDisplay) {
            initialsDisplay.textContent = email.charAt(0).toUpperCase();
        }
    } else {
        if (btnOpenAuth) btnOpenAuth.classList.remove('hidden');
        if (profileBadge) profileBadge.classList.add('hidden');
        document.getElementById('user-dropdown')?.classList.add('hidden');
    }
};

const openAuthModal = (tab = 'login') => {
    switchAuthTab(tab);
    document.getElementById('modal-auth')?.classList.remove('hidden');
};

const closeAuthModal = () => {
    document.getElementById('modal-auth')?.classList.add('hidden');
};

const switchAuthTab = (tabName) => {
    document.querySelectorAll('.auth-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    const loginForm = document.getElementById('auth-login-form');
    const signupForm = document.getElementById('auth-signup-form');
    const magicForm = document.getElementById('auth-magic-form');

    if (loginForm) loginForm.classList.toggle('hidden', tabName !== 'login');
    if (signupForm) signupForm.classList.toggle('hidden', tabName !== 'signup');
    if (magicForm) magicForm.classList.toggle('hidden', tabName !== 'magic');
};

const openPricingModal = () => {
    document.getElementById('user-dropdown')?.classList.add('hidden');
    document.getElementById('modal-pricing')?.classList.remove('hidden');
};

const closePricingModal = () => {
    document.getElementById('modal-pricing')?.classList.add('hidden');
};

const refreshAllData = async () => {
    await loadLiveMarketQuotes();
    await loadSavingsData();
    await loadInvestmentsData();
    await loadYearlyData(currentYear);
};

const initAuth = async () => {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        updateAuthUI(session?.user || null);

        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            const previousUserId = currentUser?.id;
            updateAuthUI(session?.user || null);

            if (event === 'SIGNED_IN') {
                showToast(`👋 ¡Bienvenido, ${session.user.email}!`, 'success');
                closeAuthModal();
                if (previousUserId !== session.user.id) {
                    await refreshAllData();
                }
            } else if (event === 'SIGNED_OUT') {
                showToast('Has cerrado sesión.', 'info');
                await refreshAllData();
            }
        });
    } catch (err) {
        console.warn('Auth initialization warning:', err);
    }
};

// Auth Modal triggers
document.getElementById('btn-open-auth')?.addEventListener('click', () => openAuthModal('login'));
document.getElementById('auth-modal-close')?.addEventListener('click', closeAuthModal);
document.getElementById('btn-cancel-auth')?.addEventListener('click', closeAuthModal);
document.querySelectorAll('.btn-cancel-auth-generic').forEach(b => b.addEventListener('click', closeAuthModal));
document.getElementById('modal-auth')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-auth')) closeAuthModal();
});

// Auth tab buttons
document.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
});

// Pricing Modal triggers
document.getElementById('sidebar-link-pricing')?.addEventListener('click', (e) => {
    e.preventDefault();
    openPricingModal();
});
document.getElementById('menu-btn-pricing')?.addEventListener('click', openPricingModal);
document.getElementById('pricing-modal-close')?.addEventListener('click', closePricingModal);
document.getElementById('btn-starter-plan')?.addEventListener('click', closePricingModal);
document.getElementById('btn-activate-pro')?.addEventListener('click', () => {
    showToast('⭐ ¡Tu cuenta tiene acceso anticipado al Plan Pro!', 'success');
    closePricingModal();
});
document.getElementById('modal-pricing')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-pricing')) closePricingModal();
});

// User profile dropdown
const userBadge = document.getElementById('user-profile-badge');
userBadge?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
});

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown && !dropdown.contains(e.target) && e.target !== userBadge) {
        dropdown.classList.add('hidden');
    }
});

// Auth Forms
document.getElementById('auth-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('btn-submit-login');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Verificando...'; }

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
        closeAuthModal();
        showToast('✅ Sesión iniciada correctamente!', 'success');
    } catch (err) {
        console.error('Login error:', err);
        showToast(err.message || 'Error al iniciar sesión.', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Entrar'; }
    }
});

document.getElementById('auth-signup-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const submitBtn = document.getElementById('btn-submit-signup');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creando cuenta...'; }

    try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
            closeAuthModal();
            showToast('🎉 ¡Cuenta creada y sesión iniciada!', 'success');
        } else {
            closeAuthModal();
            showToast('📧 Por favor revisa tu correo para confirmar tu cuenta.', 'info');
        }
    } catch (err) {
        console.error('Sign up error:', err);
        showToast(err.message || 'Error al crear la cuenta.', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Crear Bóveda'; }
    }
});

document.getElementById('auth-magic-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('magic-email').value.trim();
    const submitBtn = document.getElementById('btn-submit-magic');

    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando enlace...'; }

    try {
        const { error } = await supabaseClient.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
        closeAuthModal();
        showToast('📬 Revisa tu correo, te hemos enviado el enlace de acceso!', 'info');
    } catch (err) {
        console.error('Magic link error:', err);
        showToast(err.message || 'Error al enviar enlace.', 'error');
    } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Enviar Magic Link'; }
    }
});

document.getElementById('btn-google-auth')?.addEventListener('click', async () => {
    try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
    } catch (err) {
        console.error('Google OAuth error:', err);
        showToast('Google OAuth no configurado en Supabase o bloqueado.', 'error');
    }
});

document.getElementById('menu-btn-logout')?.addEventListener('click', async () => {
    try {
        document.getElementById('user-dropdown')?.classList.add('hidden');
        await supabaseClient.auth.signOut();
        showToast('Has cerrado sesión.', 'info');
    } catch (err) {
        console.error('Sign out error:', err);
    }
});

// ============================================================
// PRIVACY MODE LOGIC (FASE 3)
// ============================================================
let isPrivacyModeActive = localStorage.getItem('ucp_privacy_mode') === 'true';

const applyPrivacyMode = (active) => {
    isPrivacyModeActive = active;
    localStorage.setItem('ucp_privacy_mode', active ? 'true' : 'false');
    
    if (active) {
        document.body.classList.add('privacy-mode-active');
    } else {
        document.body.classList.remove('privacy-mode-active');
    }

    const btn = document.getElementById('btn-privacy-mode');
    const icon = document.getElementById('privacy-icon');
    const label = btn?.querySelector('.privacy-label');

    if (btn) {
        btn.classList.toggle('active', active);
    }
    if (icon) {
        icon.textContent = active ? '🙈' : '👁️';
    }
    if (label) {
        label.textContent = active ? 'Oculto' : 'Privacidad';
    }
};

const togglePrivacyMode = () => {
    applyPrivacyMode(!isPrivacyModeActive);
    showToast(isPrivacyModeActive ? '🙈 Modo Privacidad activado (Cifras desenfocadas)' : '👁️ Modo Privacidad desactivado', 'info');
};

// ============================================================
// SNOWBALL COMPOUND INTEREST SIMULATOR (FASE 3)
// ============================================================
let snowballSelectedYears = 5;

const calculateSnowball = () => {
    const initialInput = document.getElementById('snowball-initial');
    const monthlyInput = document.getElementById('snowball-monthly');
    const rateInput = document.getElementById('snowball-rate');

    const P = Math.max(0, parseFloat(initialInput?.value) || 0);
    const PMT = Math.max(0, parseFloat(monthlyInput?.value) || 0);
    const annualRate = Math.max(0, parseFloat(rateInput?.value) || 10.75);
    const t = snowballSelectedYears;

    // Label indicators
    const initialValEl = document.getElementById('snowball-initial-val');
    const monthlyValEl = document.getElementById('snowball-monthly-val');
    const rateValEl = document.getElementById('snowball-rate-val');

    if (initialValEl) initialValEl.textContent = formatCurrency(P);
    if (monthlyValEl) monthlyValEl.textContent = `${formatCurrency(PMT)} / mes`;
    if (rateValEl) {
        const isCetes = Math.abs(annualRate - 10.75) < 0.1;
        rateValEl.textContent = `${annualRate.toFixed(2)}% ${isCetes ? '(CETES 28D)' : ''}`;
    }

    const r = annualRate / 100;
    const n = 12; // monthly compounding
    const totalMonths = t * 12;
    const monthlyRate = r / n;

    // Compound Interest Calculation
    const futureValuePrincipal = P * Math.pow(1 + monthlyRate, totalMonths);
    const futureValuePMT = monthlyRate > 0 ? (PMT * (Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate) : (PMT * totalMonths);
    const finalTotal = futureValuePrincipal + futureValuePMT;

    const totalContributed = P + (PMT * totalMonths);
    const totalInterest = Math.max(0, finalTotal - totalContributed);
    const interestPct = totalContributed > 0 ? (totalInterest / totalContributed) * 100 : 0;
    const multiplier = totalContributed > 0 ? (finalTotal / totalContributed) : 1;

    // Inflation Loss: purchasing power erosion at 4.5% annual inflation (UDIs / Banxico)
    const inflationRate = 0.045;
    const inflationFactor = Math.pow(1 + inflationRate, t);
    const realValueIfCash = totalContributed / inflationFactor;
    const inflationLoss = Math.max(0, totalContributed - realValueIfCash);

    // Update Result Elements
    const outTotal = document.getElementById('snowball-out-total');
    const outMultiplier = document.getElementById('snowball-out-multiplier');
    const outInterest = document.getElementById('snowball-out-interest');
    const outInterestPct = document.getElementById('snowball-out-interest-pct');
    const outPrincipal = document.getElementById('snowball-out-principal');
    const outInflation = document.getElementById('snowball-out-inflation');

    if (outTotal) outTotal.textContent = formatCurrency(finalTotal);
    if (outMultiplier) outMultiplier.textContent = `x${multiplier.toFixed(2)} su aportación`;
    if (outInterest) outInterest.textContent = `+${formatCurrency(totalInterest)}`;
    if (outInterestPct) outInterestPct.textContent = `+${interestPct.toFixed(1)}% generado`;
    if (outPrincipal) outPrincipal.textContent = formatCurrency(totalContributed);
    if (outInflation) outInflation.textContent = `-${formatCurrency(inflationLoss)}`;

    // Update Ratio Bar
    const barPrincipal = document.getElementById('snowball-bar-principal');
    const barInterest = document.getElementById('snowball-bar-interest');
    const ratioText = document.getElementById('snowball-comp-ratio-text');

    const totalBarSum = totalContributed + totalInterest;
    if (totalBarSum > 0) {
        const principalPct = (totalContributed / totalBarSum) * 100;
        const interestBarPct = (totalInterest / totalBarSum) * 100;
        if (barPrincipal) barPrincipal.style.width = `${principalPct}%`;
        if (barInterest) barInterest.style.width = `${interestBarPct}%`;
        if (ratioText) ratioText.textContent = `${principalPct.toFixed(0)}% Aportado / ${interestBarPct.toFixed(0)}% Interés`;
    }
};

const openSnowballModal = () => {
    const modal = document.getElementById('modal-snowball');
    if (!modal) return;
    
    // Auto prefill capital if holdings exist
    let currentCapital = 0;
    if (investmentsHoldings && investmentsHoldings.length > 0) {
        currentCapital = investmentsHoldings.reduce((s, h) => s + (parseFloat(h.marketValue) || 0), 0);
    }
    const initialInput = document.getElementById('snowball-initial');
    if (initialInput && currentCapital > 0 && parseFloat(initialInput.value) === 50000) {
        initialInput.value = Math.round(currentCapital);
    }

    calculateSnowball();
    modal.classList.remove('hidden');
};

const closeSnowballModal = () => {
    const modal = document.getElementById('modal-snowball');
    if (modal) modal.classList.add('hidden');
};

const initSnowballSimulator = () => {
    const btnOpen = document.getElementById('btn-open-snowball');
    const btnClose = document.getElementById('snowball-modal-close');
    const btnDone = document.getElementById('btn-close-snowball-done');
    const modal = document.getElementById('modal-snowball');

    if (btnOpen) btnOpen.addEventListener('click', openSnowballModal);
    if (btnClose) btnClose.addEventListener('click', closeSnowballModal);
    if (btnDone) btnDone.addEventListener('click', closeSnowballModal);

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeSnowballModal();
        });
    }

    const initialInput = document.getElementById('snowball-initial');
    const monthlyInput = document.getElementById('snowball-monthly');
    const rateInput = document.getElementById('snowball-rate');

    if (initialInput) initialInput.addEventListener('input', calculateSnowball);
    if (monthlyInput) monthlyInput.addEventListener('input', calculateSnowball);
    if (rateInput) rateInput.addEventListener('input', calculateSnowball);

    const pills = document.querySelectorAll('#snowball-term-pills .pill-btn');
    pills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            pills.forEach(p => p.classList.remove('active'));
            e.currentTarget.classList.add('active');
            snowballSelectedYears = parseInt(e.currentTarget.dataset.years, 10) || 5;
            calculateSnowball();
        });
    });
};

// ============================================================
// KEYBOARD SHORTCUTS & ERGONOMICS
// ============================================================
document.addEventListener('keydown', (e) => {
    // ESC closes active open modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(modal => {
            modal.classList.add('hidden');
        });
        return;
    }

    // Number shortcuts 1, 2, 3, 4 for instant terminal navigation
    if (['1', '2', '3', '4'].includes(e.key) && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const navMap = { '1': 'dashboard', '2': 'transactions', '3': 'portfolio', '4': 'investments' };
        switchView(navMap[e.key]);
        return;
    }

    // 's' or 'S' shortcut for Snowball Simulator
    if ((e.key === 's' || e.key === 'S') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        openSnowballModal();
        return;
    }

    // 'p' or 'P' shortcut for Privacy Mode (if not typing in an input)
    if ((e.key === 'p' || e.key === 'P') && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        togglePrivacyMode();
        return;
    }

    // '/' shortcut to quickly focus search input (if not already typing in an input)
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        const activeNav = document.querySelector('.nav-item.active')?.dataset.view;
        if (activeNav === 'investments') {
            document.getElementById('inv-search')?.focus();
        } else {
            document.getElementById('tx-search')?.focus();
        }
    }
});

// ============================================================
// INIT
// ============================================================
const initApp = async () => {
    updateStatusIndicator();
    await initAuth();

    // Privacy Mode & Snowball initialization (FASE 3)
    document.getElementById('btn-privacy-mode')?.addEventListener('click', togglePrivacyMode);
    applyPrivacyMode(isPrivacyModeActive);
    initSnowballSimulator();

    // Sidebar Quick Launchers & Navigation Bridges
    document.getElementById('sidebar-btn-snowball')?.addEventListener('click', (e) => {
        e.preventDefault();
        openSnowballModal();
    });

    document.getElementById('sidebar-freedom-mini-card')?.addEventListener('click', () => {
        switchView('dashboard');
        document.getElementById('freedom-ratio-widget')?.scrollIntoView({ behavior: 'smooth' });
    });

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

    await loadLiveMarketQuotes();
    await loadSavingsData();
    await loadInvestmentsData();
    await loadYearlyData(currentYear);
    updateSidebarBadges();
};

document.addEventListener('DOMContentLoaded', initApp);
