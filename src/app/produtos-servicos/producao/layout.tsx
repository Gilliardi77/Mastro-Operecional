
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Controle de Produção - Business Maestro',
  description: 'Gerencie o progresso das ordens de produção.',
};

export default function ProducaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

    