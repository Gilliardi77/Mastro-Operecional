import ModuleAccessGuard from '@/components/auth/ModuleAccessGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Módulo Operacional',
  description: 'Gestão do dia a dia do seu negócio.',
};

export default function OperacionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard moduleName="operacional">
      {children}
    </ModuleAccessGuard>
  );
}
