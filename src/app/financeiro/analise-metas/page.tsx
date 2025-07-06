
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3, DollarSign, Percent, Target, Save, Calculator,
  Lightbulb, AlertTriangle, CheckCircle2, Info, Loader2, FileText, PieChart, CalendarDays, TrendingUp, RotateCw, MessageSquare, TrendingDown, RefreshCw, Settings, ExternalLink, HelpCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form, FormControl, FormField, FormItem,
  FormLabel, FormMessage, FormDescription
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import {
  doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp
} from 'firebase/firestore';
import {
  format, startOfMonth, endOfMonth, getYear, getMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { getActiveUserId } from '@/lib/authUtils';
import { getAllCustosFixosConfigurados } from '@/services/custoFixoConfiguradoService';
import type { LancamentoFinanceiro as LancamentoFinanceiroDoc } from '@/schemas/lancamentoFinanceiroSchema';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


const metasSchema = z.object({
  metaFaturamento: z.coerce.number().nonnegative().step(0.01).default(0),
  metaLucro: z.coerce.number().nonnegative().step(0.01).default(0),
  metaDespesaMaxima: z.coerce.number().nonnegative({ message: "Meta de despesa máxima deve ser não-negativa."}).step(0.01).optional().default(0),
  margemDesejada: z.coerce.number().min(0).max(100).step(0.01).default(0),
  margemContribuicaoMediaPercentual: z.coerce.number().min(0).max(100, { message: "Margem de contribuição deve ser entre 0 e 100." }).step(0.01).optional().default(0),
  descricaoMeta: z.string().optional().default('').describe("Descrição geral ou foco para as metas do mês."),
});

export type MetasFormValues = z.infer<typeof metasSchema>;

export interface MetasFinanceiras extends MetasFormValues {
  userId: string;
  anoMes: string;
  criadoEm?: Timestamp;
  atualizadoEm: Timestamp;
}

export interface LancamentoFinanceiro {
  id: string;
  valor: number;
  tipo: 'RECEITA' | 'DESPESA' | 'receita' | 'despesa';
  data: Date;
  status: 'pago' | 'recebido' | 'pendente';
}

const DIAS_UTEIS_PADRAO = 22;

export default function MetasFinanceirasForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [porcentagemMeta, setPorcentagemMeta] = useState(0);
  const [faturamentoAtual, setFaturamentoAtual] = useState(0);

  const [pontoDeEquilibrioCalculado, setPontoDeEquilibrioCalculado] = useState<number | string | null>(null);
  const [custoFixoDiarioCalculado, setCustoFixoDiarioCalculado] = useState<number | string | null>(null);

  const [custosFixosReaisConfigurados, setCustosFixosReaisConfigurados] = useState<number | null>(null);
  const [erroBuscaCustosReais, setErroBuscaCustosReais] = useState<string | null>(null);
  const [isLoadingCustosReais, setIsLoadingCustosReais] = useState(true);

  const activeUserId = useMemo(() => getActiveUserId(user), [user]);

  const defaultFormValues: MetasFormValues = useMemo(() => metasSchema.parse({}), []);
  
  const anoMesParaSalvar: string = useMemo(() => {
    const dataRef = new Date();
    return `${getYear(dataRef)}-${String(getMonth(dataRef) + 1).padStart(2, '0')}`;
  }, []);


  const form = useForm<MetasFormValues>({
    resolver: zodResolver(metasSchema),
    defaultValues: defaultFormValues
  });

  const watchedMargemContribuicao = form.watch('margemContribuicaoMediaPercentual');


  useEffect(() => {
    const custosFixos = custosFixosReaisConfigurados ?? 0;
    const margemContribuicao = typeof watchedMargemContribuicao === 'number' ? watchedMargemContribuicao : 0;

    if (custosFixos > 0) {
      setCustoFixoDiarioCalculado(custosFixos / DIAS_UTEIS_PADRAO);
    } else {
      setCustoFixoDiarioCalculado("Configure seus custos fixos.");
    }

    if (custosFixos > 0 && margemContribuicao > 0) {
      setPontoDeEquilibrioCalculado(custosFixos / (margemContribuicao / 100));
    } else if (custosFixos <= 0) {
      setPontoDeEquilibrioCalculado("Configure seus custos fixos.");
    } else {
      setPontoDeEquilibrioCalculado("Informe uma margem de contribuição média válida (>0%).");
    }
  }, [custosFixosReaisConfigurados, watchedMargemContribuicao]);


  const resetFormAndStates = useCallback(() => {
    form.reset(defaultFormValues);
    setFaturamentoAtual(0);
    setCustosFixosReaisConfigurados(null);
    setErroBuscaCustosReais(null);
    setPontoDeEquilibrioCalculado(null);
    setCustoFixoDiarioCalculado(null);
    setPorcentagemMeta(0);
  }, [form, defaultFormValues]);


  const fetchData = useCallback(async () => {
    if (!activeUserId) {
      resetFormAndStates();
      setIsLoadingForm(false);
      setIsFetchingData(false);
      setIsLoadingCustosReais(false);
      return;
    }

    setIsLoadingForm(true); 
    setIsFetchingData(true); 
    setIsLoadingCustosReais(true);
    setErroBuscaCustosReais(null);

    try {
      const systemDate = new Date(); 
      const inicioDoMes = startOfMonth(systemDate);
      const fimDoMes = endOfMonth(systemDate);
      const anoMesParaBusca = `${getYear(systemDate)}-${String(getMonth(systemDate) + 1).padStart(2, '0')}`;
      
      const docRefMetas = doc(db, 'metasFinanceiras', `${activeUserId}_${anoMesParaBusca}`);
      const docSnapMetas = await getDoc(docRefMetas);

      if (docSnapMetas.exists()) {
        const dados = docSnapMetas.data() as MetasFinanceiras;
        form.reset({
            metaFaturamento: dados.metaFaturamento || 0,
            metaLucro: dados.metaLucro || 0,
            metaDespesaMaxima: dados.metaDespesaMaxima || 0,
            margemDesejada: dados.margemDesejada || 0,
            margemContribuicaoMediaPercentual: dados.margemContribuicaoMediaPercentual || 0,
            descricaoMeta: dados.descricaoMeta || '',
        });
      } else {
        form.reset(defaultFormValues);
      }

      const qReceitasDoMes = query(
        collection(db, 'lancamentosFinanceiros'),
        where('userId', '==', activeUserId),
        where('tipo', 'in', ['RECEITA', 'receita']),
        where('status', 'in', ['recebido']),
        where('data', '>=', Timestamp.fromDate(inicioDoMes)),
        where('data', '<=', Timestamp.fromDate(fimDoMes))
      );

      const snapshotReceitas = await getDocs(qReceitasDoMes);
      let totalFaturamento = 0;
      snapshotReceitas.forEach(docData => {
          totalFaturamento += docData.data().valor || 0;
      });
      setFaturamentoAtual(totalFaturamento);

      if (user) {
        const idToken = await user.getIdToken();
        if (!idToken) {
            setErroBuscaCustosReais("ID Token não disponível para buscar custos.");
            setCustosFixosReaisConfigurados(null);
        } else {
            const custosFixosAtivos = await getAllCustosFixosConfigurados(idToken, false); 
            const totalCustosConfigurados = custosFixosAtivos.reduce((sum, custo) => sum + custo.valorMensal, 0);
            setCustosFixosReaisConfigurados(totalCustosConfigurados);
            setErroBuscaCustosReais(null); 
        }
      } else { 
        setCustosFixosReaisConfigurados(null);
        setErroBuscaCustosReais("Usuário não autenticado para buscar custos configurados.");
      }
    } catch (error) {
      console.error('Erro detalhado ao carregar dados da Análise de Metas:', error);
      const errorMessage = (error as Error).message;
      toast({ title: 'Erro ao Carregar Dados', description: `Não foi possível carregar todos os dados. ${errorMessage}`, variant: 'destructive' });
      if (String(error).includes("custos configurados") || String(error).includes("ID Token")) {
        setErroBuscaCustosReais(errorMessage);
        setCustosFixosReaisConfigurados(null);
      }
    } finally {
      setIsLoadingForm(false);
      setIsFetchingData(false);
      setIsLoadingCustosReais(false);
    }
  }, [activeUserId, form, toast, user, resetFormAndStates, defaultFormValues]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/analise-metas');
    } else if (!authLoading && activeUserId) {
      fetchData();
    }
  }, [authLoading, user, activeUserId, router, fetchData]);


  useEffect(() => {
    const meta = form.getValues('metaFaturamento');
    setPorcentagemMeta(meta > 0 ? Math.min(100, (faturamentoAtual / meta) * 100) : 0);
  }, [form, faturamentoAtual, form.watch('metaFaturamento')]);

  const onSubmit = async (values: MetasFormValues) => {
    if (!activeUserId) {
      toast({ title: 'Usuário não autenticado', description: 'Não é possível salvar as metas.', variant: 'destructive' });
      return;
    }
    setIsLoadingForm(true);
    
    const dataReferenciaParaSalvar = new Date();
    const anoMesParaSalvarDoc = `${getYear(dataReferenciaParaSalvar)}-${String(getMonth(dataReferenciaParaSalvar) + 1).padStart(2, '0')}`;

    const payload: MetasFinanceiras = {
      ...values,
      userId: activeUserId,
      anoMes: anoMesParaSalvarDoc, 
      atualizadoEm: Timestamp.now(),
    };
    try {
      const docRef = doc(db, 'metasFinanceiras', `${activeUserId}_${anoMesParaSalvarDoc}`);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        payload.criadoEm = Timestamp.now();
      }
      await setDoc(docRef, payload, { merge: true });
      toast({ title: 'Sucesso!', description: `Metas e configurações salvas para ${format(dataReferenciaParaSalvar, 'MMMM yyyy', { locale: ptBR })}.` });
      await fetchData(); 
    } catch (error){
      console.error('Erro ao salvar metas:', error);
      toast({ title: 'Erro ao Salvar Metas', description: String((error as Error).message), variant: 'destructive' });
    } finally {
      setIsLoadingForm(false);
    }
  };

  const formatCurrency = (value: number | string | null | undefined) => {
    if (typeof value === 'number') {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (typeof value === 'string' && !isNaN(parseFloat(value))) {
      return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return typeof value === 'string' ? value : "R$ -";
  };

  if (authLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="space-y-8">

      <Alert>
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Sua Central de Diagnóstico Financeiro</AlertTitle>
        <AlertDescription>
          Esta página é a ponte entre seus custos e seus objetivos. Ao informar suas metas e sua <strong>Margem de Contribuição Média</strong>, o sistema calcula seu <strong>Ponto de Equilíbrio</strong> e outras métricas vitais para a saúde do seu negócio.
        </AlertDescription>
      </Alert>

      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <CardTitle className="text-xl font-headline flex items-center gap-2"><Target className="text-primary" /> Metas Financeiras e Configurações de Análise</CardTitle>
              <CardDescription>Defina suas metas mensais e margem de contribuição para um diagnóstico financeiro claro.</CardDescription>
            </div>
            <Button 
              onClick={() => fetchData()} 
              variant="outline" 
              size="sm" 
              disabled={isFetchingData || !activeUserId}
              className="w-full sm:w-auto"
            >
              {isFetchingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isFetchingData ? "Atualizando..." : "Atualizar Dados da Página"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {(isLoadingForm && !isFetchingData) && activeUserId ? ( 
              <div className="flex justify-center items-center min-h-[300px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando dados...</p>
              </div>
          ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="metaFaturamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><DollarSign size={16} /> Meta de Faturamento (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="50000" {...field} value={field.value ?? ''} step="0.01" disabled={isLoadingForm || !activeUserId} />
                      </FormControl>
                      <FormDescription>Quanto você quer faturar neste mês?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="metaLucro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><Percent size={16} /> Meta de Lucro (R$)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15000" {...field} value={field.value ?? ''} step="0.01" disabled={isLoadingForm || !activeUserId} />
                      </FormControl>
                      <FormDescription>Qual o lucro líquido desejado para o mês?</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="metaDespesaMaxima"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><TrendingDown size={16} /> Meta de Despesa Máxima (R$) (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" {...field} value={field.value ?? ''} step="0.01" disabled={isLoadingForm || !activeUserId} />
                      </FormControl>
                      <FormDescription>Defina um teto para suas despesas totais no mês.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="margemDesejada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1"><BarChart3 size={16} /> Margem de Lucro Líquida Desejada (%)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="20" {...field} min="0" max="100" value={field.value ?? ''} step="0.01" disabled={isLoadingForm || !activeUserId} />
                      </FormControl>
                      <FormDescription>Percentual de lucro líquido que você deseja sobre o faturamento total.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {form.getValues('metaFaturamento') > 0 && (
                  <div className="pt-2">
                      <Label className="text-sm">Progresso da Meta de Faturamento (Mês Atual)</Label>
                      <Progress value={porcentagemMeta} className="h-3 my-1" />
                      <p className="text-xs text-muted-foreground">
                        Faturamento atual (mês): {formatCurrency(faturamentoAtual)} — {porcentagemMeta.toFixed(1)}% da meta de {formatCurrency(form.getValues('metaFaturamento'))} atingida.
                        <Tooltip>
                          <TooltipTrigger type="button" onClick={(e) => e.preventDefault()} className="ml-1 align-middle"><Info size={12} className="text-muted-foreground cursor-help" /></TooltipTrigger>
                          <TooltipContent className="max-w-xs text-sm">
                            <p>O faturamento atual é calculado com base nos lançamentos financeiros do tipo "RECEITA" com status "recebido" para o mês vigente.</p>
                          </TooltipContent>
                        </Tooltip>
                      </p>
                  </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Settings size={18} className="text-primary"/>
                      Custos Fixos Configurados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCustosReais ? (
                      <Skeleton className="h-8 w-32" />
                    ) : erroBuscaCustosReais ? (
                      <p className="text-sm text-destructive">{erroBuscaCustosReais}</p>
                    ) : (
                      <p className="text-2xl font-bold text-primary">{formatCurrency(custosFixosReaisConfigurados)}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">Este valor é a soma dos seus custos fixos ativos.</p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="link" size="sm" asChild className="p-0 h-auto">
                        <Link href="/financeiro">
                            Gerenciar Custos Fixos <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                  </CardFooter>
                </Card>
                <FormField
                  control={form.control}
                  name="margemContribuicaoMediaPercentual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1">
                        <PieChart size={16} /> Margem de Contribuição Média (%)
                        <Tooltip>
                          <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={14} className="text-muted-foreground cursor-help" /></TooltipTrigger>
                           <TooltipContent className="max-w-xs text-sm">
                             <p><strong>O que é:</strong> A Margem de Contribuição é o valor que sobra da receita de vendas após subtrair os custos e despesas variáveis. Este valor contribui para cobrir os custos fixos e gerar o lucro.</p>
                             <p className="mt-1"><strong>Percentual Médio:</strong> Se você tem vários produtos/serviços, esta é uma média ponderada da margem de todos eles. Caso contrário, é a margem do seu principal produto/serviço.</p>
                             <p className="mt-1"><strong>Fórmula:</strong> (Receita Total - Custos Variáveis Totais) / Receita Total * 100.</p>
                             <p className="mt-1"><strong>Importância:</strong> Essencial para calcular o Ponto de Equilíbrio.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="60" {...field} min="0" max="100" value={field.value ?? ''} step="0.01" disabled={isLoadingForm || !activeUserId} />
                      </FormControl>
                      <FormDescription>Percentual médio que sobra das vendas após cobrir os custos variáveis. Crucial para o Ponto de Equilíbrio.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="descricaoMeta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1"><MessageSquare size={16} /> Descrição das Metas / Foco do Mês (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Focar em aumentar vendas do produto X, reduzir custos de marketing..." {...field} value={field.value ?? ''} disabled={isLoadingForm || !activeUserId} rows={3} />
                    </FormControl>
                    <FormDescription>Adicione um breve resumo ou observações sobre suas metas para este mês.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoadingForm || !activeUserId} className="w-full sm:w-auto">
                {isLoadingForm && !isFetchingData ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Save className="mr-2 h-4 w-4" />} 
                {isLoadingForm && !isFetchingData ? "Salvando..." : "Salvar Metas e Configurações"}
              </Button>
            </form>
          </Form>
          )}
        </CardContent>
      </Card>

      {(custosFixosReaisConfigurados ?? 0) > 0 && (
        <Card className="shadow-md rounded-lg animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle className="text-lg font-headline flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" /> Análise de Ponto de Equilíbrio
            </CardTitle>
            <CardDescription>Com base nos custos fixos configurados e na margem de contribuição informada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 border rounded-md bg-muted/30">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp size={14} /> Ponto de Equilíbrio em Faturamento
                <Tooltip>
                  <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-sm">
                    <p>Receita mensal mínima que sua empresa precisa gerar para cobrir todos os custos fixos configurados, considerando a margem de contribuição média informada.</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(pontoDeEquilibrioCalculado)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cálculo: Custos Fixos / (Margem de Contribuição % / 100)
              </p>
            </div>
            <div className="p-3 border rounded-md bg-muted/30">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarDays size={14} /> Custo Fixo Diário
                <Tooltip>
                  <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-sm">
                    <p>Estimativa de quanto seus custos fixos configurados representam por dia útil (considerando {DIAS_UTEIS_PADRAO} dias úteis no mês).</p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(custoFixoDiarioCalculado)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Cálculo: Custos Fixos Mensais / {DIAS_UTEIS_PADRAO} dias úteis
              </p>
            </div>
             <p className="text-xs text-muted-foreground text-center pt-2">
                Lembre-se: estes são diagnósticos baseados nos custos que você configurou em Planejamento de Custo Fixo e na margem que informou nesta página.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
