
import ModuleAccessGuard from '@/components/auth/ModuleAccessGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Módulo Financeiro',
  description: 'Gestão financeira completa do seu negócio.',
};

export default function FinanceiroLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleAccessGuard moduleName="financeiro">
      {children}
    </ModuleAccessGuard>
  );
}
