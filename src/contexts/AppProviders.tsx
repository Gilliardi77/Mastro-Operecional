'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { CashBoxProvider } from '@/contexts/CashBoxContext';
import { AIGuideProvider } from '@/contexts/AIGuideContext';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <CashBoxProvider>
        <AIGuideProvider>{children}</AIGuideProvider>
      </CashBoxProvider>
    </AuthProvider>
  );
}
