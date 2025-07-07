
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, TrendingUp, Calculator, ListChecks, History, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardFinanceiroPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/financeiro/dashboard-geral');
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
          <TrendingUp className="h-8 w-8" />
          Dashboard Financeiro
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Acompanhe a saúde financeira do seu negócio e acesse as principais funcionalidades.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                Operações de Caixa
            </CardTitle>
            <CardDescription>Ações relacionadas ao gerenciamento do seu caixa diário.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Realize o fechamento diário do seu caixa, registrando entradas, saídas, sangrias e troco.
            </p>
            <Button asChild className="w-full">
              <Link href="/financeiro/fechamento-caixa">
                <Calculator className="mr-2 h-5 w-5" /> Abrir / Fechar Caixa
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
                <Link href="/financeiro/caixa/historico">
                    <History className="mr-2 h-5 w-5" /> Ver Histórico de Caixa
                </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6" />
                Lançamentos Financeiros
            </CardTitle>
            <CardDescription>Visualize o histórico de todas as suas transações financeiras.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Consulte todas as receitas e despesas registradas no sistema.
            </p>
            <Button asChild className="w-full">
              <Link href="/financeiro/lancamentos">
                <ListChecks className="mr-2 h-5 w-5" /> Ver Lançamentos
              </Link>
            </Button>
          </CardContent>
        </Card>

         <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-6 w-6" />
                Histórico de Vendas
            </CardTitle>
            <CardDescription>Consulte o detalhe de todas as vendas realizadas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Visualize cada venda, incluindo os itens, valores e formas de pagamento.
            </p>
            <Button asChild className="w-full">
              <Link href="/financeiro/vendas">
                <History className="mr-2 h-5 w-5" /> Ver Histórico de Vendas
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Análises e Relatórios
            </CardTitle>
            <CardDescription>Insights e visualizações sobre suas finanças.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
              <p className="text-muted-foreground">Gráficos, DRE, fluxo de caixa e outras análises financeiras serão exibidos aqui.</p>
              <p className="text-sm text-muted-foreground mt-2">(Em desenvolvimento)</p>
            </div>
             <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                    <Link href="/financeiro/analise-metas">
                        Acessar Análise de Metas <TrendingUp className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Para análises financeiras avançadas, utilize a Análise de Metas.</p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
