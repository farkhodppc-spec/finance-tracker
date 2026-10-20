'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from 'motion/react';
import {
  ArrowRight,
  ChartColumn,
  LockKeyhole,
  Cloud,
  Wallet,
  Layers3,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function ParallaxLayer({
  y,
  className,
  children,
}: {
  y: MotionValue<string> | MotionValue<number>;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div style={{ y }} className={className} aria-hidden={children ? undefined : true}>
      {children}
    </motion.div>
  );
}

const features = [
  {
    icon: Wallet,
    title: 'Доходы и расходы',
    description: 'Полный CRUD по операциям с фильтрами по типу и периоду.',
    badge: 'CRUD',
  },
  {
    icon: ChartColumn,
    title: 'Живой дашборд',
    description: 'Баланс, столбцы по месяцам и кольцевая диаграмма категорий.',
    badge: 'Canvas',
  },
  {
    icon: LockKeyhole,
    title: 'Аккаунты',
    description: 'Регистрация и вход: данные привязаны к пользователю.',
    badge: 'Auth',
  },
  {
    icon: Cloud,
    title: 'Neon + Vercel',
    description: 'Postgres в Neon, фронтенд и API на Vercel.',
    badge: 'Cloud',
  },
];

const stack = [
  { name: 'Next.js', detail: 'App Router' },
  { name: 'Neon', detail: 'Postgres' },
  { name: 'shadcn/ui', detail: 'UI kit' },
  { name: 'Motion', detail: 'Анимации' },
];

export default function LandingPage() {
  const reduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const showcaseRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const { scrollYProgress: showcaseProgress } = useScroll({
    target: showcaseRef,
    offset: ['start end', 'end start'],
  });

  const bgY = useTransform(heroProgress, [0, 1], reduceMotion ? ['0%', '0%'] : ['0%', '35%']);
  const midY = useTransform(heroProgress, [0, 1], reduceMotion ? ['0%', '0%'] : ['0%', '18%']);
  const titleY = useTransform(heroProgress, [0, 1], reduceMotion ? [0, 0] : [0, 80]);
  const titleOpacity = useTransform(heroProgress, [0, 0.65], [1, 0]);
  const orbX = useTransform(showcaseProgress, [0, 1], reduceMotion ? ['0%', '0%'] : ['-8%', '12%']);
  const cardY = useTransform(showcaseProgress, [0, 1], reduceMotion ? [0, 0] : [60, -40]);

  return (
    <div className="landing min-h-dvh bg-[var(--bg)] text-[var(--ink)]">
      <header className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-[var(--surface)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--ink)] text-sm text-[var(--surface)]">
              ∑
            </span>
            Сумма
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Войти</Link>
            </Button>
            <Button asChild>
              <Link href="/register">
                Начать
                <ArrowRight />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <section ref={heroRef} className="relative isolate overflow-hidden">
        <ParallaxLayer
          y={bgY}
          className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_20%_0%,#fff8ea_0%,transparent_55%),radial-gradient(ellipse_at_90%_20%,#e7f4ec_0%,transparent_40%),var(--bg)]"
        />
        <ParallaxLayer y={midY} className="pointer-events-none absolute inset-x-0 top-24 -z-10 h-[480px]">
          <div className="absolute left-[8%] top-10 h-40 w-40 rounded-full bg-[var(--income)]/10 blur-2xl" />
          <div className="absolute right-[12%] top-32 h-56 w-56 rounded-full bg-[var(--expense)]/10 blur-3xl" />
          <div className="absolute left-1/2 top-48 h-32 w-[70%] -translate-x-1/2 rounded-[40%] bg-[var(--line)]/40 blur-xl" />
        </ParallaxLayer>

        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-center px-4 py-20 sm:px-6"
        >
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <Badge variant="secondary" className="mb-5 gap-1.5 px-3 py-1">
              <Sparkles className="size-3.5" />
              Презентация проекта
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl sm:leading-[1.05]">
              Трекер доходов и расходов с облачным аккаунтом
            </h1>
            <p className="mt-5 max-w-xl text-base text-[var(--muted)] sm:text-lg">
              «Сумма» — учебный fullstack-проект: дашборд, CRUD, регистрация, Neon Postgres и деплой на Vercel.
              Этот лендинг собран на shadcn/ui и Motion с parallax при скролле.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link href="/register">
                  Создать аккаунт
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Открыть приложение</Link>
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="mb-10 max-w-2xl"
        >
          <Badge variant="outline" className="mb-3">
            Возможности
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Всё для личного учёта денег</h2>
          <p className="mt-3 text-[var(--muted)]">
            Интерфейс трекера сохраняет спокойную светлую эстетику, а данные больше не живут только в localStorage.
          </p>
        </motion.div>

        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={reduceMotion ? false : { opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <Card className="h-full border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-[var(--ink)] text-[var(--surface)]">
                      <feature.icon className="size-5" />
                    </span>
                    <Badge variant="secondary">{feature.badge}</Badge>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-[var(--muted)]">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section ref={showcaseRef} className="relative overflow-hidden border-y border-[var(--line)] bg-[var(--surface)]">
        <ParallaxLayer y={orbX} className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-[var(--income)]/15 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-3" variant="income">
              Parallax
            </Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Скролл оживляет презентацию</h2>
            <p className="mt-4 text-[var(--muted)]">
              Слои фона, карточка-превью и декоративные пятна двигаются с разной скоростью через{' '}
              <code className="rounded bg-[var(--bg)] px-1.5 py-0.5 text-sm">useScroll</code> и{' '}
              <code className="rounded bg-[var(--bg)] px-1.5 py-0.5 text-sm">useTransform</code> из Motion.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[var(--muted)]">
              <li className="flex gap-2">
                <Layers3 className="mt-0.5 size-4 shrink-0 text-[var(--ink)]" />
                Несколько parallax-слоёв в hero
              </li>
              <li className="flex gap-2">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--ink)]" />
                Появление секций whileInView
              </li>
              <li className="flex gap-2">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-[var(--ink)]" />
                Учёт prefers-reduced-motion
              </li>
            </ul>
          </motion.div>

          <motion.div style={{ y: cardY }} className="relative">
            <Card className="overflow-hidden border-[var(--line)] bg-[var(--bg)] shadow-[var(--shadow)]">
              <CardHeader className="border-b border-[var(--line)] bg-[var(--surface)]">
                <CardTitle className="text-lg">Дашборд «Сумма»</CardTitle>
                <CardDescription>Пример карточек баланса</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">Баланс</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight">2 450 000</p>
                  <Badge variant="secondary" className="mt-2">сум</Badge>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">Доходы</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--income)]">2 500 000</p>
                  <Badge variant="income" className="mt-2">+ доход</Badge>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <p className="text-xs text-[var(--muted)]">Расходы</p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--expense)]">50 000</p>
                  <Badge variant="expense" className="mt-2">− расход</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-semibold tracking-tight">Стек презентации и приложения</h2>
          <p className="mt-2 text-[var(--muted)]">shadcn и Motion подключены специально для этого лендинга.</p>
        </motion.div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stack.map((item, index) => (
            <motion.div
              key={item.name}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
            >
              <Card className="border-[var(--line)] bg-[var(--surface)]">
                <CardContent className="p-5">
                  <p className="text-lg font-semibold">{item.name}</p>
                  <p className="text-sm text-[var(--muted)]">{item.detail}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--ink)] text-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center sm:px-6">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Попробуйте «Сумму»</h2>
            <p className="mt-2 max-w-md text-[var(--surface)]/70">
              Создайте аккаунт и ведите учёт в облаке — или войдите, если уже регистрировались.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/register">Регистрация</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-[var(--surface)]/30 bg-transparent text-[var(--surface)] hover:bg-[var(--surface)]/10 hover:text-[var(--surface)]"
              asChild
            >
              <Link href="/login">Вход</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">
        Сумма · лендинг на shadcn/ui + Motion
      </footer>
    </div>
  );
}
