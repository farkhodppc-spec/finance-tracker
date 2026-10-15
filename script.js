const STORAGE_KEY = 'finance-tracker';

const DONUT_COLORS = ['#c44536', '#e07a3d', '#d4a017', '#7a5c3e', '#8d4b4b', '#b08968', '#6b4f3a', '#a33b32'];

let db = load();
let editingTxId = null;
let editingCatId = null;
let pendingDelete = null;

function defaultData() {
    return {
        settings: { currency: 'сум' },
        categories: [
            { id: 'c-salary', name: 'Зарплата', type: 'income' },
            { id: 'c-side', name: 'Подработка', type: 'income' },
            { id: 'c-gifts', name: 'Подарки', type: 'income' },
            { id: 'c-food', name: 'Еда', type: 'expense' },
            { id: 'c-transport', name: 'Транспорт', type: 'expense' },
            { id: 'c-home', name: 'Жильё', type: 'expense' },
            { id: 'c-fun', name: 'Развлечения', type: 'expense' }
        ],
        transactions: []
    };
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return defaultData();
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.categories) || !Array.isArray(parsed.transactions)) {
            return defaultData();
        }
        const currency = parsed.settings && String(parsed.settings.currency || '').trim();
        parsed.settings = { currency: currency || 'сум' };
        return parsed;
    } catch {
        return defaultData();
    }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[ch]);
}

function formatMoney(amount) {
    const value = Number(amount) || 0;
    const sign = value < 0 ? '−' : '';
    const rounded = Math.round(Math.abs(value) * 100) / 100;
    const [intPart, frac] = rounded.toFixed(2).split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    const body = frac === '00' ? grouped : `${grouped},${frac}`;
    return `${sign}${body} ${db.settings.currency}`;
}

function todayISO() {
    const date = new Date();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function monthKey(dateStr) {
    return String(dateStr || '').slice(0, 7);
}

function formatDate(iso) {
    const [year, month, day] = String(iso).split('-');
    if (!year || !month || !day) return iso;
    return `${day}.${month}.${year}`;
}

function lastMonths(count) {
    const result = [];
    const now = new Date();
    for (let i = count - 1; i >= 0; i -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
        result.push({ key, label });
    }
    return result;
}

function categoryById(id) {
    return db.categories.find((category) => category.id === id);
}

function categoriesByType(type) {
    return db.categories.filter((category) => category.type === type);
}

function totals() {
    return db.transactions.reduce((acc, tx) => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'income') acc.income += amount;
        else acc.expense += amount;
        acc.balance = acc.income - acc.expense;
        return acc;
    }, { income: 0, expense: 0, balance: 0 });
}

function createTransaction(data) {
    db.transactions.push({ id: uid(), ...data });
    save();
}

function updateTransaction(id, data) {
    const tx = db.transactions.find((item) => item.id === id);
    if (!tx) return;
    Object.assign(tx, data);
    save();
}

function deleteTransaction(id) {
    db.transactions = db.transactions.filter((item) => item.id !== id);
    save();
}

function readTransactions() {
    const type = document.getElementById('filter-type').value;
    const period = document.getElementById('filter-period').value;
    const month = document.getElementById('filter-month').value || todayISO().slice(0, 7);
    return db.transactions
        .filter((tx) => type === 'all' || tx.type === type)
        .filter((tx) => period !== 'month' || monthKey(tx.date) === month)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function createCategory(name, type) {
    const trimmed = name.trim();
    if (!trimmed) return 'Введите название.';
    const duplicate = db.categories.some((category) => (
        category.type === type && category.name.toLowerCase() === trimmed.toLowerCase()
    ));
    if (duplicate) return 'Такая категория уже есть.';
    db.categories.push({ id: uid(), name: trimmed, type });
    save();
    return '';
}

function updateCategory(id, name) {
    const trimmed = name.trim();
    const category = categoryById(id);
    if (!trimmed) return 'Введите название.';
    if (!category) return 'Категория не найдена.';
    const duplicate = db.categories.some((item) => (
        item.id !== id && item.type === category.type && item.name.toLowerCase() === trimmed.toLowerCase()
    ));
    if (duplicate) return 'Такая категория уже есть.';
    category.name = trimmed;
    save();
    return '';
}

function deleteCategory(id) {
    if (db.transactions.some((tx) => tx.categoryId === id)) {
        return 'Сначала удалите или измените операции этой категории.';
    }
    db.categories = db.categories.filter((category) => category.id !== id);
    save();
    return '';
}

function updateCurrency(value) {
    db.settings.currency = value.trim() || 'сум';
    save();
}

function validateTransaction(data) {
    if (data.type !== 'income' && data.type !== 'expense') return 'Выберите тип.';
    if (!Number.isFinite(data.amount) || data.amount <= 0) return 'Сумма должна быть больше 0.';
    const category = categoryById(data.categoryId);
    if (!category || category.type !== data.type) return 'Выберите категорию.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return 'Укажите дату.';
    return '';
}

function showError(id, message) {
    const el = document.getElementById(id);
    el.textContent = message;
    el.classList.toggle('hidden', !message);
}

function roundRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, Math.max(h, 0) / 2);
    if (h <= 0.5) return;
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function drawBarChart() {
    const canvas = document.getElementById('bar-chart');
    const empty = document.getElementById('bar-empty');
    const months = lastMonths(6);
    const series = months.map((month) => {
        let income = 0;
        let expense = 0;
        db.transactions.forEach((tx) => {
            if (monthKey(tx.date) !== month.key) return;
            if (tx.type === 'income') income += Number(tx.amount) || 0;
            else expense += Number(tx.amount) || 0;
        });
        return { ...month, income, expense };
    });
    const max = Math.max(1, ...series.flatMap((item) => [item.income, item.expense]));
    empty.classList.toggle('hidden', series.some((item) => item.income || item.expense));

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = canvas.clientWidth || 640;
    const cssHeight = 260;
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const pad = { top: 12, bottom: 28 };
    const chartH = cssHeight - pad.top - pad.bottom;
    const groupW = cssWidth / series.length;
    ctx.strokeStyle = '#e4dccf';
    ctx.beginPath();
    ctx.moveTo(0, pad.top + chartH);
    ctx.lineTo(cssWidth, pad.top + chartH);
    ctx.stroke();

    series.forEach((item, index) => {
        const x = index * groupW;
        const barW = Math.min(16, groupW * 0.2);
        const base = pad.top + chartH;
        ctx.fillStyle = '#1f7a4d';
        ctx.beginPath();
        roundRect(ctx, x + groupW / 2 - barW - 3, base - (item.income / max) * chartH, barW, (item.income / max) * chartH, 4);
        ctx.fill();
        ctx.fillStyle = '#c44536';
        ctx.beginPath();
        roundRect(ctx, x + groupW / 2 + 3, base - (item.expense / max) * chartH, barW, (item.expense / max) * chartH, 4);
        ctx.fill();
        ctx.fillStyle = '#6f675e';
        ctx.font = '12px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(item.label, x + groupW / 2, cssHeight - 8);
    });
}

function drawDonut() {
    const canvas = document.getElementById('donut-chart');
    const legend = document.getElementById('donut-legend');
    const empty = document.getElementById('donut-empty');
    const totalsByName = new Map();
    db.transactions.forEach((tx) => {
        if (tx.type !== 'expense') return;
        const category = categoryById(tx.categoryId);
        const name = category ? category.name : 'Без категории';
        totalsByName.set(name, (totalsByName.get(name) || 0) + (Number(tx.amount) || 0));
    });
    const slices = [...totalsByName.entries()].sort((a, b) => b[1] - a[1]);
    const total = slices.reduce((sum, slice) => sum + slice[1], 0);
    const hasData = total > 0;
    empty.classList.toggle('hidden', hasData);
    canvas.classList.toggle('hidden', !hasData);
    legend.classList.toggle('hidden', !hasData);
    legend.innerHTML = slices.map(([name, value], index) => {
        const color = DONUT_COLORS[index % DONUT_COLORS.length];
        const percent = Math.round((value / total) * 100);
        return `<li><i class="swatch" style="background:${color}"></i><span>${escapeHtml(name)} · ${percent}%</span></li>`;
    }).join('');
    if (!hasData) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 280;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const center = size / 2;
    let angle = -Math.PI / 2;
    slices.forEach((slice, index) => {
        const sweep = (slice[1] / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, 108, angle, angle + sweep);
        ctx.closePath();
        ctx.fillStyle = DONUT_COLORS[index % DONUT_COLORS.length];
        ctx.fill();
        angle += sweep;
    });
    ctx.beginPath();
    ctx.arc(center, center, 68, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();

    const amountLabel = formatMoney(total).replace(` ${db.settings.currency}`, '');
    ctx.fillStyle = '#1c1915';
    ctx.font = '600 15px Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(amountLabel, center, center - 8);
    ctx.fillStyle = '#6f675e';
    ctx.font = '12px Segoe UI, sans-serif';
    ctx.fillText(db.settings.currency, center, center + 12);
}

function renderDashboard() {
    const { income, expense, balance } = totals();
    const balanceEl = document.getElementById('stat-balance');
    balanceEl.textContent = formatMoney(balance);
    balanceEl.style.color = balance < 0 ? '#c44536' : '';
    document.getElementById('stat-income').textContent = formatMoney(income);
    document.getElementById('stat-expense').textContent = formatMoney(expense);
    drawBarChart();
    drawDonut();
}

function renderTransactions() {
    const list = document.getElementById('tx-list');
    const empty = document.getElementById('tx-empty');
    const items = readTransactions();
    empty.classList.toggle('hidden', items.length > 0);
    list.innerHTML = items.map((tx) => {
        const category = categoryById(tx.categoryId);
        const categoryName = category ? category.name : 'Без категории';
        const title = tx.note ? escapeHtml(tx.note) : escapeHtml(categoryName);
        const sign = tx.type === 'income' ? '+' : '−';
        return `
            <li class="tx-item">
                <div class="tx-main">
                    <p class="tx-title">${title}</p>
                    <p class="tx-meta">${formatDate(tx.date)} · ${escapeHtml(categoryName)}</p>
                </div>
                <div class="row-actions">
                    <span class="tx-amount ${tx.type}">${sign}${formatMoney(tx.amount)}</span>
                    <button type="button" class="btn small" data-edit-tx="${tx.id}">Изменить</button>
                    <button type="button" class="btn small" data-delete-tx="${tx.id}">Удалить</button>
                </div>
            </li>`;
    }).join('');
}

function fillCategorySelect(type, selectedId) {
    const select = document.getElementById('tx-category');
    const categories = categoriesByType(type);
    select.innerHTML = categories.map((category) => (
        `<option value="${escapeHtml(category.id)}">${escapeHtml(category.name)}</option>`
    )).join('');
    if (selectedId && categories.some((category) => category.id === selectedId)) {
        select.value = selectedId;
    }
}

function openTxForm(tx) {
    document.getElementById('tx-form').classList.remove('hidden');
    showError('tx-error', '');
    document.getElementById('tx-form-title').textContent = tx ? 'Изменить операцию' : 'Новая операция';
    document.getElementById('tx-type').value = tx ? tx.type : 'expense';
    document.getElementById('tx-amount').value = tx ? tx.amount : '';
    document.getElementById('tx-date').value = tx ? tx.date : todayISO();
    document.getElementById('tx-note').value = tx ? (tx.note || '') : '';
    fillCategorySelect(document.getElementById('tx-type').value, tx ? tx.categoryId : null);
    editingTxId = tx ? tx.id : null;
    document.getElementById('tx-amount').focus();
}

function closeTxForm() {
    document.getElementById('tx-form').classList.add('hidden');
    editingTxId = null;
}

function renderCategoryList(type) {
    const list = document.getElementById(type === 'income' ? 'cat-income-list' : 'cat-expense-list');
    const categories = categoriesByType(type);
    if (categories.length === 0) {
        list.innerHTML = '<li class="empty-note">Категорий нет.</li>';
        return;
    }
    list.innerHTML = categories.map((category) => {
        if (editingCatId === category.id) {
            return `
                <li class="cat-item">
                    <form class="cat-edit" data-save-cat="${category.id}">
                        <input type="text" value="${escapeHtml(category.name)}" maxlength="40" required>
                        <button type="submit" class="btn small primary">Ок</button>
                        <button type="button" class="btn small" data-cancel-cat>Отмена</button>
                    </form>
                </li>`;
        }
        return `
            <li class="cat-item">
                <p class="cat-name">${escapeHtml(category.name)}</p>
                <div class="row-actions">
                    <button type="button" class="btn small" data-edit-cat="${category.id}">Изменить</button>
                    <button type="button" class="btn small" data-delete-cat="${category.id}">Удалить</button>
                </div>
            </li>`;
    }).join('');
}

function renderCategories() {
    renderCategoryList('income');
    renderCategoryList('expense');
}

function renderSettings() {
    document.getElementById('currency-input').value = db.settings.currency;
}

function renderAll() {
    renderDashboard();
    renderTransactions();
    renderCategories();
    renderSettings();
    const form = document.getElementById('tx-form');
    if (!form.classList.contains('hidden')) {
        fillCategorySelect(
            document.getElementById('tx-type').value,
            document.getElementById('tx-category').value
        );
    }
}

function showView(name) {
    document.querySelectorAll('.nav-btn').forEach((btn) => {
        btn.classList.toggle('is-active', btn.dataset.view === name);
    });
    document.querySelectorAll('.view').forEach((view) => {
        view.classList.toggle('is-active', view.dataset.view === name);
    });
    if (name === 'dashboard') renderDashboard();
}

function askDelete(payload, text) {
    pendingDelete = payload;
    document.getElementById('confirm-text').textContent = text;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirm() {
    pendingDelete = null;
    document.getElementById('confirm-modal').classList.add('hidden');
}

function categoryErrorId(type) {
    return type === 'income' ? 'cat-income-error' : 'cat-expense-error';
}

document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
});

document.getElementById('new-tx-btn').addEventListener('click', () => openTxForm(null));
document.getElementById('tx-cancel').addEventListener('click', closeTxForm);
document.getElementById('tx-type').addEventListener('change', (event) => {
    fillCategorySelect(event.target.value);
});

document.getElementById('tx-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const data = {
        type: document.getElementById('tx-type').value,
        amount: Number(document.getElementById('tx-amount').value),
        categoryId: document.getElementById('tx-category').value,
        date: document.getElementById('tx-date').value,
        note: document.getElementById('tx-note').value.trim()
    };
    const error = validateTransaction(data);
    showError('tx-error', error);
    if (error) return;
    if (editingTxId) updateTransaction(editingTxId, data);
    else createTransaction(data);
    closeTxForm();
    renderAll();
});

document.getElementById('tx-list').addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-edit-tx]');
    const deleteBtn = event.target.closest('[data-delete-tx]');
    if (editBtn) {
        const tx = db.transactions.find((item) => item.id === editBtn.dataset.editTx);
        if (tx) openTxForm(tx);
    }
    if (deleteBtn) {
        askDelete({ kind: 'tx', id: deleteBtn.dataset.deleteTx }, 'Операция будет удалена без восстановления.');
    }
});

document.getElementById('filter-type').addEventListener('change', renderTransactions);
document.getElementById('filter-period').addEventListener('change', () => {
    const monthMode = document.getElementById('filter-period').value === 'month';
    document.getElementById('filter-month-wrap').classList.toggle('hidden', !monthMode);
    if (monthMode && !document.getElementById('filter-month').value) {
        document.getElementById('filter-month').value = todayISO().slice(0, 7);
    }
    renderTransactions();
});
document.getElementById('filter-month').addEventListener('change', renderTransactions);

function bindCategoryForm(type) {
    const prefix = type === 'income' ? 'income' : 'expense';
    document.getElementById(`cat-${prefix}-form`).addEventListener('submit', (event) => {
        event.preventDefault();
        const input = document.getElementById(`cat-${prefix}-name`);
        const error = createCategory(input.value, type);
        showError(categoryErrorId(type), error);
        if (error) return;
        input.value = '';
        renderAll();
    });
}

bindCategoryForm('income');
bindCategoryForm('expense');

document.getElementById('view-categories').addEventListener('click', (event) => {
    if (event.target.closest('[data-cancel-cat]')) {
        editingCatId = null;
        renderCategories();
        return;
    }
    const editBtn = event.target.closest('[data-edit-cat]');
    if (editBtn) {
        editingCatId = editBtn.dataset.editCat;
        showError('cat-income-error', '');
        showError('cat-expense-error', '');
        renderCategories();
        return;
    }
    const deleteBtn = event.target.closest('[data-delete-cat]');
    if (!deleteBtn) return;
    const category = categoryById(deleteBtn.dataset.deleteCat);
    if (!category) return;
    if (db.transactions.some((tx) => tx.categoryId === category.id)) {
        showError(categoryErrorId(category.type), 'Сначала удалите или измените операции этой категории.');
        return;
    }
    showError(categoryErrorId(category.type), '');
    askDelete({ kind: 'cat', id: category.id }, `Удалить категорию «${category.name}»?`);
});

document.getElementById('view-categories').addEventListener('submit', (event) => {
    const form = event.target.closest('[data-save-cat]');
    if (!form) return;
    event.preventDefault();
    const category = categoryById(form.dataset.saveCat);
    const error = updateCategory(form.dataset.saveCat, form.querySelector('input').value);
    showError(categoryErrorId(category ? category.type : 'expense'), error);
    if (error) return;
    editingCatId = null;
    renderAll();
});

document.getElementById('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    updateCurrency(document.getElementById('currency-input').value);
    renderAll();
    document.getElementById('settings-ok').classList.remove('hidden');
});

document.getElementById('currency-input').addEventListener('input', () => {
    document.getElementById('settings-ok').classList.add('hidden');
});

document.getElementById('confirm-no').addEventListener('click', closeConfirm);
document.getElementById('confirm-yes').addEventListener('click', () => {
    if (!pendingDelete) return closeConfirm();
    if (pendingDelete.kind === 'tx') {
        if (editingTxId === pendingDelete.id) closeTxForm();
        deleteTransaction(pendingDelete.id);
    }
    if (pendingDelete.kind === 'cat') {
        const category = categoryById(pendingDelete.id);
        if (editingCatId === pendingDelete.id) editingCatId = null;
        const error = deleteCategory(pendingDelete.id);
        if (error && category) showError(categoryErrorId(category.type), error);
    }
    closeConfirm();
    renderAll();
});

document.getElementById('confirm-modal').addEventListener('click', (event) => {
    if (event.target.id === 'confirm-modal') closeConfirm();
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeConfirm();
});

window.addEventListener('resize', () => {
    if (document.getElementById('view-dashboard').classList.contains('is-active')) {
        drawBarChart();
        drawDonut();
    }
});

renderAll();
