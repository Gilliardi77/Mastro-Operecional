'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { CashBoxProvider } from '@/contexts/CashBoxContext';
import { AIGuideProvider } from '@/contexts/AIGuideContext';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { ConsultationProvider } from './ConsultationContext';
import { 
  INITIAL_FORM_CFG, 
  RAW_MAESTRO_DATA_CFG, 
  BLOCKS_CFG, 
  TOTAL_MAIN_QUESTIONS_CFG, 
  FINAL_DIAGNOSIS_DISPLAY_CFG 
} from '@/data/questions';

export function AppProviders({ children }: { children: ReactNode }) {
  if (!INITIAL_FORM_CFG || !RAW_MAESTRO_DATA_CFG || !BLOCKS_CFG || !FINAL_DIAGNOSIS_DISPLAY_CFG) {
    return (
      <div>
        <p>Erro crítico: Falha ao carregar a configuração da consulta.</p>
        <p>Verifique os logs do servidor.</p>
      </div>
    );
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CashBoxProvider>
          <ConsultationProvider
              initialFormConfigData={INITIAL_FORM_CFG}
              maestroDataConfig={RAW_MAESTRO_DATA_CFG}
              blocksConfigData={BLOCKS_CFG}
              totalMainQuestionsData={TOTAL_MAIN_QUESTIONS_CFG}
              finalDiagnosisDisplayConfigData={FINAL_DIAGNOSIS_DISPLAY_CFG}
          >
            <AIGuideProvider>{children}</AIGuideProvider>
          </ConsultationProvider>
        </CashBoxProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
