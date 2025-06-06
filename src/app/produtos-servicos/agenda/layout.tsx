
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agenda - Business Maestro',
  description: 'Gerencie seus agendamentos.',
};

export default function AgendaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
