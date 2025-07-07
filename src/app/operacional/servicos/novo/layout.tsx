
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Novo Serviço - Business Maestro',
  description: 'Cadastre um novo tipo de serviço.',
};

export default function NovoServicoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
