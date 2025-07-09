// src/app/team/layout.tsx
import ModuleAccessGuard from '@/components/auth/ModuleAccessGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gerenciamento de Equipe - Gestor Maestro',
  description: 'Adicione e gerencie os usuários da sua equipe.',
};

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  // Embora a página verifique a role, o guardião de layout oferece uma camada extra
  // de segurança, impedindo a renderização do layout para não-admins.
  // Usaremos a role 'admin' como um "módulo" especial para o guard.
  return (
    <ModuleAccessGuard moduleName="admin">
      {children}
    </ModuleAccessGuard>
  );
}
