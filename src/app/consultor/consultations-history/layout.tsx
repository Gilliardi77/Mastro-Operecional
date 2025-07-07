import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Histórico de Consultas - Consultor IA',
  description: 'Revise seus diagnósticos e planejamentos anteriores.',
};

export default function HistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
