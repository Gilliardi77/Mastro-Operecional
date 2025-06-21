import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Histórico de Caixa - Maestro Operacional',
  description: 'Consulte o histórico de todas as sessões de caixa.',
};

export default function HistoricoCaixaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
