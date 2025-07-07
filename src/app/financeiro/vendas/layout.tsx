
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Histórico de Vendas - Maestro Financeiro',
  description: 'Consulte o histórico detalhado de todas as vendas realizadas.',
};

export default function VendasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
