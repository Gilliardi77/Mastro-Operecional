
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gestão de Caixa - Maestro Financeiro',
  description: 'Abra e feche o caixa da sua operação diária.',
};

export default function GestaoCaixaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
