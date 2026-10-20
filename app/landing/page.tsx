import type { Metadata } from 'next';
import LandingPage from '@/components/landing/LandingPage';

export const metadata: Metadata = {
  title: 'Сумма — презентация трекера',
  description: 'Лендинг проекта «Сумма» с shadcn/ui, Motion и parallax-эффектами',
};

export default function LandingRoute() {
  return <LandingPage />;
}
