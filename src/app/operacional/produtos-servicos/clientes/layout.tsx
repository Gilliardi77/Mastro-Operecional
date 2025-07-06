
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Clientes - Business Maestro',
  description: 'Gerencie seus clientes.',
};

export default function ClientesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
