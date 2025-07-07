import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Novo Diagnóstico - Consultor IA',
  description: 'Inicie uma nova consultoria interativa com a IA para obter insights sobre seu negócio.',
};

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
