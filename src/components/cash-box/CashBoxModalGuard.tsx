'use client';

import React, { useState, useEffect } from 'react';
import { useCashBox } from '@/contexts/CashBoxContext';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AbrirCaixaForm } from './AbrirCaixaForm';
import { isSameDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface CashBoxModalGuardProps {
  children: React.ReactNode;
}

export default function CashBoxModalGuard({ children }: CashBoxModalGuardProps) {
  const { activeSession, isLoading } = useCashBox();
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    if (activeSession) {
      // activeSession.dataAbertura is a Date object from firestoreService conversion
      if (!isSameDay(activeSession.dataAbertura, new Date())) {
        setIsStale(true);
      } else {
        setIsStale(false);
      }
    } else {
      setIsStale(false);
    }
  }, [activeSession]);
  
  const isBlockedForOpen = !isLoading && !activeSession;
  const isBlockedForStale = !isLoading && isStale;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-2 text-muted-foreground">Verificando status do caixa...</p>
      </div>
    );
  }

  // Case 1: Session is stale (from a previous day). This takes precedence.
  if (isBlockedForStale) {
    return (
      <>
        <Dialog open={true}>
          <DialogContent 
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6"/>
                Sessão de Caixa Antiga
              </DialogTitle>
              <DialogDescription className="pt-2 text-left">
                Sua sessão de caixa foi aberta em um dia anterior e precisa ser fechada. 
                Para evitar misturar os movimentos financeiros de dias diferentes, você deve encerrar a sessão atual antes de continuar.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Clique no botão abaixo para ir à página de fechamento de caixa.
              </p>
            </div>
            <DialogFooter>
               <Button asChild className="w-full">
                  <Link href="/financeiro/fechamento-caixa">Fechar Caixa Agora</Link>
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className={'pointer-events-none opacity-50'}>
          {children}
        </div>
      </>
    );
  }

  // Case 2: No active session (and not stale)
  if (isBlockedForOpen) {
    return (
      <>
        <Dialog open={true}>
          <DialogContent 
            className="sm:max-w-md"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            showCloseButton={false}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Abrir Caixa</DialogTitle>
              <DialogDescription>
                Você precisa abrir uma nova sessão de caixa para registrar vendas e outras operações financeiras.
              </DialogDescription>
            </DialogHeader>
            <AbrirCaixaForm />
          </DialogContent>
        </Dialog>
        <div className={'pointer-events-none opacity-50'}>
          {children}
        </div>
      </>
    );
  }

  // Case 3: Session is active and valid (today)
  return <>{children}</>;
}
