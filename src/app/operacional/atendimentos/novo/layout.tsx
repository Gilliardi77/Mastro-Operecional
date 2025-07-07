
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Novo Atendimento - Business Maestro',
  description: 'Inicie um novo orçamento, ordem de serviço ou atendimento rápido.',
};

export default function NovoAtendimentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
