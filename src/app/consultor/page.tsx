
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History, Brain, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

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

export default function ConsultorDashboardPage() {
  const { user, isAuthenticating } = useAuth();
  const userName = user?.displayName?.split(' ')[0] || 'Empreendedor(a)';

  if (isAuthenticating) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl md:text-3xl font-bold text-primary">
          Módulo Consultor IA, {userName}!
        </h1>
        <p className="text-md text-muted-foreground mt-2">
          Aqui você pode obter diagnósticos, definir metas estratégicas e revisar seu progresso.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <DashboardItem 
          title="Novo Diagnóstico" 
          description="Inicie uma nova consultoria interativa com a IA para obter insights sobre seu negócio." 
          icon={Brain} 
          link="/consultor/consultation" 
          cta="Iniciar Diagnóstico" 
        />
        <DashboardItem 
          title="Planejamento Estratégico" 
          description="Defina suas metas e receba um plano de ação detalhado gerado pela IA." 
          icon={Brain} 
          link="/consultor/goals" 
          cta="Definir Metas" 
        />
        <DashboardItem 
          title="Histórico de Consultas" 
          description="Revise seus diagnósticos e planejamentos anteriores para acompanhar sua evolução." 
          icon={History} 
          link="/consultor/consultations-history" 
          cta="Ver Histórico" 
        />
      </div>
    </div>
  );
}
