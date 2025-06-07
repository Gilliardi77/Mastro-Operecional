
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Financeiro - Maestro Operacional',
  description: 'Gestão financeira do seu negócio.',
};

export default function FinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
