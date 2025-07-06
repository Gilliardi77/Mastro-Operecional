
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Histórico de Entregas - Business Maestro',
  description: 'Visualize o histórico de entregas de ordens de serviço.',
};

export default function HistoricoEntregasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
