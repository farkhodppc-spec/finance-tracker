'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, MoneyType, Transaction, User } from '@/lib/types';

const DONUT_COLORS = ['#c44536', '#e07a3d', '#d4a017', '#7a5c3e', '#8d4b4b', '#b08968', '#6b4f3a', '#a33b32'];

type ViewName = 'dashboard' | 'operations' | 'categories' | 'settings';

function todayISO() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function monthKey(dateStr: string) {
  return String(dateStr || '').slice(0, 7);
}

function formatDate(iso: string) {
  const [year, month, day] = String(iso).split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

function formatMoney(amount: number, currency: string) {
  const value = Number(amount) || 0;
  const sign = value < 0 ? '−' : '';
  const rounded = Math.round(Math.abs(value) * 100) / 100;
  const [intPart, frac] = rounded.toFixed(2).split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const body = frac === '00' ? grouped : `${grouped},${frac}`;
  return `${sign}${body} ${currency}`;
}

function lastMonths(count: number) {
  const result: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const label = date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
    result.push({ key, label });
  }
  return result;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, Math.max(h, 0) / 2);
  if (h <= 0.5) return;
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Ошибка запроса');
  }
  return data;
}

export default function Tracker() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<ViewName>('dashboard');
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState('');

  const [filterType, setFilterType] = useState<'all' | MoneyType>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'month'>('all');
  const [filterMonth, setFilterMonth] = useState(todayISO().slice(0, 7));

  const [txFormOpen, setTxFormOpen] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [txType, setTxType] = useState<MoneyType>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txCategoryId, setTxCategoryId] = useState('');
  const [txDate, setTxDate] = useState(todayISO());
  const [txNote, setTxNote] = useState('');
  const [txError, setTxError] = useState('');

  const [catIncomeName, setCatIncomeName] = useState('');
  const [catExpenseName, setCatExpenseName] = useState('');
  const [catIncomeError, setCatIncomeError] = useState('');
  const [catExpenseError, setCatExpenseError] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  const [currencyInput, setCurrencyInput] = useState('сум');
  const [settingsOk, setSettingsOk] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{ kind: 'tx' | 'cat'; id: string } | null>(null);

  const barRef = useRef<HTMLCanvasElement>(null);
  const donutRef = useRef<HTMLCanvasElement>(null);

  const currency = user?.currency || 'сум';

  const loadData = useCallback(async () => {
    const [meRes, catRes, txRes] = await Promise.all([
      fetch('/api/auth/me'),
      fetch('/api/categories'),
      fetch('/api/transactions'),
    ]);
    if (meRes.status === 401) {
      router.replace('/login');
      return;
    }
    const me = await readJson(meRes);
    const cats = await readJson(catRes);
    const txs = await readJson(txRes);
    setUser(me.user);
    setCurrencyInput(me.user.currency);
    setCategories(cats.categories);
    setTransactions(txs.transactions);
  }, [router]);

  useEffect(() => {
    loadData()
      .catch((error: Error) => setBootError(error.message))
      .finally(() => setLoading(false));
  }, [loadData]);

  const categoriesByType = useCallback(
    (type: MoneyType) => categories.filter((category) => category.type === type),
    [categories],
  );

  const categoryById = useCallback(
    (id: string) => categories.find((category) => category.id === id),
    [categories],
  );

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const amount = Number(tx.amount) || 0;
        if (tx.type === 'income') acc.income += amount;
        else acc.expense += amount;
        acc.balance = acc.income - acc.expense;
        return acc;
      },
      { income: 0, expense: 0, balance: 0 },
    );
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => filterType === 'all' || tx.type === filterType)
      .filter((tx) => filterPeriod !== 'month' || monthKey(tx.date) === filterMonth)
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [transactions, filterType, filterPeriod, filterMonth]);

  const drawCharts = useCallback(() => {
    const bar = barRef.current;
    const donut = donutRef.current;
    if (!bar || !donut) return;

    const months = lastMonths(6);
    const series = months.map((month) => {
      let income = 0;
      let expense = 0;
      transactions.forEach((tx) => {
        if (monthKey(tx.date) !== month.key) return;
        if (tx.type === 'income') income += Number(tx.amount) || 0;
        else expense += Number(tx.amount) || 0;
      });
      return { ...month, income, expense };
    });
    const max = Math.max(1, ...series.flatMap((item) => [item.income, item.expense]));
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = bar.clientWidth || 640;
    const cssHeight = 260;
    bar.width = Math.floor(cssWidth * dpr);
    bar.height = Math.floor(cssHeight * dpr);
    const ctx = bar.getContext('2d');
    if (ctx) {
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

    const totalsByName = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const category = categoryById(tx.categoryId);
      const name = category ? category.name : 'Без категории';
      totalsByName.set(name, (totalsByName.get(name) || 0) + (Number(tx.amount) || 0));
    });
    const slices = [...totalsByName.entries()].sort((a, b) => b[1] - a[1]);
    const total = slices.reduce((sum, slice) => sum + slice[1], 0);
    const size = 280;
    donut.width = size * dpr;
    donut.height = size * dpr;
    const dctx = donut.getContext('2d');
    if (dctx) {
      dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dctx.clearRect(0, 0, size, size);
      if (total > 0) {
        const center = size / 2;
        let angle = -Math.PI / 2;
        slices.forEach((slice, index) => {
          const sweep = (slice[1] / total) * Math.PI * 2;
          dctx.beginPath();
          dctx.moveTo(center, center);
          dctx.arc(center, center, 108, angle, angle + sweep);
          dctx.closePath();
          dctx.fillStyle = DONUT_COLORS[index % DONUT_COLORS.length];
          dctx.fill();
          angle += sweep;
        });
        dctx.beginPath();
        dctx.arc(center, center, 68, 0, Math.PI * 2);
        dctx.fillStyle = '#fffdf8';
        dctx.fill();
        const amountLabel = formatMoney(total, currency).replace(` ${currency}`, '');
        dctx.fillStyle = '#1c1915';
        dctx.font = '600 15px Segoe UI, sans-serif';
        dctx.textAlign = 'center';
        dctx.textBaseline = 'middle';
        dctx.fillText(amountLabel, center, center - 8);
        dctx.fillStyle = '#6f675e';
        dctx.font = '12px Segoe UI, sans-serif';
        dctx.fillText(currency, center, center + 12);
      }
    }
  }, [transactions, categoryById, currency]);

  useEffect(() => {
    if (view !== 'dashboard' || loading) return;
    drawCharts();
    const onResize = () => drawCharts();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [view, loading, drawCharts]);

  useEffect(() => {
    const cats = categoriesByType(txType);
    if (!cats.some((category) => category.id === txCategoryId)) {
      setTxCategoryId(cats[0]?.id || '');
    }
  }, [txType, categoriesByType, txCategoryId]);

  function openTxForm(tx: Transaction | null) {
    setTxFormOpen(true);
    setTxError('');
    setEditingTxId(tx ? tx.id : null);
    setTxType(tx ? tx.type : 'expense');
    setTxAmount(tx ? String(tx.amount) : '');
    setTxDate(tx ? tx.date : todayISO());
    setTxNote(tx ? tx.note : '');
    setTxCategoryId(tx ? tx.categoryId : '');
  }

  function closeTxForm() {
    setTxFormOpen(false);
    setEditingTxId(null);
  }

  async function saveTransaction(event: FormEvent) {
    event.preventDefault();
    setTxError('');
    const payload = {
      type: txType,
      amount: Number(txAmount),
      categoryId: txCategoryId,
      date: txDate,
      note: txNote.trim(),
    };
    try {
      const res = await fetch(editingTxId ? `/api/transactions/${editingTxId}` : '/api/transactions', {
        method: editingTxId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      await readJson(res);
      closeTxForm();
      await loadData();
    } catch (error) {
      setTxError(error instanceof Error ? error.message : 'Ошибка');
    }
  }

  async function createCategory(type: MoneyType, name: string) {
    const setError = type === 'income' ? setCatIncomeError : setCatExpenseError;
    setError('');
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, name }),
      });
      await readJson(res);
      if (type === 'income') setCatIncomeName('');
      else setCatExpenseName('');
      await loadData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка');
    }
  }

  async function saveCategoryEdit(event: FormEvent, id: string) {
    event.preventDefault();
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCatName }),
      });
      await readJson(res);
      setEditingCatId(null);
      await loadData();
    } catch (error) {
      const category = categoryById(id);
      const setError = category?.type === 'income' ? setCatIncomeError : setCatExpenseError;
      setError(error instanceof Error ? error.message : 'Ошибка');
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSettingsError('');
    setSettingsOk(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: currencyInput }),
      });
      const data = await readJson(res);
      setUser(data.user);
      setCurrencyInput(data.user.currency);
      setSettingsOk(true);
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : 'Ошибка');
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  }

  function askDelete(kind: 'tx' | 'cat', id: string, text: string) {
    setPendingDelete({ kind, id });
    setConfirmText(text);
    setConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.kind === 'tx') {
        if (editingTxId === pendingDelete.id) closeTxForm();
        const res = await fetch(`/api/transactions/${pendingDelete.id}`, { method: 'DELETE' });
        await readJson(res);
      } else {
        const category = categoryById(pendingDelete.id);
        if (editingCatId === pendingDelete.id) setEditingCatId(null);
        const res = await fetch(`/api/categories/${pendingDelete.id}`, { method: 'DELETE' });
        await readJson(res).catch((error: Error) => {
          const setError = category?.type === 'income' ? setCatIncomeError : setCatExpenseError;
          setError(error.message);
          throw error;
        });
      }
      setConfirmOpen(false);
      setPendingDelete(null);
      await loadData();
    } catch {
      setConfirmOpen(false);
      setPendingDelete(null);
    }
  }

  const expenseSlices = useMemo(() => {
    const totalsByName = new Map<string, number>();
    transactions.forEach((tx) => {
      if (tx.type !== 'expense') return;
      const category = categoryById(tx.categoryId);
      const name = category ? category.name : 'Без категории';
      totalsByName.set(name, (totalsByName.get(name) || 0) + (Number(tx.amount) || 0));
    });
    const slices = [...totalsByName.entries()].sort((a, b) => b[1] - a[1]);
    const total = slices.reduce((sum, slice) => sum + slice[1], 0);
    return { slices, total };
  }, [transactions, categoryById]);

  if (loading) {
    return <div className="auth-page"><p className="page-note">Загрузка…</p></div>;
  }

  if (bootError) {
    return <div className="auth-page"><p className="form-error">{bootError}</p></div>;
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">∑</span>
          <div>
            <p className="brand-kicker">Личные финансы</p>
            <h1>Сумма</h1>
          </div>
        </div>
        <nav className="nav" aria-label="Разделы">
          <button type="button" className={`nav-btn${view === 'dashboard' ? ' is-active' : ''}`} onClick={() => setView('dashboard')}>Дашборд</button>
          <button type="button" className={`nav-btn${view === 'operations' ? ' is-active' : ''}`} onClick={() => setView('operations')}>Операции</button>
          <button type="button" className={`nav-btn${view === 'categories' ? ' is-active' : ''}`} onClick={() => setView('categories')}>Категории</button>
          <button type="button" className={`nav-btn${view === 'settings' ? ' is-active' : ''}`} onClick={() => setView('settings')}>Настройки</button>
        </nav>
      </aside>

      <main className="content">
        <section className={`view${view === 'dashboard' ? ' is-active' : ''}`}>
          <header className="page-head">
            <div>
              <p className="eyebrow">Обзор</p>
              <h2>Дашборд</h2>
            </div>
            <p className="page-note">Последние 6 месяцев</p>
          </header>
          <div className="stat-grid">
            <article className="stat-card">
              <p className="stat-label">Баланс</p>
              <p className="stat-value" style={{ color: totals.balance < 0 ? '#c44536' : undefined }}>
                {formatMoney(totals.balance, currency)}
              </p>
            </article>
            <article className="stat-card stat-income">
              <p className="stat-label">Доходы</p>
              <p className="stat-value">{formatMoney(totals.income, currency)}</p>
            </article>
            <article className="stat-card stat-expense">
              <p className="stat-label">Расходы</p>
              <p className="stat-value">{formatMoney(totals.expense, currency)}</p>
            </article>
          </div>
          <div className="chart-grid">
            <article className="panel">
              <div className="panel-head">
                <h3>Доходы и расходы</h3>
                <div className="legend">
                  <span className="legend-item"><i className="swatch swatch-income" />Доход</span>
                  <span className="legend-item"><i className="swatch swatch-expense" />Расход</span>
                </div>
              </div>
              <canvas ref={barRef} width={640} height={280} aria-label="Столбчатый график" />
              <p className={`empty-note${transactions.some((tx) => lastMonths(6).some((m) => m.key === monthKey(tx.date))) ? ' hidden' : ''}`}>
                Пока нет операций за последние 6 месяцев.
              </p>
            </article>
            <article className="panel">
              <div className="panel-head"><h3>Расходы по категориям</h3></div>
              <div className="donut-wrap">
                <canvas ref={donutRef} className={expenseSlices.total > 0 ? '' : 'hidden'} width={280} height={280} aria-label="Кольцевая диаграмма" />
                <ul className={`donut-legend${expenseSlices.total > 0 ? '' : ' hidden'}`}>
                  {expenseSlices.slices.map(([name, value], index) => (
                    <li key={name}>
                      <i className="swatch" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                      <span>{name} · {Math.round((value / expenseSlices.total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className={`empty-note${expenseSlices.total > 0 ? ' hidden' : ''}`}>Расходов пока нет.</p>
            </article>
          </div>
        </section>

        <section className={`view${view === 'operations' ? ' is-active' : ''}`}>
          <header className="page-head">
            <div>
              <p className="eyebrow">Журнал</p>
              <h2>Операции</h2>
            </div>
            <button type="button" className="btn primary" onClick={() => openTxForm(null)}>Добавить</button>
          </header>

          <form className={`panel form-panel${txFormOpen ? '' : ' hidden'}`} onSubmit={saveTransaction}>
            <h3>{editingTxId ? 'Изменить операцию' : 'Новая операция'}</h3>
            <div className="form-grid">
              <label>
                Тип
                <select value={txType} onChange={(e) => setTxType(e.target.value as MoneyType)} required>
                  <option value="income">Доход</option>
                  <option value="expense">Расход</option>
                </select>
              </label>
              <label>
                Сумма
                <input type="number" min="0.01" step="0.01" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} required placeholder="0" />
              </label>
              <label>
                Категория
                <select value={txCategoryId} onChange={(e) => setTxCategoryId(e.target.value)} required>
                  {categoriesByType(txType).map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Дата
                <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} required />
              </label>
              <label className="span-2">
                Комментарий
                <input type="text" maxLength={120} value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="Необязательно" />
              </label>
            </div>
            {txError ? <p className="form-error">{txError}</p> : null}
            <div className="form-actions">
              <button type="submit" className="btn primary">Сохранить</button>
              <button type="button" className="btn ghost" onClick={closeTxForm}>Отмена</button>
            </div>
          </form>

          <div className="filters">
            <label>
              Тип
              <select value={filterType} onChange={(e) => setFilterType(e.target.value as 'all' | MoneyType)}>
                <option value="all">Все</option>
                <option value="income">Доходы</option>
                <option value="expense">Расходы</option>
              </select>
            </label>
            <label>
              Период
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value as 'all' | 'month')}>
                <option value="all">Всё время</option>
                <option value="month">Месяц</option>
              </select>
            </label>
            {filterPeriod === 'month' ? (
              <label>
                Месяц
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
              </label>
            ) : null}
          </div>

          <div className="panel">
            <ul className="tx-list">
              {filteredTransactions.map((tx) => {
                const category = categoryById(tx.categoryId);
                const categoryName = category ? category.name : 'Без категории';
                const title = tx.note || categoryName;
                const sign = tx.type === 'income' ? '+' : '−';
                return (
                  <li className="tx-item" key={tx.id}>
                    <div className="tx-main">
                      <p className="tx-title">{title}</p>
                      <p className="tx-meta">{formatDate(tx.date)} · {categoryName}</p>
                    </div>
                    <div className="row-actions">
                      <span className={`tx-amount ${tx.type}`}>{sign}{formatMoney(tx.amount, currency)}</span>
                      <button type="button" className="btn small" onClick={() => openTxForm(tx)}>Изменить</button>
                      <button type="button" className="btn small" onClick={() => askDelete('tx', tx.id, 'Операция будет удалена без восстановления.')}>Удалить</button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className={`empty-note${filteredTransactions.length ? ' hidden' : ''}`}>Операций с такими фильтрами нет.</p>
          </div>
        </section>

        <section className={`view${view === 'categories' ? ' is-active' : ''}`}>
          <header className="page-head">
            <div>
              <p className="eyebrow">Справочник</p>
              <h2>Категории</h2>
            </div>
          </header>
          <div className="cat-grid">
            {(['income', 'expense'] as MoneyType[]).map((type) => (
              <article className="panel" key={type}>
                <h3>{type === 'income' ? 'Доходы' : 'Расходы'}</h3>
                <form
                  className="inline-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    createCategory(type, type === 'income' ? catIncomeName : catExpenseName);
                  }}
                >
                  <input
                    type="text"
                    maxLength={40}
                    placeholder="Новая категория"
                    required
                    value={type === 'income' ? catIncomeName : catExpenseName}
                    onChange={(e) => (type === 'income' ? setCatIncomeName(e.target.value) : setCatExpenseName(e.target.value))}
                  />
                  <button type="submit" className="btn primary">Добавить</button>
                </form>
                {(type === 'income' ? catIncomeError : catExpenseError) ? (
                  <p className="form-error">{type === 'income' ? catIncomeError : catExpenseError}</p>
                ) : null}
                <ul className="cat-list">
                  {categoriesByType(type).length === 0 ? <li className="empty-note">Категорий нет.</li> : null}
                  {categoriesByType(type).map((category) => (
                    <li className="cat-item" key={category.id}>
                      {editingCatId === category.id ? (
                        <form className="cat-edit" onSubmit={(event) => saveCategoryEdit(event, category.id)}>
                          <input type="text" maxLength={40} required value={editingCatName} onChange={(e) => setEditingCatName(e.target.value)} />
                          <button type="submit" className="btn small primary">Ок</button>
                          <button type="button" className="btn small" onClick={() => setEditingCatId(null)}>Отмена</button>
                        </form>
                      ) : (
                        <>
                          <p className="cat-name">{category.name}</p>
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => {
                                setEditingCatId(category.id);
                                setEditingCatName(category.name);
                                setCatIncomeError('');
                                setCatExpenseError('');
                              }}
                            >
                              Изменить
                            </button>
                            <button
                              type="button"
                              className="btn small"
                              onClick={() => {
                                if (transactions.some((tx) => tx.categoryId === category.id)) {
                                  const setError = type === 'income' ? setCatIncomeError : setCatExpenseError;
                                  setError('Сначала удалите или измените операции этой категории.');
                                  return;
                                }
                                askDelete('cat', category.id, `Удалить категорию «${category.name}»?`);
                              }}
                            >
                              Удалить
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={`view${view === 'settings' ? ' is-active' : ''}`}>
          <header className="page-head">
            <div>
              <p className="eyebrow">Параметры</p>
              <h2>Настройки</h2>
            </div>
          </header>
          <form className="panel settings-form" onSubmit={saveSettings}>
            <p className="hint">Аккаунт: {user?.email}</p>
            <label>
              Валюта
              <input
                type="text"
                maxLength={12}
                placeholder="сум"
                value={currencyInput}
                onChange={(e) => {
                  setCurrencyInput(e.target.value);
                  setSettingsOk(false);
                }}
              />
            </label>
            <p className="hint">По умолчанию — сум. Пустое поле вернёт это значение.</p>
            {settingsError ? <p className="form-error">{settingsError}</p> : null}
            <button type="submit" className="btn primary">Сохранить</button>
            {settingsOk ? <p className="form-ok">Валюта сохранена.</p> : null}
            <button type="button" className="btn ghost" style={{ marginTop: 12 }} onClick={logout}>Выйти</button>
          </form>
        </section>
      </main>

      <div className={`modal${confirmOpen ? '' : ' hidden'}`} role="dialog" aria-modal="true">
        <div className="modal-card">
          <h3>Удалить?</h3>
          <p>{confirmText}</p>
          <div className="form-actions">
            <button type="button" className="btn danger" onClick={confirmDelete}>Удалить</button>
            <button type="button" className="btn ghost" onClick={() => { setConfirmOpen(false); setPendingDelete(null); }}>Отмена</button>
          </div>
        </div>
      </div>
    </div>
  );
}
