
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, LayoutDashboard, Loader2, Lightbulb, Briefcase, TrendingUp } from 'lucide-react'; 
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function VitrinePage() {
  const { user, isAuthenticating } = useAuth();

  const isLoadingPage = isAuthenticating;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] pt-16 pb-20 px-4">
      <header className="text-center mb-10">
        <div className="mx-auto mb-5 flex h-32 w-32 items-center justify-center rounded-full bg-primary/10 shadow-lg overflow-hidden">
          <Image
            src="/images/Logo geométrico roxo minimalista.png"
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
          Transforme a gestão do seu negócio com nossa plataforma integrada, unindo diagnóstico estratégico, controle operacional e visão financeira em um só lugar.
        </p>
      </header>

      <main className="container mx-auto flex justify-center w-full max-w-4xl px-4">
        {isLoadingPage ? (
          <Card className="shadow-xl w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-center mb-3">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <CardTitle className="text-xl text-primary text-center">Carregando...</CardTitle>
              <CardDescription className="text-sm text-center">Verificando informações.</CardDescription>
            </CardHeader>
          </Card>
        ) : user ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            <div className="theme-consultor">
              <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full h-full flex flex-col">
                <CardHeader>
                  <Lightbulb className="h-10 w-10 text-primary mb-3" />
                  <CardTitle className="text-xl text-primary">Consultor IA</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">Diagnóstico e planejamento estratégico para o seu negócio.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/consultor">
                      Acessar Consultor <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
            
            <div className="theme-operacional">
              <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full h-full flex flex-col">
                <CardHeader>
                  <Briefcase className="h-10 w-10 text-primary mb-3" />
                  <CardTitle className="text-xl text-primary">Maestro Operacional</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">Gerencie suas vendas, agenda, clientes e ordens de serviço.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/operacional">
                      Acessar Operacional <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="theme-financeiro">
              <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full h-full flex flex-col">
                <CardHeader>
                  <TrendingUp className="h-10 w-10 text-primary mb-3" />
                  <CardTitle className="text-xl text-primary">Visão Clara Financeira</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">Controle suas finanças, defina metas e precifique com inteligência.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/financeiro">
                      Acessar Financeiro <ArrowRight className="ml-2" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        ) : (
          <div className="theme-consultor">
            <Card className="shadow-xl hover:shadow-2xl transition-shadow w-full max-w-md flex flex-col">
              <CardHeader>
                <Lightbulb className="h-10 w-10 text-primary mb-3" />
                <CardTitle className="text-xl text-primary">Diagnóstico Inicial Gratuito</CardTitle>
                <CardDescription className="text-sm">Comece com uma análise estratégica para destravar o potencial do seu negócio.</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
                  <li>Descubra insights personalizados.</li>
                  <li>Receba um direcionamento claro.</li>
                  <li>Primeiro passo para o sucesso.</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/consultor/consultation">
                    Iniciar Diagnóstico Gratuito <ArrowRight className="ml-2" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
