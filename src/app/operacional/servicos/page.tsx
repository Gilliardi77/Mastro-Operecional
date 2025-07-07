
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Wrench, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function ServicosPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/operacional/servicos');
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
       <section className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Gestão de Serviços
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Visualize, adicione e gerencie os tipos de serviços oferecidos.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/operacional/servicos/novo">
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Serviço
          </Link>
        </Button>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Serviços</CardTitle>
          <CardDescription>Aqui será exibida a lista de serviços cadastrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em "Novo Serviço" para começar.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
