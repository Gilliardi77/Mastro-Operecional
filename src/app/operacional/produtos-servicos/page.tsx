
'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PackageSearch, Users, CalendarDays, FileText, Settings, History } from 'lucide-react';

interface ModuleCardProps {
    title: string;
    description: string;
    href: string;
    icon: React.ElementType;
}

const ModuleCard = ({ title, description, href, icon: Icon }: ModuleCardProps) => (
    <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
            <Icon className="h-8 w-8 text-primary" />
            <div>
                <CardTitle className="text-lg">{title}</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
        </CardContent>
        <CardContent>
             <Button asChild className="w-full">
                <Link href={href}>Acessar</Link>
            </Button>
        </CardContent>
    </Card>
);

export default function ProdutosServicosHubPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/operacional/produtos-servicos');
    }
  }, [user, isAuthenticating, router]);

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const modules = [
    {
      title: 'Produtos',
      description: 'Gerencie seu catálogo de produtos e serviços.',
      href: '/operacional/produtos-servicos/produtos',
      icon: PackageSearch
    },
    {
      title: 'Clientes',
      description: 'Cadastre e visualize seus clientes.',
      href: '/operacional/produtos-servicos/clientes',
      icon: Users
    },
    {
      title: 'Agenda',
      description: 'Veja e gerencie seus compromissos e agendamentos.',
      href: '/operacional/produtos-servicos/agenda',
      icon: CalendarDays
    },
    {
      title: 'Ordens de Serviço',
      description: 'Crie e acompanhe as ordens de serviço.',
      href: '/operacional/produtos-servicos/ordens',
      icon: FileText
    },
    {
      title: 'Produção',
      description: 'Acompanhe o andamento das ordens em produção.',
      href: '/operacional/produtos-servicos/producao',
      icon: Settings
    },
    {
      title: 'Histórico de Entregas',
      description: 'Consulte as ordens de serviço concluídas e entregues.',
      href: '/operacional/produtos-servicos/historico-entregas',
      icon: History
    }
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-3xl font-bold tracking-tight">Produtos e Serviços</h2>
        <p className="text-muted-foreground mt-2">
          Central de gerenciamento para todos os seus produtos, serviços, clientes e agendamentos.
        </p>
      </section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map(module => (
            <ModuleCard key={module.href} {...module} />
        ))}
      </div>
    </div>
  );
}

    