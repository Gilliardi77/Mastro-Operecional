
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lançamentos Financeiros - Maestro Financeiro',
  description: 'Consulte todas as suas receitas e despesas.',
};

export default function LancamentosFinanceirosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
