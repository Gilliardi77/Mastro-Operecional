
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Serviços - Business Maestro',
  description: 'Gerencie seus serviços.',
};

export default function ServicosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
