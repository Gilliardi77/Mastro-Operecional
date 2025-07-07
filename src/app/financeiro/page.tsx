
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Loader2,
  TrendingUp,
  ListChecks,
  History,
  Tag,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardFinanceiroPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/financeiro');
    }
  }, [user, isAuthenticating, router]);

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const financialTools = [
    {
      href: '/financeiro/dashboard-geral',
      icon: TrendingUp,
      title: 'Painel Geral',
      description: 'Visão completa da saúde financeira do seu negócio com gráficos e métricas chave.',
      cta: 'Acessar Painel'
    },
    {
      href: '/financeiro/lancamentos',
      icon: ListChecks,
      title: 'Lançamentos e Contas',
      description: 'Gerencie suas receitas, despesas e contas a pagar/receber de forma centralizada.',
      cta: 'Gerenciar Lançamentos'
    },
    {
      href: '/financeiro/analise-metas',
      icon: Target,
      title: 'Análise de Metas',
      description: 'Defina suas metas financeiras, custos e margens para diagnósticos precisos.',
      cta: 'Definir Metas'
    },
    {
      href: '/financeiro/precificacao',
      icon: Tag,
      title: 'Precificação Inteligente',
      description: 'Calcule preços de venda ideais com base em custos, margens e análise de IA.',
      cta: 'Precificar Itens'
    }
  ];

  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Visão Clara Financeira
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Acompanhe a saúde financeira do seu negócio e acesse as principais funcionalidades.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {financialTools.map(tool => (
          <Card key={tool.href} className="shadow-lg hover:shadow-xl transition-shadow flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <tool.icon className="h-6 w-6" />
                  {tool.title}
              </CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
               {/* Espaço para conteúdo futuro, se necessário */}
            </CardContent>
            <CardContent>
                <Button asChild className="w-full">
                  <Link href={tool.href}>
                    {tool.cta}
                  </Link>
                </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
