
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Meu Perfil - Maestro Operacional',
  description: 'Gerencie suas informações de perfil e configurações da conta.',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
