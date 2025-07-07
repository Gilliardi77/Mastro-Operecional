
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FilePlus2, ShoppingCart, CalendarDays, Users, PackageSearch, LayoutGrid, Calculator, TrendingUp, Settings, ActivitySquare, Loader2 } from 'lucide-react';

interface QuickAccessCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  cta: string;
}

function QuickAccessCard({ title, description, href, icon: Icon, cta }: QuickAccessCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-8 w-8 text-primary" />
          <CardTitle className="text-xl font-headline">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function OperacionalHomePage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/operacional');
    }
  }, [user, isAuthenticating, router]);

  useEffect(() => {
    const getCurrentGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return 'Bom dia';
      if (hour < 18) return 'Boa tarde';
      return 'Boa noite';
    };
    setGreeting(getCurrentGreeting());
  }, []);

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const quickAccessItems: QuickAccessCardProps[] = [
    {
      title: 'Dashboard Operacional',
      description: 'Visão geral das atividades diárias do seu negócio.',
      href: '/operacional/dashboard',
      icon: LayoutGrid,
      cta: 'Ver Dashboard',
    },
    {
      title: 'Nova Ordem de Serviço',
      description: 'Crie e gerencie ordens de serviço para seus clientes.',
      href: '/operacional/produtos-servicos/atendimentos/novo',
      icon: FilePlus2,
      cta: 'Criar OS',
    },
    {
      title: 'Balcão de Vendas (PDV)',
      description: 'Realize vendas rápidas de produtos e serviços no balcão.',
      href: '/operacional/balcao',
      icon: ShoppingCart,
      cta: 'Ir para o Balcão',
    },
    {
      title: 'Controle de Produção',
      description: 'Acompanhe e gerencie o progresso das suas ordens de produção.',
      href: '/operacional/producao',
      icon: Settings,
      cta: 'Acessar Produção',
    },
    {
      title: 'Agenda',
      description: 'Visualize e gerencie seus compromissos e agendamentos.',
      href: '/operacional/agenda',
      icon: CalendarDays,
      cta: 'Ver Agenda',
    },
    {
      title: 'Clientes',
      description: 'Cadastre e gerencie sua base de clientes.',
      href: '/operacional/clientes',
      icon: Users,
      cta: 'Gerenciar Clientes',
    },
    {
      title: 'Produtos e Serviços',
      description: 'Administre seu catálogo de produtos e tipos de serviços.',
      href: '/operacional/produtos',
      icon: PackageSearch,
      cta: 'Ver Catálogo',
    },
     {
      title: 'Gestão de Caixa',
      description: 'Realize aberturas, fechamentos e sangrias do seu caixa diário.',
      href: '/operacional/caixa',
      icon: Calculator,
      cta: 'Gerenciar Caixa',
    },
  ];

  return (
    <div className="space-y-12">
      <section className="text-center py-8 bg-gradient-to-br from-primary/10 via-background to-background rounded-xl shadow-inner">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {greeting}, {user.displayName || 'pessoa usuária'}!
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Módulo Operacional: gerencie o dia a dia do seu negócio.
        </p>
      </section>

      <section id="quick-access" aria-labelledby="quick-access-title">
        <div className="text-center mb-10">
          <h3 id="quick-access-title" className="font-headline text-3xl text-foreground">
            Acesso Rápido
          </h3>
          <p className="mt-2 text-muted-foreground">Comece a operar rapidamente com as principais funcionalidades.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickAccessItems.map((item) => (
            <QuickAccessCard key={item.href} {...item} />
          ))}
        </div>
      </section>
    </div>
  );
}
