
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ordens de Serviço - Maestro Operacional',
  description: 'Visualize e gerencie suas ordens de serviço.',
};

export default function OrdensServicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
