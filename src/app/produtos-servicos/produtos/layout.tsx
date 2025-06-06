
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produtos - Business Maestro',
  description: 'Gerencie seus produtos.',
};

export default function ProdutosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
