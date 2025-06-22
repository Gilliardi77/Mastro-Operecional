
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { Calculator, Lightbulb, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PrecificacaoPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/precificacao');
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
          <Calculator className="h-8 w-8" />
          Precificação Inteligente
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Defina custos, markup e deixe a IA sugerir o preço ideal.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-yellow-500" />
            Configurações de Precificação
          </CardTitle>
          <CardDescription>Ajuste os parâmetros para cálculo de preços.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">O formulário de precificação e sugestões da IA serão implementados aqui.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
