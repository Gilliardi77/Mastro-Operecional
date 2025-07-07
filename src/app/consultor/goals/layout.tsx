import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planejamento Estratégico - Consultor IA',
  description: 'Defina suas metas e receba um plano de ação detalhado gerado pela IA.',
};

export default function GoalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
