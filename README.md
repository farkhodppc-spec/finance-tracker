# Сумма — трекер доходов и расходов

Next.js-приложение с регистрацией, входом и хранением данных в Neon Postgres. Хостинг — Vercel.

## Локальный запуск

1. Скопируйте `.env.example` в `.env.local` и заполните значения.
2. Установите зависимости: `npm install`
3. Примените миграцию: `node --env-file=.env.local scripts/migrate.mjs`
4. Запустите: `npm run dev`

## Стек

- Next.js (App Router)
- Neon Postgres
- Vercel
