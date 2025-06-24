
'use client';

import React from 'react';
import { useCashBox } from '@/contexts/CashBoxContext';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AbrirCaixaForm } from './AbrirCaixaForm';

interface CashBoxModalGuardProps {
  children: React.ReactNode;
}

export default function CashBoxModalGuard({ children }: CashBoxModalGuardProps) {
  const { activeSession, isLoading } = useCashBox();
  const isBlocked = !isLoading && !activeSession;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Verificando status do caixa...</p>
      </div>
    );
  }

  if (activeSession) {
    return <>{children}</>;
  }

  return (
    <>
      <Dialog open={isBlocked}>
        <DialogContent 
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          showCloseButton={false}
        >
          <AbrirCaixaForm />
        </DialogContent>
      </Dialog>
      <div className={isBlocked ? 'pointer-events-none opacity-50' : ''}>
        {children}
      </div>
    </>
  );
}
