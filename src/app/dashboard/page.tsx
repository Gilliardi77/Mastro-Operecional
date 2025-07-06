"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutGrid, History, Brain, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  link: string;
  cta: string;
  disabled?: boolean;
}

const DashboardItem: React.FC<DashboardItemProps> = ({ title, description, icon: Icon, link, cta, disabled }) => (
  <Card className="flex flex-col h-full transform transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
    <CardHeader className="pb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-7 h-7 text-primary" />
        </div>
        <CardTitle className="text-xl font-semibold text-primary">{title}</CardTitle>
      </div>
      <CardDescription className="text-sm text-muted-foreground min-h-[40px]">{description}</CardDescription>
    </CardHeader>
    <CardContent className="flex-grow" />
    <CardContent className="pt-0">
      <Button asChild className="w-full" disabled={disabled}>
        <Link href={disabled ? "#" : link}>
          {cta} <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </CardContent>
  </Card>
);

export default function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container mx-auto pt-16 pb-20 px-4 md:px-6">
        <Skeleton className="h-9 w-1/3 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => ( 
            <Card key={i} className="flex flex-col h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <Skeleton className="h-7 w-3/4" />
                </div>
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-4 w-5/6" />
              </CardHeader>
              <CardContent className="flex-grow" />
              <CardContent className="pt-0">
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const userName = user?.displayName?.split(' ')[0] || 'Empreendedor';

  const dashboardItems: DashboardItemProps[] = [
    {
      title: "Módulos de Gestão",
      description: "Acesse ferramentas para otimizar suas vendas, produção e finanças.",
      icon: LayoutGrid,
      link: "/modules", 
      cta: "Explorar Módulos",
      disabled: false,
    },
    {
      title: "Histórico de Consultas",
      description: "Revise seus diagnósticos anteriores e acompanhe sua evolução.",
      icon: History,
      link: "/consultations-history", 
      cta: "Ver Histórico",
      disabled: false,
    },
    {
      title: "Planejamento Estratégico",
      description: "Receba uma consultoria da IA para seu negócio e defina planos de ação.",
      icon: Brain,
      link: "/goals", 
      cta: "Iniciar Planejamento",
      disabled: false, 
    },
  ];

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-background to-secondary/10 flex flex-col">
      <main className="flex-grow container mx-auto pt-16 pb-20 px-4 md:px-6">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-primary">
            Bem-vindo de volta, {userName}!
          </h1>
          <p className="text-md text-muted-foreground mt-2">
            Seu painel central para o sucesso do seu negócio. O que vamos fazer hoje?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map((item) => (
            <DashboardItem key={item.title} {...item} />
          ))}
        </div>
      </main>
    </div>
  );
}
