
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Controle de Estoque - Maestro Operacional',
  description: 'Gerencie o estoque de produtos.',
};

export default function EstoqueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
