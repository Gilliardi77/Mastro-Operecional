// src/contexts/CashBoxContext.tsx
'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import useSWR, { type KeyedMutator } from 'swr';
import { useAuth } from '@/contexts/AuthContext';
import { buscarSessaoAtiva, type SessaoCaixa } from '@/services/sessaoCaixaService';
import { Loader2 } from 'lucide-react';

interface CashBoxContextType {
  activeSession: SessaoCaixa | null | undefined;
  isLoading: boolean;
  error: any;
  mutate: KeyedMutator<SessaoCaixa | null>;
}

const CashBoxContext = createContext<CashBoxContextType | undefined>(undefined);

const fetcher = async ([userId]: [string | null]): Promise<SessaoCaixa | null> => {
    if (!userId) return null;
    return buscarSessaoAtiva(userId);
}

export function CashBoxProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const { data: activeSession, error, isLoading, mutate } = useSWR(
    // A chave do SWR é um array; só busca se o userId existir
    user?.uid ? [user.uid, 'activeSession'] : null, 
    fetcher,
    {
      revalidateOnFocus: true, // Revalida quando a janela ganha foco
      shouldRetryOnError: false // Não tenta novamente em caso de erro para não spammar
    }
  );

  const value: CashBoxContextType = {
    activeSession,
    isLoading: isAuthLoading || isLoading,
    error,
    mutate
  };

  return (
    <CashBoxContext.Provider value={value}>
      {children}
    </CashBoxContext.Provider>
  );
}

export const useCashBox = (): CashBoxContextType => {
  const context = useContext(CashBoxContext);
  if (context === undefined) {
    throw new Error('useCashBox must be used within a CashBoxProvider');
  }
  return context;
};
