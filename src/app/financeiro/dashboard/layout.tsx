
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Financeiro - Maestro Operacional',
  description: 'Visão geral das suas finanças.',
};

export default function DashboardFinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
