
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, LayoutDashboard, Loader2, Lightbulb } from 'lucide-react'; 
import Image from 'next/image'; // Importar o componente Image
import { useAuth } from '@/hooks/useAuth';

export default function VitrinePage() {
  const { user, loading, hasCompletedConsultation, checkingConsultationStatus } = useAuth();

  const isLoadingPage = loading || checkingConsultationStatus;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] pt-16 pb-20 px-4">
      <header className="text-center mb-10">
        <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 shadow-lg overflow-hidden">
          {/* Substituindo o ícone Sparkles pela imagem */}
          <Image
            src="/icons/logo sem fundo 120x120.png"
            alt="Logo Gestor Maestro"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-3">
          Bem-vindo ao Ecossistema Gestor Maestro
        </h1>
        <p className="text-md sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Transforme a gestão do seu negócio com nossa plataforma integrada. O Gestor Maestro oferece um diagnóstico empresarial estratégico, seguido de módulos operacionais e financeiros inteligentes, desenhados para otimizar processos, impulsionar resultados e proporcionar clareza para suas decisões.
        </p>
      </header>

      <main className="container mx-auto flex justify-center w-full max-w-md px-4">
        {isLoadingPage ? (
          <Card className="shadow-xl w-full">
            <CardHeader>
              <div className="flex items-center justify-center mb-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <CardTitle className="text-xl text-primary text-center">Carregando...</CardTitle>
              <CardDescription className="text-sm text-center">Verificando informações.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-12 bg-muted rounded-md animate-pulse"></div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Aguarde
              </Button>
            </CardFooter>
          </Card>
        ) : user && hasCompletedConsultation ? (
          <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full">
            <CardHeader>
              <LayoutDashboard className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl text-primary">Acessar seu Painel</CardTitle>
              <CardDescription className="text-sm">Continue gerenciando seu negócio e acompanhando seu progresso.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>Visão geral do seu negócio.</li>
                <li>Acesso rápido aos módulos.</li>
                <li>Acompanhamento de metas.</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  Ir para o Painel <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full">
            <CardHeader>
              <Lightbulb className="h-10 w-10 text-primary mb-3" />
              <CardTitle className="text-xl text-primary">Diagnóstico Business Maestro</CardTitle>
              <CardDescription className="text-sm">Comece com uma análise estratégica gratuita para entender seu negócio e destravar seu potencial de crescimento com o apoio da nossa IA.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                <li>Descubra insights personalizados.</li>
                <li>Receba um direcionamento claro.</li>
                <li>Primeiro passo para o sucesso.</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/consultation">
                  Iniciar Diagnóstico Gratuito <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>
    </div>
  );
}
