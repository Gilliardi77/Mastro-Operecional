
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Balcão de Vendas - Business Maestro',
  description: 'Realize vendas rápidas e gerencie o carrinho.',
};

export default function BalcaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
