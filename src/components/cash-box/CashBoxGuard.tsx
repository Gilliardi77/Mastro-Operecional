// src/components/cash-box/CashBoxGuard.tsx
'use client';

import React from 'react';
import { useCashBox } from '@/contexts/CashBoxContext';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CashBoxGuardProps {
  children: React.ReactNode;
}

export default function CashBoxGuard({ children }: CashBoxGuardProps) {
  const { activeSession, isLoading } = useCashBox();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Verificando status do caixa...</p>
      </div>
    );
  }

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-destructive/5 text-destructive min-h-[300px]">
        <Lock className="h-12 w-12" />
        <h3 className="mt-4 text-xl font-semibold">Caixa Fechado</h3>
        <p className="mt-2 text-center text-sm text-destructive/80">
          Você precisa abrir o caixa para realizar operações de venda.
        </p>
        <Button asChild className="mt-6 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/financeiro/fechamento-caixa">Abrir o Caixa</Link>
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}
