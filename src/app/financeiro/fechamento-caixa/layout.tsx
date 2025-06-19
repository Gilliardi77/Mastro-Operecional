
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fechamento de Caixa - Maestro Operacional',
  description: 'Realize o fechamento do caixa diário.',
};

export default function FechamentoCaixaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
