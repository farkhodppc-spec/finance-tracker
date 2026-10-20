import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Сумма — трекер доходов и расходов',
  description: 'Личный трекер финансов с аккаунтом',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
