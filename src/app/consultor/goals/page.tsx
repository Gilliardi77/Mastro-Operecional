
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ChevronLeft, Target, Loader2, Wand2, Bot, Info, Briefcase, Save, AlertTriangle, Database, MessageCircleQuestion, DollarSign, Activity, TrendingUp, Banknote, Lightbulb, Search, Scissors, CalendarCheck } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormField, FormItem, FormLabel, FormMessage, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateGoalsAnalysis } from "@/ai/flows/generate-goals-analysis-flow";
import type { GenerateGoalsAnalysisInput, GenerateGoalsAnalysisOutput } from "@/ai/flows/generate-goals-analysis-flow";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentMonthFinancialSummary } from '@/services/financialSummaryService';
import { getSuggestedTargetRevenue, getUserBusinessSegment } from '@/services/userStrategicDataService';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";


const numberPreprocess = (val: unknown) => {
  if (val === "" || val === undefined || val === null) return undefined;
  const strVal = String(val).trim();
  if (strVal === "") return undefined;
  const num = Number(String(val).replace(/[^0-9.]/g, "")); // Garantir que a conversão para string ocorra
  return isNaN(num) ? undefined : num;
};


const goalsFormSchema = z.object({
  currentRevenue: z.preprocess(numberPreprocess, z.number({ required_error: "Receita atual é obrigatória.", invalid_type_error: "Receita deve ser um número." }).nonnegative({ message: "Receita não pode ser negativa." })),
  currentExpenses: z.preprocess(numberPreprocess, z.number({ required_error: "Despesas atuais são obrigatórias.", invalid_type_error: "Despesas devem ser um número." }).nonnegative({ message: "Despesas não podem ser negativas." })),
  targetRevenueGoal: z.preprocess(numberPreprocess, z.number({ required_error: "Meta de receita é obrigatória.", invalid_type_error: "Meta deve ser um número." }).positive({ message: "Meta deve ser positiva." })),
  businessSegment: z.string().optional(),
  userScenario: z.string().min(10, { message: "Descreva seu cenário ou pergunta com mais detalhes (mín. 10 caracteres)." }).max(1000, { message: "Cenário muito longo (máx. 1000 caracteres)." }),
  ticketMedioAtual: z.preprocess(numberPreprocess, z.number({ invalid_type_error: "Ticket médio deve ser um número."}).positive({message: "Ticket médio deve ser positivo."}).optional()),
  taxaConversaoOrcamentos: z.preprocess(numberPreprocess, z.number({ invalid_type_error: "Taxa de conversão deve ser um número."}).min(0, {message: "Taxa de conversão não pode ser negativa."}).max(100, {message: "Taxa de conversão não pode ser maior que 100."}).optional()),
  principaisFontesReceita: z.string().max(500, {message: "Descrição das fontes de receita muito longa (máx. 500 caracteres)."}).optional(),
  maioresCategoriasDespesa: z.string().max(500, {message: "Descrição das categorias de despesa muito longa (máx. 500 caracteres)."}).optional(),
  saldoCaixaAtual: z.preprocess(numberPreprocess, z.number({ invalid_type_error: "Saldo em caixa deve ser um número."}).optional()),
});

type GoalsFormValues = z.infer<typeof goalsFormSchema>;

const businessSegments = [
  "Comércio Varejista (Loja Física)", "Comércio Varejista (Online/E-commerce)", "Serviços (Profissional Liberal)", "Serviços (Agência/Consultoria)",
  "Serviços (Beleza e Estética)", "Serviços (Educação/Cursos)", "Serviços (Reparos/Manutenção)", "Alimentação (Restaurante/Café)",
  "Alimentação (Delivery/Marmitas)", "Manufatura/Pequena Indústria", "Artesanato/Produtos Personalizados", "Saúde e Bem-estar", "Tecnologia/Software", "Outro",
];

export default function StrategicPlanningPage() {
  const [isSubmittingAnalysis, setIsSubmittingAnalysis] = useState(false);
  const [isImportingRealData, setIsImportingRealData] = useState(false);
  const [isPreloadingData, setIsPreloadingData] = useState(true); // Começa como true
  const [analysisResult, setAnalysisResult] = useState<GenerateGoalsAnalysisOutput | null>(null);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsFormSchema),
    defaultValues: {
      currentRevenue: undefined, currentExpenses: undefined, targetRevenueGoal: undefined,
      businessSegment: "", userScenario: "",
      ticketMedioAtual: undefined, taxaConversaoOrcamentos: undefined,
      principaisFontesReceita: "", maioresCategoriasDespesa: "", saldoCaixaAtual: undefined,
    },
  });

  // Efeito para buscar dados iniciais ao carregar a página
  useEffect(() => {
    const preloadFormData = async () => {
      if (!user) {
        if (isMountedRef.current) setIsPreloadingData(false); // Para de carregar se não há usuário
        return;
      }

      if (isMountedRef.current) setIsPreloadingData(true);
      toast({ title: "Buscando dados...", description: "Estamos buscando suas informações financeiras e de perfil.", duration: 3000 });

      try {
        const [summary, suggestedRevenue, segment] = await Promise.all([
          getCurrentMonthFinancialSummary(user.uid),
          getSuggestedTargetRevenue(user.uid),
          getUserBusinessSegment(user.uid)
        ]);

        if (isMountedRef.current) {
          let preloadedFields = 0;
          if (summary) {
            form.setValue("currentRevenue", summary.currentRevenue, { shouldValidate: true });
            form.setValue("currentExpenses", summary.currentExpenses, { shouldValidate: true });
            if (summary.currentRevenue > 0 || summary.currentExpenses > 0) preloadedFields++;
          }
          if (suggestedRevenue !== null && suggestedRevenue > 0) {
            form.setValue("targetRevenueGoal", suggestedRevenue, { shouldValidate: true });
            preloadedFields++;
          }
          if (segment) {
            form.setValue("businessSegment", segment, { shouldValidate: true });
            preloadedFields++;
          }

          if (preloadedFields > 0) {
            toast({ title: "Dados pré-carregados!", description: "Alguns campos foram preenchidos com suas informações.", duration: 5000 });
          } else {
            toast({ title: "Pronto para começar!", description: "Preencha os campos para iniciar sua análise estratégica.", duration: 5000 });
          }
        }
      } catch (error: any) {
        console.error("Erro ao pré-carregar dados do formulário:", error);
        if (isMountedRef.current) {
          toast({ title: "Erro ao buscar dados", description: "Não foi possível buscar todos os dados para pré-preenchimento.", variant: "destructive" });
        }
      } finally {
        if (isMountedRef.current) setIsPreloadingData(false);
      }
    };

    if (!authLoading && user) {
        preloadFormData();
    } else if (!authLoading && !user) {
        setIsPreloadingData(false); // Finaliza o preloading se não houver usuário logado
    }
  }, [user, authLoading, form, toast]);

  const handleImportRealData = async () => {
    if (!user) {
      toast({ title: "Login Necessário", description: "Você precisa estar logado para importar dados reais.", variant: "destructive"});
      return;
    }
    if (isMountedRef.current) setIsImportingRealData(true);
    try {
      const summary = await getCurrentMonthFinancialSummary(user.uid);
      if (isMountedRef.current) {
        form.setValue("currentRevenue", summary.currentRevenue, { shouldValidate: true });
        form.setValue("currentExpenses", summary.currentExpenses, { shouldValidate: true });
        toast({ title: "Dados Reais Importados!", description: "Receita e despesas do mês atual foram carregadas."});
      }
    } catch (error: any) {
      console.error("Erro ao importar dados reais:", error);
      if (isMountedRef.current) {
        toast({ title: "Erro ao Importar Dados", description: error.message || "Não foi possível buscar seus dados financeiros.", variant: "destructive"});
      }
    } finally {
      if (isMountedRef.current) {
        setIsImportingRealData(false);
      }
    }
  };

  async function onSubmit(data: GoalsFormValues) {
    if (isMountedRef.current) setIsSubmittingAnalysis(true);
    if (isMountedRef.current) setAnalysisResult(null);
    try {
      const input: GenerateGoalsAnalysisInput = {
        currentRevenue: data.currentRevenue,
        currentExpenses: data.currentExpenses,
        targetRevenueGoal: data.targetRevenueGoal,
        businessSegment: data.businessSegment,
        userQuestion: data.userScenario,
        ticketMedioAtual: data.ticketMedioAtual,
        taxaConversaoOrcamentos: data.taxaConversaoOrcamentos,
        principaisFontesReceita: data.principaisFontesReceita,
        maioresCategoriasDespesa: data.maioresCategoriasDespesa,
        saldoCaixaAtual: data.saldoCaixaAtual,
      };
      const generatedAnalysis = await generateGoalsAnalysis(input);
      if (isMountedRef.current) {
        setAnalysisResult(generatedAnalysis);
        toast({ title: "Planejamento Estratégico Gerado!", description: "Sua consultoria está pronta. Revise abaixo." });

        if (generatedAnalysis && user && db) {
          await addDoc(collection(db, "userGoals"), { 
            userId: user.uid, createdAt: serverTimestamp(), inputData: data, 
            analysisResult: generatedAnalysis, status: 'active', type: 'strategic_planning',
          });
          toast({ title: "Planejamento Salvo!", description: "Seu planejamento estratégico foi salvo com sucesso." });
        } else if (!user && !authLoading && isMountedRef.current) { 
           toast({ title: "Atenção: Planejamento Não Salvo", description: "Você precisa estar logado para salvar o planejamento. Faça login e tente gerar novamente.", variant: "default", duration: 7000 });
        }
      }
    } catch (error: any) {
      console.error("Erro ao gerar planejamento estratégico:", error);
      if (isMountedRef.current) {
        toast({ title: "Erro na Análise", description: error.message || "Não foi possível gerar o planejamento. Tente novamente.", variant: "destructive" });
      }
    } finally {
      if (isMountedRef.current) {
        setIsSubmittingAnalysis(false);
      }
    }
  }

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "N/A";
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  type Difficulty = 'Fácil' | 'Moderado' | 'Difícil' | 'Desafiador';
  const getBadgeVariant = (difficulty: Difficulty): "default" | "secondary" | "outline" | "destructive" => {
    switch (difficulty) {
      case 'Fácil': return 'default';
      case 'Moderado': return 'secondary';
      case 'Difícil': return 'outline';
      case 'Desafiador': return 'destructive';
      default: return 'default';
    }
  };


  if (authLoading || isPreloadingData) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-background to-secondary/10 flex flex-col items-center pt-16 pb-24 px-4">
        <div className="w-full max-w-4xl space-y-8">
            <Skeleton className="h-9 w-48 mb-6" />
            <Card className="shadow-xl">
                <CardHeader className="items-center text-center border-b pb-4">
                <Skeleton className="h-12 w-12 rounded-full mb-3" />
                <Skeleton className="h-8 w-3/4 mb-2" />
                <Skeleton className="h-5 w-full max-w-md" />
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                <Skeleton className="h-20 w-full" />
                <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
                <Skeleton className="h-10 w-1/2 mx-auto" />
                </CardContent>
            </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-background to-secondary/10 flex flex-col items-center pt-16 pb-24 px-4">
      <div className="w-full max-w-5xl space-y-8">
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" asChild>
            <Link href="/consultor">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para o Módulo Consultor
            </Link>
          </Button>
        </div>

        <Card className="shadow-xl">
          <CardHeader className="items-center text-center border-b pb-4">
            <Lightbulb className="h-12 w-12 text-primary mb-3" />
            <CardTitle className="text-3xl font-bold text-primary">
              Planejamento Estratégico com IA
            </CardTitle>
            <CardDescription className="text-md text-muted-foreground max-w-3xl mx-auto">
              Forneça dados do seu negócio, descreva seu cenário e deixe nossa IA traçar um diagnóstico e um plano de ação para você.
            </CardDescription>
          </CardHeader>
          {!user && !authLoading && (
            <CardContent className="pt-6">
                 <Alert variant="default" className="bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-900/30 dark:border-amber-600 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold">Funcionalidade Limitada</AlertTitle>
                    <AlertDescription>
                        Você pode gerar a análise, mas para salvar seu planejamento, é necessário estar logado.
                        <Button variant="link" asChild className="p-0 h-auto ml-1 text-amber-700 dark:text-amber-300 hover:underline">
                         <Link href="/login?redirect=/goals">Fazer Login</Link>
                        </Button>
                        {' '}ou
                        <Button variant="link" asChild className="p-0 h-auto ml-1 text-amber-700 dark:text-amber-300 hover:underline">
                         <Link href="/register?redirect=/goals">Registre-se</Link>
                        </Button>
                        .
                    </AlertDescription>
                </Alert>
            </CardContent>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="pt-6 space-y-8">
                <Alert variant="default" className="bg-primary/5 border-primary/20">
                  {isPreloadingData && user ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Search className="h-5 w-5 text-primary" /> }
                  <AlertTitle className="text-primary font-semibold">
                    {isPreloadingData && user ? "Buscando seus dados..." : "Como funciona?"}
                  </AlertTitle>
                  <AlertDescription className="text-sm space-y-1">
                    {isPreloadingData && user ? 
                     <p>Aguarde enquanto buscamos suas informações financeiras e de perfil para pré-preencher o formulário.</p> 
                     : 
                     <>
                       <p>Preencha os dados financeiros ou use "Importar Dados Reais" para buscar as informações do mês atual. Depois, descreva seu cenário e, opcionalmente, outros indicadores. Quanto mais detalhes, mais precisa será a consultoria da IA.</p>
                     </>
                    }
                  </AlertDescription>
                </Alert>

                <div className="grid md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="currentRevenue" render={({ field }) => ( <FormItem> <FormLabel>Receita Atual (Mensal)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 5000" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="currentExpenses" render={({ field }) => ( <FormItem> <FormLabel>Despesas Atuais (Mensal)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 2000" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField control={form.control} name="targetRevenueGoal" render={({ field }) => ( <FormItem> <FormLabel>Meta de Receita (Mensal)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 8000" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6 items-start">
                    <FormField control={form.control} name="userScenario" render={({ field }) => ( <FormItem> <FormLabel>Seu Cenário, Dores e Objetivos para a IA</FormLabel> <FormControl><Textarea placeholder="Descreva o que você quer alcançar, seus principais desafios, ou qual pergunta específica tem sobre seu negócio e metas." rows={6} className="bg-background" {...field} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)}/></FormControl> <FormMessage /> </FormItem> )}/>
                    <FormField
                      control={form.control}
                      name="businessSegment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento do Negócio (Opcional)</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value} 
                            disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o segmento" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {businessSegments.map(segment => (
                                <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>

                <div>
                    <h3 className="text-lg font-medium text-primary mb-4">Informações Adicionais (Opcional, para análise mais rica)</h3>
                    <div className="grid md:grid-cols-3 gap-6">
                        <FormField control={form.control} name="ticketMedioAtual" render={({ field }) => ( <FormItem> <FormLabel>Ticket Médio Atual (R$)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 150" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="taxaConversaoOrcamentos" render={({ field }) => ( <FormItem> <FormLabel>Taxa de Conversão (%)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 30" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="saldoCaixaAtual" render={({ field }) => ( <FormItem> <FormLabel>Saldo em Caixa Atual (R$)</FormLabel> <FormControl><Input type="text" placeholder="Ex: 2000" {...field} onChange={e => field.onChange(e.target.value.replace(/[^0-9.]/g, ""))} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)} /></FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6 mt-6">
                        <FormField control={form.control} name="principaisFontesReceita" render={({ field }) => ( <FormItem> <FormLabel>Principais Fontes de Receita</FormLabel> <FormControl><Textarea placeholder="Ex: Venda do Produto A, Serviço B" rows={3} {...field} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)}/></FormControl> <FormMessage /> </FormItem> )}/>
                        <FormField control={form.control} name="maioresCategoriasDespesa" render={({ field }) => ( <FormItem> <FormLabel>Maiores Categorias de Despesa</FormLabel> <FormControl><Textarea placeholder="Ex: Aluguel, Fornecedores, Marketing" rows={3} {...field} disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)}/></FormControl> <FormMessage /> </FormItem> )}/>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={handleImportRealData} className="w-full sm:w-auto" disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user) || !user}> {isImportingRealData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />} Importar (Dados Reais) </Button>
                  <Button type="submit" className="w-full sm:flex-grow" disabled={isSubmittingAnalysis || isImportingRealData || (isPreloadingData && user)}> {isSubmittingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />} Gerar Consultoria Estratégica </Button>
                </div>
              </CardContent>
            </form>
          </Form>

          {isSubmittingAnalysis && !analysisResult && (
            <div className="text-center py-10">
              <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
              <p className="text-lg font-semibold text-primary">Maestro IA está elaborando sua consultoria estratégica...</p>
              <p className="text-sm text-muted-foreground">Isso pode levar alguns instantes.</p>
            </div>
          )}

          {analysisResult && (
            <CardFooter className="flex-col items-start gap-6 pt-8 border-t">
              <h3 className="text-2xl font-semibold text-primary mb-2 flex items-center">
                <Bot className="mr-3 h-8 w-8" /> Consultoria Estratégica do Maestro IA
              </h3>
              
              {/* Resumo Financeiro */}
              <Card className="w-full bg-primary/5 border-primary/20 shadow-md">
                <CardHeader>
                  <CardTitle className="text-xl text-primary flex items-center"><Briefcase className="mr-2 h-5 w-5"/>Resumo Financeiro e Metas</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
                  <div><p className="font-semibold">Lucro Atual</p><p className={analysisResult.currentProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{formatCurrency(analysisResult.currentProfit)}</p></div>
                  <div><p className="font-semibold">Meta de Receita</p><p>{formatCurrency(form.getValues("targetRevenueGoal"))}</p></div>
                  <div><p className="font-semibold">Lucro na Meta</p><p className={analysisResult.targetProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>{formatCurrency(analysisResult.targetProfit)}</p></div>
                  <div><p className="font-semibold">Aumentar Receita em</p><p className="text-amber-600 dark:text-amber-400">{formatCurrency(analysisResult.revenueGap)}</p></div>
                </CardContent>
              </Card>

              {/* Diagnóstico */}
              {analysisResult.businessDiagnosis && (
                <Card className="w-full shadow-md">
                  <CardHeader> <CardTitle className="text-xl text-primary flex items-center"><Activity className="mr-2 h-5 w-5"/>Diagnóstico do Negócio</CardTitle> </CardHeader>
                  <CardContent> <p className="text-md whitespace-pre-wrap leading-relaxed">{analysisResult.businessDiagnosis}</p> </CardContent>
                </Card>
              )}
              
              {/* Análise da Meta */}
              <Card className="w-full shadow-md">
                  <CardHeader>
                      <CardTitle className="text-xl text-primary flex items-center">
                          <Target className="mr-2 h-5 w-5"/> Análise da sua Meta
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div className="flex items-center gap-4">
                          <p className="font-semibold">Nível de Dificuldade:</p>
                          <Badge variant={getBadgeVariant(analysisResult.goalDifficulty)}>{analysisResult.goalDifficulty}</Badge>
                      </div>
                      <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                          {analysisResult.goalJustification}
                      </blockquote>
                  </CardContent>
              </Card>

              {/* Plano Semanal */}
              <Card className="w-full shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl text-primary flex items-center">
                        <CalendarCheck className="mr-2 h-5 w-5"/> Plano de Ação Semanal
                    </CardTitle>
                    <CardDescription>Um plano para o mês vigente para alcançar sua meta.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
                        {analysisResult.weeklyBreakdown.map((week, index) => (
                            <AccordionItem value={`item-${index}`} key={index}>
                                <AccordionTrigger className="text-lg font-medium">{week.week}</AccordionTrigger>
                                <AccordionContent>
                                    <ul className="list-disc pl-5 space-y-2 text-md">
                                        {week.tasks.map((task, taskIndex) => <li key={taskIndex}>{task}</li>)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
              </Card>
              
              {/* Alavancas de Crescimento */}
              <div className="w-full grid md:grid-cols-2 gap-6">
                  {analysisResult.costReductionSuggestions && analysisResult.costReductionSuggestions.length > 0 && (
                      <Card className="shadow-md border-orange-500 bg-orange-50 dark:bg-orange-900/30 dark:border-orange-700">
                          <CardHeader>
                              <CardTitle className="text-xl text-orange-700 dark:text-orange-300 flex items-center">
                                  <Scissors className="mr-2 h-5 w-5"/>Redução de Custos
                              </CardTitle>
                          </CardHeader>
                          <CardContent>
                              <ul className="list-disc pl-5 space-y-2 text-md text-orange-800 dark:text-orange-200">
                                  {analysisResult.costReductionSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                          </CardContent>
                      </Card>
                  )}
                  {analysisResult.strategicSuggestions && analysisResult.strategicSuggestions.length > 0 && (
                      <Card className="shadow-md border-purple-500 bg-purple-50 dark:bg-purple-900/30 dark:border-purple-700">
                          <CardHeader>
                              <CardTitle className="text-xl text-purple-700 dark:text-purple-300 flex items-center">
                                  <TrendingUp className="mr-2 h-5 w-5"/>Sugestões Estratégicas
                              </CardTitle>
                          </CardHeader>
                          <CardContent>
                              <ul className="list-disc pl-5 space-y-2 text-md text-purple-800 dark:text-purple-200">
                                  {analysisResult.strategicSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                              </ul>
                          </CardContent>
                      </Card>
                  )}
              </div>
              
              {/* Alertas Preventivos */}
              {analysisResult.preventiveAlerts && analysisResult.preventiveAlerts.length > 0 && (
                <Alert variant="destructive" className="shadow-md w-full">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertTitle className="text-xl">Alertas Importantes!</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {analysisResult.preventiveAlerts.map((alertText, index) => ( <li key={index}>{alertText}</li> ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
