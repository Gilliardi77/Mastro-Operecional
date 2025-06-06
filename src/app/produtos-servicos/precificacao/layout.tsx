
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Precificação - Business Maestro',
  description: 'Configure a precificação dos seus produtos e serviços.',
};

export default function PrecificacaoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
