
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produtos e Serviços - Business Maestro',
  description: 'Módulo de gestão de produtos e serviços.',
};

export default function ProdutosServicosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
