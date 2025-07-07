
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produtos e Serviços - Business Maestro',
  description: 'Gerencie seus produtos e serviços.',
};

export default function ProdutosServicosManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
