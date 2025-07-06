
"use client";

import { useConsultationContext } from "@/contexts/ConsultationContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react"; 
import Image from 'next/image'; // Importar o componente Image

export function WelcomeScreen() {
  const { dispatch, consultorMaestroData, state } = useConsultationContext();
  const consultantName = consultorMaestroData?.identidade?.nome || "Maestro";

  const handleStart = () => {
    dispatch({ type: 'GO_TO_INITIAL_FORM' });
  };

  return (
    <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center py-8 px-4 md:py-12">
      <Card className="w-full shadow-2xl bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 shadow-lg overflow-hidden">
            {/* Substituindo o ícone Sparkles pela imagem */}
            <Image
              src="/icons/logo sem fundo 120x120.png"
              alt="Logo Gestor Maestro"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <CardTitle className="text-2xl md:text-3xl font-bold text-primary">
            Bem-vindo(a) ao Diagnóstico {consultantName}!
          </CardTitle>
          <CardDescription className="mt-2 text-md md:text-lg text-muted-foreground">
            Uma análise inteligente e gratuita para impulsionar seu negócio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm md:text-base leading-relaxed px-4 md:px-6">
          <p>
            Olá! Sou {consultantName}, seu consultor de IA dedicado a ajudar pequenas empresas e profissionais liberais como você a prosperarem.
          </p>
          <p>
            Este diagnóstico rápido e <strong>totalmente gratuito</strong> foi desenhado para entendermos juntos o seu perfil de negócio. Ao responder algumas perguntas, poderei:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm md:text-base">
            <li>Analisar sua situação atual e seus principais desafios.</li>
            <li>Identificar oportunidades de melhoria e crescimento.</li>
            <li>Sugerir os módulos de gestão mais adequados para você aqui no nosso sistema.</li>
          </ul>
          <p className="font-semibold text-primary">
            Ao final, você receberá um diagnóstico inicial e, com total transparência, uma recomendação das nossas ferramentas e módulos que podem te ajudar a alcançar seus objetivos.
          </p>
          <p>
            Nosso objetivo é direcioná-lo(a) para a melhor combinação de soluções de gestão, seja para venda de produtos, serviços ou ambos, além de oferecer suporte em gestão financeira e definição de metas.
          </p>
        </CardContent>
        <CardFooter className="flex-col items-center gap-3 pt-6 md:pt-8 px-4 md:px-6">
          <Button onClick={handleStart} size="lg" className="w-full max-w-sm shadow-md hover:shadow-lg transition-shadow">
            Iniciar Diagnóstico Gratuito
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-xs text-muted-foreground">
            Tempo estimado: 5-7 minutos. Suas respostas são confidenciais.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
