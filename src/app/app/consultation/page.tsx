
"use client";

import React, { useEffect, useRef } from "react";
import { useConsultationContext } from "@/contexts/ConsultationContext";
import { WelcomeScreen } from "@/components/consultation/WelcomeScreen";
import { InitialForm } from "@/components/consultation/InitialForm";
import { QuestionCard } from "@/components/consultation/QuestionCard";
import { AnswerForm } from "@/components/consultation/AnswerForm";
import { FeedbackCard } from "@/components/consultation/FeedbackCard";
import { TypingIndicator } from "@/components/consultation/TypingIndicator";
import { StageCompletionScreen } from "@/components/consultation/StageCompletionScreen";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle, RotateCcw, FileText, Bot, MessageSquare, Target, ArrowRight, Sparkles, PieChart, Lightbulb, ExternalLink } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


export default function ConsultationFlowPage() {
  const { user, loading: authLoading, hasCompletedConsultation, checkingConsultationStatus } = useAuth();
  const router = useRouter();
  const context = useConsultationContext();
  const { toast } = useToast(); // Adicionado para usar toast se necessário

  const scrollRef = useRef<HTMLDivElement>(null);

  // Efeito para redirecionar com base no estado de autenticação e consulta
  useEffect(() => {
    if (authLoading) {
      return; // Aguarda a autenticação carregar
    }

    if (!user) { // Se, após o carregamento da autenticação, não houver usuário
      router.replace('/login?redirect=/consultation');
      return;
    }

    // Se o usuário está logado, mas ainda verificando o status da consulta ou o status é indeterminado
    if (checkingConsultationStatus || hasCompletedConsultation === null) {
      return; // Aguarda a verificação do status da consulta
    }

    // Se o usuário já completou a consulta
    if (hasCompletedConsultation) {
      router.replace('/dashboard');
    }
    // Caso contrário (usuário logado, status da consulta verificado, consulta não completada), permite ficar na página.
  }, [user, authLoading, hasCompletedConsultation, checkingConsultationStatus, router]);

  // Lógica de carregamento ANTES de tentar renderizar qualquer parte da consulta
  if (authLoading) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Verificando sua identidade...</p>
        <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
      </div>
    );
  }

  // Se authLoading é false, mas não há usuário, o useEffect acima deve redirecionar.
  // Este é um loader para o caso de o redirecionamento ainda não ter acontecido ou se o usuário for deslogado.
  if (!user) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Redirecionando para login...</p>
        <p className="text-sm text-muted-foreground">Você precisa estar logado para iniciar o diagnóstico.</p>
      </div>
    );
  }
  
  // Se o usuário está logado, mas ainda verificando o status da consulta
  if (checkingConsultationStatus) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Verificando status da sua consulta...</p>
        <p className="text-sm text-muted-foreground">Aguarde um momento.</p>
      </div>
    );
  }
  
  // Se o usuário já completou a consulta, o useEffect acima deve redirecionar.
  // Este loader cobre o breve período antes do redirecionamento.
  if (hasCompletedConsultation) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Redirecionando para o painel...</p>
      </div>
    );
  }

  // Se o usuário está logado, não completou a consulta, e o status da consulta foi verificado,
  // mas o contexto da consulta (configurações, etc.) ainda não está pronto.
  if (!context || !context.isConfigReady) {
     return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Carregando configuração da consulta...</p>
        <p className="text-sm text-muted-foreground">Aguarde um momento, preparando o ambiente Maestro.</p>
      </div>
    );
  }

  // A partir daqui, todas as verificações passaram:
  // - Usuário está logado (user existe)
  // - Autenticação não está mais carregando (authLoading é false)
  // - Verificação do status da consulta não está mais carregando (checkingConsultationStatus é false)
  // - Usuário NÃO completou a consulta anteriormente (hasCompletedConsultation é false)
  // - Contexto da consulta está pronto (context.isConfigReady é true)
  // Podemos prosseguir com a lógica de renderização da consulta.
  
  const {
    state,
    initialFormConfig,
    currentQuestion,
    currentBlockConfig,
    handleAnswerSubmit,
    proceedToNextStep,
    isLastBlock,
    dispatch,
    finalDiagnosisDisplayConfig,
    consultantName,
    consultorMaestroData,
    blocksConfig,
    isLastQuestionInBlock,
  } = context;


  const {
    isLoading,
    userAnswers,
    aiFeedbacks,
    currentView,
    finalDiagnosisParts,
    showTypingIndicator,
    initialFormCompleted,
  } = state;


  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [userAnswers, aiFeedbacks, showTypingIndicator, currentView, finalDiagnosisParts]);


  const currentAnswer = currentQuestion ? userAnswers[currentQuestion.id] : null;
  const currentFeedback = currentQuestion ? aiFeedbacks[currentQuestion.id] : null;

  const handleActualRestart = () => {
    dispatch({ type: 'RESTART_CONSULTATION' });
    // setIsRestartAlertOpen(false); // Comentado pois isRestartAlertOpen não está definido aqui
  };

  // Welcome Screen View
  if (currentView === 'welcome') {
    return <WelcomeScreen />;
  }

  // Initial Form View
  if (currentView === 'initial_form' && initialFormConfig) {
    return <InitialForm />;
  }
  
  if (isLoading && currentView === 'initial_form' && !initialFormCompleted) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Processando formulário inicial...</p>
      </div>
    );
  }

  // Generating Final Diagnosis View
  if (currentView === 'generating_final_diagnosis') {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Bot className="h-16 w-16 text-primary mb-6 animate-pulse" />
        <p className="text-xl font-semibold">{consultantName} está preparando seu diagnóstico final...</p>
        <p className="text-muted-foreground">Isso pode levar alguns instantes.</p>
      </div>
    );
  }

  // Final Summary View (shows the AI-generated diagnosis parts)
  if (currentView === 'final_summary' && finalDiagnosisDisplayConfig && consultorMaestroData) {
    const finalMessages = consultorMaestroData.finalizacao_geral;
    return (
      <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center py-12 px-4">
        <Card className="w-full shadow-2xl bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <CheckCircle className="h-12 w-12" />
            </div>
            <CardTitle className="text-4xl font-bold text-primary">{finalDiagnosisDisplayConfig.titulo_geral}</CardTitle>
            <CardDescription className="text-xl text-muted-foreground mt-2">
              {finalDiagnosisDisplayConfig.descricao_geral}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-left">
            {finalMessages?.mensagem_parabens && <p className="text-lg font-semibold text-primary">{finalMessages.mensagem_parabens}</p>}
            
            <ScrollArea className="h-[300px] p-1 mb-6 border rounded-md">
              <div className="space-y-6 p-3">
                {finalDiagnosisDisplayConfig.partes_estrutura.map((partStructure, index) => {
                  const diagnosisContent = finalDiagnosisParts.find(dp => dp.partId === partStructure.id_parte);
                  return (
                    <details key={`diag-part-${index}`} className="rounded-lg border p-4 bg-background shadow-sm" open>
                      <summary className="cursor-pointer text-xl font-semibold text-primary mb-3 flex items-center">
                        <FileText size={22} className="mr-3 text-primary/80" />
                        {partStructure.titulo_parte}
                      </summary>
                      {isLoading && !diagnosisContent ? (
                        <div className="ml-9 mt-2 space-y-3 border-l-2 border-primary/20 pl-4">
                           <Loader2 className="h-6 w-6 animate-spin text-primary" />
                           <p className="text-sm text-muted-foreground">Gerando conteúdo...</p>
                        </div>
                      ) : diagnosisContent ? (
                        <div className="ml-9 mt-2 space-y-3 border-l-2 border-primary/20 pl-4">
                           <div className="rounded-md border bg-secondary/30 dark:bg-secondary/20 p-3">
                            <h4 className="font-medium text-md text-foreground flex items-center mb-1"><MessageSquare size={18} className="mr-2 text-primary" />Análise do Consultor {consultantName}:</h4>
                            <p className="text-sm whitespace-pre-wrap">{diagnosisContent.content}</p>
                           </div>
                        </div>
                      ) : (
                        <p className="ml-9 text-sm text-red-500">Conteúdo para esta parte não encontrado.</p>
                      )}
                    </details>
                  );
                })}
              </div>
            </ScrollArea>
             {finalMessages?.mensagem_proximos_passos && <p className="text-md mb-6">{finalMessages.mensagem_proximos_passos}</p>}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 pt-8 border-t">
            <Button onClick={proceedToNextStep} size="lg" className="shadow-md">
                Ver Meus Próximos Passos
                <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </CardFooter>
        </Card>
         <div ref={scrollRef} />
      </div>
    );
  }

  // Module Recommendation View (Lobby)
  if (currentView === 'module_recommendation' && consultorMaestroData) {
    const finalMessages = consultorMaestroData.finalizacao_geral;
    return (
      <div className="container mx-auto flex max-w-3xl flex-col items-center justify-center py-12 px-4">
        <Card className="w-full shadow-2xl bg-card">
          <CardHeader className="text-center">
             <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Lightbulb className="h-12 w-12" />
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold text-primary">Seu Diagnóstico está Pronto! E agora?</CardTitle>
            <CardDescription className="text-lg md:text-xl text-muted-foreground mt-2">
              {consultantName} analisou suas respostas. Use esses insights para impulsionar seu negócio!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-left px-4 md:px-8">
             <p className="text-center text-lg font-medium text-foreground">
                Este diagnóstico é o seu ponto de partida para um crescimento estratégico.
             </p>

              <Alert className="bg-green-100 dark:bg-green-900/30 border-green-500 dark:border-green-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-green-700 dark:text-green-400" />
                <AlertTitle className="text-xl font-semibold text-green-800 dark:text-green-300">Transforme Insights em Ação!</AlertTitle>
                <AlertDescription className="text-green-700 dark:text-green-400 mt-2">
                  Agora que você tem um panorama claro, utilize as ferramentas do Gestor Maestro para colocar seu plano em prática e acompanhar sua evolução.
                </AlertDescription>
              </Alert>

              <p className="text-md text-muted-foreground mt-4">
                Sugerimos os seguintes próximos passos:
              </p>

              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <Button variant="outline" size="lg" asChild className="w-full">
                  <Link href="/dashboard">
                    <PieChart className="mr-2 h-5 w-5" /> Ir para o Painel
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild className="w-full">
                  <Link href="/goals">
                    <Target className="mr-2 h-5 w-5" /> Definir Metas com IA
                  </Link>
                </Button>
              </div>
              
              <div className="pt-4">
                <p className="text-md text-muted-foreground text-center mb-3">
                    Para otimizar suas operações e finanças, explore nossos módulos de gestão:
                </p>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                    <Button variant="secondary" size="lg" asChild className="w-full">
                        <Link href="https://studio--maestro-operacional.us-central1.hosted.app">
                            <ExternalLink className="mr-2 h-5 w-5" /> Conhecer Maestro Operacional
                        </Link>
                    </Button>
                    <Button variant="secondary" size="lg" asChild className="w-full">
                        <Link href="https://studio--financeflow-ywslc.us-central1.hosted.app">
                            <ExternalLink className="mr-2 h-5 w-5" /> Conhecer Visão Clara Financeira
                        </Link>
                    </Button>
                </div>
              </div>
               
              {finalMessages?.call_to_action_app && <p className="text-sm text-center text-muted-foreground pt-6">{finalMessages.call_to_action_app}</p>}
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 pt-8 border-t px-4 md:px-8">
             <p className="text-xs text-muted-foreground">
                Lembre-se: o sucesso é uma jornada de melhoria contínua. Estamos aqui para te apoiar!
             </p>
          </CardFooter>
        </Card>
         <div ref={scrollRef} />
      </div>
    );
  }
  
  // Block Comment View
  if (currentView === 'block_comment' && currentBlockConfig) {
    return (
      <StageCompletionScreen
        blockComment={currentBlockConfig.comentario_final_bloco}
        blockTheme={currentBlockConfig.tema}
        blockNumber={currentBlockConfig.index + 1}
        onProceed={proceedToNextStep}
        isLastBlock={isLastBlock}
        isLoading={isLoading}
      />
    );
  }

  // Fallback para carregamento da primeira pergunta se outras condições de tela não foram atendidas
  // Esta condição só será alcançada se o usuário estiver logado, a consulta não estiver completa,
  // e o context estiver pronto, mas a view ainda não for uma das específicas acima.
  if (isLoading && initialFormCompleted && !currentQuestion && currentView !== 'block_comment' && currentView !== 'final_summary' && currentView !== 'module_recommendation' && !showTypingIndicator && state.currentBlockIndex === 0 && state.currentQuestionIndexInBlock === 0) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Carregando primeira pergunta...</p>
        <p className="text-muted-foreground">Preparando tudo para você.</p>
      </div>
    );
  }
  
  // Se a view é 'question', mas currentQuestion ou currentBlockConfig são nulos (não deveria acontecer após os loaders)
  if (currentView === 'question' && (!currentQuestion || !currentBlockConfig || !blocksConfig)) {
    return (
      <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Ajustando a sala de consulta...</p>
        <p className="text-sm text-muted-foreground mt-2">Se esta tela persistir, algo inesperado ocorreu. Tente recarregar.</p>
      </div>
    );
  }

  // Main Question View (renderiza apenas se currentQuestion e currentBlockConfig estiverem definidos)
  if (currentView === 'question' && currentQuestion && currentBlockConfig && blocksConfig) {
    return (
      <div className="flex h-full flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-6">
          <QuestionCard question={currentQuestion} blockConfig={currentBlockConfig} totalBlocks={blocksConfig?.length || 3} />
          
          {!currentAnswer && !isLoading && ( // Removido currentView === 'question' pois já está dentro desse if
            <AnswerForm 
              onSubmit={handleAnswerSubmit} 
              isLoading={isLoading}
              questionId={currentQuestion.id}
            />
          )}

          {currentFeedback && ( // Removido currentView === 'question'
            <FeedbackCard 
              feedback={currentFeedback} 
              isLoading={false} 
              consultantName={consultantName}
            />
          )}
          
          {showTypingIndicator && <TypingIndicator />} {/* Removido currentView === 'question' */}

          {currentFeedback && !isLoading && ( // Removido currentView === 'question'
            <div className="mt-6 flex justify-end">
              <Button 
                onClick={proceedToNextStep} 
                disabled={isLoading}
                size="lg"
                className="shadow-md hover:shadow-lg transition-shadow"
              >
                {isLastQuestionInBlock ? (isLastBlock ? "Ver Diagnóstico Final" : "Finalizar Bloco") : "Próxima Pergunta"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          )}
          
          <div ref={scrollRef} />
        </div>
      </div>
    );
  }

  // Fallback final, caso nenhuma condição de renderização seja atendida.
  // Isso pode indicar um estado inconsistente ou um caso não tratado.
  return (
     <div className="flex h-full min-h-[calc(100vh-150px)] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Carregando...</p>
        <p className="text-sm text-muted-foreground mt-2">Aguarde um momento.</p>
      </div>
  );
}
    

