
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Novo Produto - Business Maestro',
  description: 'Cadastre um novo produto.',
};

export default function NovoProdutoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
