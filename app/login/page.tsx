'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Не удалось войти');
        return;
      }
      router.replace('/');
      router.refresh();
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="brand auth-brand">
          <span className="brand-mark" aria-hidden="true">∑</span>
          <div>
            <p className="brand-kicker">Личные финансы</p>
            <h1>Сумма</h1>
          </div>
        </div>
        <h2>Вход</h2>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button type="submit" className="btn primary" disabled={loading}>
          {loading ? 'Входим…' : 'Войти'}
        </button>
        <p className="auth-switch">
          Нет аккаунта? <Link href="/register">Зарегистрироваться</Link>
        </p>
        <p className="auth-switch">
          <Link href="/landing">О проекте</Link>
        </p>
      </form>
    </div>
  );
}
