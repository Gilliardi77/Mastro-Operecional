
// src/app/recursos/page.tsx
'use client';

import React, { useEffect } from 'react'; 
import Link from 'next/link';
import { useRouter } from 'next/navigation'; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Proportions, Target, Tag, GanttChartSquare, LayoutDashboard, Loader2, LockKeyhole, DatabaseZap } from 'lucide-react'; 
import { useAuth } from '@/hooks/use-auth'; 

interface Recurso {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  aiHint?: string;
}

const recursosDisponiveis: Recurso[] = [
  {
    href: '/',
    icon: LayoutDashboard,
    title: 'Painel de Controle',
    description: 'Acesse a visão geral da sua saúde financeira, métricas chave e gráficos de performance.',
    aiHint: 'dashboard gauge',
  },
  {
    href: '/financeiro',
    icon: Proportions,
    title: 'Controle Financeiro',
    description: 'Gerencie seus lançamentos, receitas, despesas e acompanhe o fluxo de caixa detalhado.',
    aiHint: 'finance chart',
  },
  {
    href: '/analise-metas',
    icon: Target,
    title: 'Análise de Metas',
    description: 'Defina suas metas financeiras, custos, margens e obtenha um diagnóstico da sua performance.',
    aiHint: 'target goals',
  },
  {
    href: '/precificacao',
    icon: Tag,
    title: 'Precificação Inteligente',
    description: 'Calcule preços de produtos/serviços com base em custos, margens e análise de IA.',
    aiHint: 'price tag',
  },
];

export default function RecursosPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login?redirect=/recursos');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary font-headline">
          Central de Recursos
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Acesse todas as ferramentas e funcionalidades da plataforma Visão Clara Financeira em um só lugar.
        </p>
      </header>

      {recursosDisponiveis.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {recursosDisponiveis.map((recurso) => (
            <Link href={recurso.href} key={recurso.title} className="block group">
              <Card className="h-full flex flex-col overflow-hidden shadow-lg rounded-xl hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 border-border hover:border-primary/50">
                <CardHeader className="p-5 bg-card">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10 text-primary">
                      <recurso.icon className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-xl font-semibold group-hover:text-primary transition-colors">
                      {recurso.title}
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-5 flex-grow">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {recurso.description}
                  </p>
                </CardContent>
                <CardFooter className="p-5 bg-muted/30 border-t border-border">
                  <Button variant="ghost" size="sm" className="w-full text-primary group-hover:underline">
                    Acessar Recurso
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nenhum recurso disponível no momento.</p>
        </div>
      )}
    </div>
  );
}
