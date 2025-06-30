'use client';

import { AuthProvider } from '@/components/auth/auth-provider';
import { CashBoxProvider } from '@/contexts/CashBoxContext';
import { AIGuideProvider } from '@/contexts/AIGuideContext';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CashBoxProvider>
          <AIGuideProvider>{children}</AIGuideProvider>
        </CashBoxProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
