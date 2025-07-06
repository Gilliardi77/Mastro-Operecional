
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { History, ListChecks, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function HistoricoEntregasPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/historico-entregas');
    }
  }, [user, isAuthenticating, router]);

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <History className="h-8 w-8" />
          Histórico de Entregas
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Consulte o status e detalhes das ordens de serviço concluídas e entregues.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-green-600" />
            Registros de Entregas
          </CardTitle>
          <CardDescription>Aqui será exibida a lista de entregas concluídas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">Nenhuma entrega registrada ainda ou funcionalidade em desenvolvimento.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
