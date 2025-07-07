
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Financeiro - Gestor Maestro',
  description: 'Visão geral das suas finanças.',
};

export default function DashboardFinanceiroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
