
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard - Maestro Operacional',
  description: 'Visão geral das suas operações.',
};

export default function DashboardOperacionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
