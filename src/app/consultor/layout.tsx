import ModuleAccessGuard from '@/components/auth/ModuleAccessGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Módulo Consultor IA',
  description: 'Diagnóstico e Planejamento Estratégico com Inteligência Artificial.',
};

export default function ConsultorLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard moduleName="consultor">
      {children}
    </ModuleAccessGuard>
  );
}
