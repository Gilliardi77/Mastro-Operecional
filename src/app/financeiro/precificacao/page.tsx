
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Percent, TrendingUp, AlertTriangle, Lightbulb, Send, Loader2, Tag, Brain, Info, HelpCircle, Settings2, MessageSquareQuote, CheckCircle, BarChart2, PiggyBank, RotateCw, ListTree, Clock } from 'lucide-react';
import { productPricingFlow } from '@/ai/flows/product-pricing-flow';
import type { ProductPricingOutput, ProductPricingInput } from '@/ai/schemas/product-pricing-schema';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from '@/hooks/use-auth';
import { getActiveUserId } from '@/lib/authUtils';
import { getAllCustosFixosConfigurados } from '@/services/custoFixoConfiguradoService';
import { db } from '@/lib/firebase'; 
import { doc, getDoc } from 'firebase/firestore'; 
import { getYear, getMonth } from 'date-fns'; 
import type { MetasFinanceiras as MetasFinanceirasTipo } from '@/app/analise-metas/page'; 
import { useAIGuide } from '@/contexts/AIGuideContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const pricingFormSchema = z.object({
  productName: z.string().min(3, { message: "Nome do produto/serviço deve ter pelo menos 3 caracteres." }),
  tipoPrecificacao: z.enum(['unitario', 'meta_periodica'], { required_error: "Tipo de precificação é obrigatório."}).default('unitario'),
  directCost: z.coerce.number().nonnegative({ message: "Custo direto/variável deve ser não-negativo." }),
  indirectCost: z.coerce.number().nonnegative({ message: "Custo indireto unitário deve ser não-negativo." }).optional(),
  custoFixoTotalPeriodo: z.coerce.number().nonnegative({ message: "Custos fixos do período devem ser não-negativos." }).optional(),
  vendasEstimadasPeriodo: z.coerce.number().int().positive({ message: "Vendas estimadas devem ser um inteiro positivo." }).optional(),
  tempoProducaoHoras: z.coerce.number().nonnegative({ message: "Tempo de produção deve ser não-negativo." }).optional(),
  profitMarginType: z.enum(['percentage', 'fixed'], { required_error: "Tipo de margem é obrigatório." }),
  profitMarginValue: z.coerce.number().positive({ message: "Valor da margem deve ser positivo." }),
  currentPrice: z.coerce.number().nonnegative({ message: "Preço atual deve ser não-negativo." }).optional(),
}).superRefine((data, ctx) => {
  if (data.tipoPrecificacao === 'unitario' && data.indirectCost === undefined && data.indirectCost !== 0) { 
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Custo Indireto Unitário é obrigatório para precificação por unidade/personalizado (pode ser 0).",
      path: ["indirectCost"],
    });
  }
  if (data.tipoPrecificacao === 'meta_periodica') {
    if (data.custoFixoTotalPeriodo === undefined && data.custoFixoTotalPeriodo !== 0) { 
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Custos Fixos Totais são obrigatórios para precificação por meta (pode ser 0).", path: ["custoFixoTotalPeriodo"] });
    }
    if (data.vendasEstimadasPeriodo === undefined || data.vendasEstimadasPeriodo <= 0) { 
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vendas Estimadas no Período são obrigatórias e devem ser positivas.", path: ["vendasEstimadasPeriodo"] });
    }
  }
});

type PricingFormValues = z.infer<typeof pricingFormSchema>;

interface ProductDiagnostics {
  baseCostPerUnit: number;
  grossProfitPerUnit: number;
  contributionMarginPercentage: number;
  appliedMarginValue: number;
  lucroPorHora?: number;
}

const simulationSchema = z.object({
  simulationSalesVolume: z.coerce.number().int().positive({ message: "Quantidade deve ser um número inteiro positivo." }),
});
type SimulationFormValues = z.infer<typeof simulationSchema>;

const getCurrentAnoMesForMetas = () => `${getYear(new Date())}-${String(getMonth(new Date()) + 1).padStart(2, '0')}`;

export default function PrecificacaoPage() {
  const { toast } = useToast();
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [pricingResult, setPricingResult] = useState<ProductPricingOutput | null>(null);
  const [productDiagnostics, setProductDiagnostics] = useState<ProductDiagnostics | null>(null);
  const [errorPrice, setErrorPrice] = useState<string | null>(null);
  
  const [simulatedProfit, setSimulatedProfit] = useState<{ totalRevenue: number; grossProfit: number; netProfit?: number } | null>(null);
  const [lastInputForSimulation, setLastInputForSimulation] = useState<PricingFormValues | null>(null);

  const [animatedPrice, setAnimatedPrice] = useState(0);

  const [metasDoUsuario, setMetasDoUsuario] = useState<MetasFinanceirasTipo | null>(null);
  const [isLoadingMetas, setIsLoadingMetas] = useState(false);
  const [custosFixosReaisConfiguradosPrecificacao, setCustosFixosReaisConfiguradosPrecificacao] = useState<number | null>(null);
  const [isLoadingCustosReaisPrecificacao, setIsLoadingCustosReaisPrecificacao] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const activeUserId = useMemo(() => getActiveUserId(user), [user]);

  const { updateAICurrentAppContext } = useAIGuide();

  const pricingForm = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    mode: "onBlur", 
    defaultValues: {
      productName: '',
      tipoPrecificacao: 'unitario',
      directCost: 0,
      indirectCost: 0, 
      custoFixoTotalPeriodo: undefined, 
      vendasEstimadasPeriodo: 1,
      tempoProducaoHoras: undefined,
      profitMarginType: 'percentage',
      profitMarginValue: 30,
      currentPrice: undefined,
    },
  });

  const simulationForm = useForm<SimulationFormValues>({
    resolver: zodResolver(simulationSchema),
    defaultValues: {
      simulationSalesVolume: 100,
    },
  });

  const { watch: watchPricingForm, setValue: setPricingValue, getValues: getPricingValues } = pricingForm;
  const { setValue: setSimulationValue, getValues: getSimulationValues } = simulationForm;
  const tipoPrecificacaoSelecionado = watchPricingForm('tipoPrecificacao');

   useEffect(() => {
    const subscription = pricingForm.watch((value) => {
        updateAICurrentAppContext({
            formSnapshotJSON: JSON.stringify(value),
        });
    });
    return () => subscription.unsubscribe();
  }, [pricingForm, updateAICurrentAppContext]);

  useEffect(() => {
    const handleAIFill = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { formName, fieldName, value, actionLabel } = customEvent.detail;
      
      if (formName === 'pricingForm') {
        if (Object.keys(pricingForm.getValues()).includes(fieldName)) {
            pricingForm.setValue(fieldName as keyof PricingFormValues, value, {
            shouldValidate: true,
            shouldDirty: true,
          });
          toast({
            title: "Campo Preenchido pela IA",
            description: `Ação "${actionLabel}" executada.`,
          });
        } else {
            toast({
                title: "Campo Inválido",
                description: `A IA tentou preencher um campo ('${fieldName}') que não existe neste formulário.`,
                variant: 'destructive',
            });
        }
      }
    };

    window.addEventListener('aiFillFormEvent', handleAIFill);
    return () => {
      window.removeEventListener('aiFillFormEvent', handleAIFill);
    };
  }, [pricingForm, toast]);


  useEffect(() => {
    const selectedType = getPricingValues('tipoPrecificacao');
    if (selectedType === 'unitario') {
      setPricingValue('custoFixoTotalPeriodo', undefined);
      setPricingValue('vendasEstimadasPeriodo', undefined);
      setPricingValue('tempoProducaoHoras', undefined);
      if(getPricingValues('indirectCost') === undefined) setPricingValue('indirectCost', 0);
    } else if (selectedType === 'meta_periodica') {
      setPricingValue('indirectCost', undefined);
      if(getPricingValues('custoFixoTotalPeriodo') === undefined) setPricingValue('custoFixoTotalPeriodo', 0);
      if(getPricingValues('vendasEstimadasPeriodo') === undefined || getPricingValues('vendasEstimadasPeriodo') <=0 ) setPricingValue('vendasEstimadasPeriodo', 1);
    }
  }, [tipoPrecificacaoSelecionado, setPricingValue, getPricingValues]);

  useEffect(() => {
    if (pricingResult?.suggestedPrice) {
      let currentDisplayPrice = 0;
      const targetPrice = pricingResult.suggestedPrice;
      const animationDuration = 700; 
      const steps = 30; 
      const increment = targetPrice / steps;
      const intervalTime = animationDuration / steps;

      const interval = setInterval(() => {
        currentDisplayPrice += increment;
        if (currentDisplayPrice >= targetPrice) {
          setAnimatedPrice(targetPrice);
          clearInterval(interval);
        } else {
          setAnimatedPrice(currentDisplayPrice);
        }
      }, intervalTime);
      return () => clearInterval(interval);
    } else {
        setAnimatedPrice(0);
    }
  }, [pricingResult?.suggestedPrice]);

  useEffect(() => {
    if (pricingResult && lastInputForSimulation) {
      const { suggestedPrice, baseCostPerUnit } = pricingResult;
      const { tempoProducaoHoras } = lastInputForSimulation;
      const grossProfitPerUnit = suggestedPrice - baseCostPerUnit;
      const contributionMarginPercentage = suggestedPrice > 0 ? (grossProfitPerUnit / suggestedPrice) * 100 : 0;
      const appliedMarginValue = suggestedPrice - baseCostPerUnit;
      
      const lucroPorHora = (tempoProducaoHoras && tempoProducaoHoras > 0) 
        ? grossProfitPerUnit / tempoProducaoHoras 
        : undefined;

      setProductDiagnostics({
        baseCostPerUnit,
        grossProfitPerUnit,
        contributionMarginPercentage,
        appliedMarginValue,
        lucroPorHora,
      });
    } else {
      setProductDiagnostics(null);
    }
  }, [pricingResult, lastInputForSimulation]);

  const fetchUserMetas = useCallback(async () => {
    if (!activeUserId) {
      setMetasDoUsuario(null);
      setIsLoadingMetas(false);
      return;
    }
    setIsLoadingMetas(true);
    try {
      const anoMes = getCurrentAnoMesForMetas();
      const docRef = doc(db, 'metasFinanceiras', `${activeUserId}_${anoMes}`);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMetasDoUsuario(docSnap.data() as MetasFinanceirasTipo);
      } else {
        setMetasDoUsuario(null);
      }
    } catch (error) {
      setMetasDoUsuario(null);
    } finally {
      setIsLoadingMetas(false);
    }
  }, [activeUserId]);

  const fetchCustosFixosParaPrecificacao = useCallback(async () => {
    if (!user) { 
      setCustosFixosReaisConfiguradosPrecificacao(null);
      setIsLoadingCustosReaisPrecificacao(false);
      return;
    }

    setIsLoadingCustosReaisPrecificacao(true);
    try {
      const idToken = await user.getIdToken(); 
      if (!idToken) {
        throw new Error("ID Token não disponível para autenticação do serviço.");
      }
      const custosFixosAtivos = await getAllCustosFixosConfigurados(idToken, false); 
      const totalCustosConfigurados = custosFixosAtivos.reduce((sum, custo) => sum + custo.valorMensal, 0);
      setCustosFixosReaisConfiguradosPrecificacao(totalCustosConfigurados);
    } catch (error) {
      setCustosFixosReaisConfiguradosPrecificacao(null);
      toast({ title: 'Erro ao buscar custos', description: `Não foi possível carregar os custos fixos configurados. ${(error as Error).message}`, variant: 'destructive' });
    } finally {
      setIsLoadingCustosReaisPrecificacao(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authLoading) { 
      fetchUserMetas();
      fetchCustosFixosParaPrecificacao();
    }
  }, [authLoading, user, fetchUserMetas, fetchCustosFixosParaPrecificacao]); 


  async function onPricingSubmit(data: PricingFormValues) {
    setIsLoadingPrice(true);
    setPricingResult(null);
    setErrorPrice(null);
    setSimulatedProfit(null); 
    setLastInputForSimulation(data);
    setAnimatedPrice(0);
    setProductDiagnostics(null);
    
    if (data.profitMarginType === 'percentage' && data.profitMarginValue > 300) {
      toast({
        title: "Atenção: Margem Elevada",
        description: "A margem de lucro inserida é superior a 300%. Verifique se o valor está correto.",
        variant: "default",
        duration: 6000,
      });
    }

    const inputForFlow: ProductPricingInput = {
        productName: data.productName,
        tipoPrecificacao: data.tipoPrecificacao,
        directCost: data.directCost,
        profitMarginType: data.profitMarginType,
        profitMarginValue: data.profitMarginValue,
        ...(data.tipoPrecificacao === 'unitario' && { indirectCost: data.indirectCost ?? 0 }),
        ...(data.tipoPrecificacao === 'meta_periodica' && {
            custoFixoTotalPeriodo: data.custoFixoTotalPeriodo ?? 0,
            vendasEstimadasPeriodo: data.vendasEstimadasPeriodo ?? 1,
            tempoProducaoHoras: data.tempoProducaoHoras,
        }),
    };

    try {
      const result = await productPricingFlow(inputForFlow);
      setPricingResult(result);

      if (result.suggestedPrice > data.directCost * 5 && data.directCost > 0) {
         toast({
            title: "Atenção: Preço Elevado",
            description: "O preço sugerido está mais de 5 vezes acima do custo direto. Isso pode ser intencional, mas vale a pena revisar os dados.",
            variant: "default",
            duration: 7000
         });
      }

      toast({ title: "Preço Sugerido e Análise da IA Prontos!", description: "A IA analisou seus dados. Veja os resultados abaixo." });
      document.getElementById('pricing-results-section')?.scrollIntoView({ behavior: 'smooth' });
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
      setErrorPrice(`Falha ao calcular preço: ${errorMessage}`);
      toast({ title: "Erro no Cálculo", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingPrice(false);
    }
  }

  function onSimulationSubmit(data: SimulationFormValues) {
    if (!lastInputForSimulation && pricingForm.getValues('currentPrice') === undefined) {
        toast({ title: "Dados Insuficientes", description: "Calcule um preço ou informe os dados de custo primeiro.", variant: "destructive" });
        return;
    }
    
    const priceToUse = pricingForm.getValues('currentPrice') ?? pricingResult?.suggestedPrice;
    const currentInputs = lastInputForSimulation || pricingForm.getValues();

    if (priceToUse === null || priceToUse === undefined) {
      toast({ title: "Preço Não Definido", description: "Calcule um preço sugerido ou informe o preço atual para simular.", variant: "destructive" });
      setSimulatedProfit(null);
      return;
    }

    const totalRevenue = priceToUse * data.simulationSalesVolume;
    const totalDirectCosts = (currentInputs.directCost || 0) * data.simulationSalesVolume;
    const grossProfit = totalRevenue - totalDirectCosts;
    
    let netProfit: number | undefined = undefined;
    if (currentInputs.tipoPrecificacao === 'meta_periodica') {
      netProfit = grossProfit - (currentInputs.custoFixoTotalPeriodo || 0);
    }
    
    setSimulatedProfit({ totalRevenue, grossProfit, netProfit });
    toast({ title: "Simulação de Cenário Concluída", description: `Veja os resultados estimados abaixo.`});
  }
  
  useEffect(() => {
    const selectedType = getPricingValues('tipoPrecificacao');
    if (selectedType === 'meta_periodica') {
        const estimatedSales = getPricingValues('vendasEstimadasPeriodo');
        setSimulationValue('simulationSalesVolume', estimatedSales || 100);
    } else {
        if (getSimulationValues('simulationSalesVolume') === undefined) {
           setSimulationValue('simulationSalesVolume', 100);
        }
    }
  }, [getPricingValues, setSimulationValue, getSimulationValues]);
  
  const formatCurrency = (value: number | undefined | null) => {
    if (typeof value !== 'number' || isNaN(value)) return "R$ -";
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatPercentage = (value: number | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) return "- %";
    return `${value.toFixed(2)}%`;
  };

  return (
    <TooltipProvider>
    <div className="space-y-8">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline flex items-center gap-2">
            <Tag className="h-6 w-6 text-primary" />
            Precificação Inteligente e Dinâmica
          </CardTitle>
          <CardDescription>
            Calcule preços de venda ideais com base em diferentes metodologias, custos, margem desejada e simule seu lucro com a ajuda da IA.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" /> Configuração de Precificação
          </CardTitle>
          <CardDescription>Converse com o Guia Inteligente para preencher os campos ou preencha manualmente abaixo.</CardDescription>
        </CardHeader>
        <Form {...pricingForm}>
          <form onSubmit={pricingForm.handleSubmit(onPricingSubmit)}>
            <CardContent className="space-y-6 animate-in fade-in-50 duration-500">
                <FormField
                  control={pricingForm.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>1. Nome do Produto/Serviço *</FormLabel>
                      <FormControl><Input placeholder="Ex: Consultoria Financeira, Bolo de Chocolate" {...field} /></FormControl>
                      <FormDescription>Dê um nome claro para o item que você está precificando.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={pricingForm.control}
                  name="tipoPrecificacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>2. Qual método de precificação você usará? *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo de precificação" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unitario">Preço por Unidade / Personalizado</SelectItem>
                          <SelectItem value="meta_periodica">Custo por Meta Periódica</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription className="text-xs">
                        {tipoPrecificacaoSelecionado === 'unitario' ? "Ideal para produtos/serviços com custos unitários claros ou itens sob medida. Você informará custos diretos e um rateio de custos indiretos por unidade." : "Calcula o preço unitário necessário para cobrir os custos fixos de um período, diluindo-os no volume de vendas estimado. Ideal para produções ou projetos com duração específica."}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={pricingForm.control}
                  name="directCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>3. Custo Direto / Variável Unitário (R$) *</FormLabel>
                      <FormControl><Input type="number" placeholder="10.50" {...field} value={field.value ?? ''} step="0.01" /></FormControl>
                      <FormDescription className="text-xs">Inclui matéria-prima, insumos diretos, comissões variáveis por unidade, etc.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {tipoPrecificacaoSelecionado === 'unitario' && (
                  <FormField
                    control={pricingForm.control}
                    name="indirectCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>4. Custo Indireto Unitário Estimado (R$) *</FormLabel>
                        <FormControl><Input type="number" placeholder="2.00" {...field} value={field.value ?? ''} step="0.01" /></FormControl>
                          <FormDescription className="text-xs">É a sua estimativa de quanto cada unidade do produto/serviço deve contribuir para pagar os custos fixos gerais do negócio (aluguel, luz, salários administrativos, etc.). Pode ser zero se não aplicável.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {tipoPrecificacaoSelecionado === 'meta_periodica' && (
                  <div className="space-y-6 p-4 border rounded-md bg-muted/20">
                    <p className="text-sm text-foreground font-medium">4. Para o método de "Custo por Meta", informe os totais para o período de produção:</p>
                    
                    <div className="grid sm:grid-cols-2 gap-4 items-start">
                      <FormField
                        control={pricingForm.control}
                        name="tempoProducaoHoras"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tempo de Produção (Horas)</FormLabel>
                            <FormControl><Input type="number" placeholder="40" {...field} value={field.value ?? ''} step="0.1" min="0"/></FormControl>
                            <FormDescription className="text-xs">Total de horas para produzir o lote estimado.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={pricingForm.control}
                        name="custoFixoTotalPeriodo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custos Fixos Totais (R$) *</FormLabel>
                            <FormControl><Input type="number" placeholder="3000" {...field} value={field.value ?? ''} step="0.01" /></FormControl>
                            <FormDescription className="text-xs">Custos fixos do período da produção.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                        {custosFixosReaisConfiguradosPrecificacao !== null && custosFixosReaisConfiguradosPrecificacao > 0 && user && (
                            <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                                const tempoProducao = pricingForm.getValues('tempoProducaoHoras');
                                const custosFixosConfigurados = custosFixosReaisConfiguradosPrecificacao;
                                if (custosFixosConfigurados === null) {
                                    toast({ title: 'Custos não carregados', description: `Não foi possível carregar os custos fixos configurados.`, variant: 'destructive' });
                                    return;
                                }

                                let valorParaAplicar = custosFixosConfigurados;
                                let toastDescription = `Custos fixos mensais configurados (${formatCurrency(custosFixosConfigurados)}) foram aplicados.`;

                                if (tempoProducao !== undefined && tempoProducao > 0) {
                                    const DIAS_UTEIS_MES = 22;
                                    const HORAS_UTEIS_DIA = 8;
                                    const custoPorHora = custosFixosConfigurados / (DIAS_UTEIS_MES * HORAS_UTEIS_DIA);
                                    valorParaAplicar = custoPorHora * tempoProducao;
                                    toastDescription = `Custo fixo proporcional para ${tempoProducao} horas (${formatCurrency(valorParaAplicar)}) aplicado.`;
                                }
                                
                                pricingForm.setValue('custoFixoTotalPeriodo', parseFloat(valorParaAplicar.toFixed(2)), { shouldValidate: true });
                                toast({ title: 'Custos Aplicados', description: toastDescription });
                            }}
                            disabled={isLoadingCustosReaisPrecificacao || isLoadingPrice}
                            >
                            {isLoadingCustosReaisPrecificacao ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCw className="h-3 w-3 mr-1" />}
                            Usar Custos Configurados
                            </Button>
                        )}
                    </div>
                      {(custosFixosReaisConfiguradosPrecificacao === 0 || custosFixosReaisConfiguradosPrecificacao === null) && !isLoadingCustosReaisPrecificacao && activeUserId && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Nenhum custo fixo configurado encontrado no Financeiro.
                        </p>
                    )}
                    {!activeUserId && (
                      <p className="text-xs text-muted-foreground mt-1">Faça login para carregar custos configurados.</p>
                    )}

                    <FormField
                      control={pricingForm.control}
                      name="vendasEstimadasPeriodo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidades Estimadas para Venda no Período *</FormLabel>
                          <FormControl><Input type="number" placeholder="100" {...field} value={field.value ?? ''} step="1" min="1"/></FormControl>
                          <FormDescription className="text-xs">Quantas unidades você projeta vender dentro do período da meta (ex: mês).</FormDescription>
                          <div className="mt-1.5 flex items-start text-xs text-muted-foreground gap-1.5 p-2 bg-accent/30 rounded-md border border-accent/50">
                              <Lightbulb className="h-3.5 w-3.5 mt-0.5 text-primary/80 flex-shrink-0" />
                              <span>Dica: Este valor será usado para calcular o preço ideal por unidade. Quanto mais preciso, melhor.</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
                
                <div className="grid sm:grid-cols-2 gap-4 items-end pt-2">
                  <FormField
                    control={pricingForm.control}
                    name="profitMarginType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>5. Aplicar Margem de Lucro como *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentual (%) sobre Custo Base</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$) sobre Custo Base</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-xs">Esta é a margem que será aplicada sobre o custo base unitário.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingForm.control}
                    name="profitMarginValue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor da Margem de Lucro *</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input type="number" placeholder={pricingForm.getValues('profitMarginType') === 'percentage' ? "30" : "50"} {...field} value={field.value ?? ''} step={pricingForm.getValues('profitMarginType') === 'percentage' ? "0.01" : "0.01"} min="0.01"/>
                            {pricingForm.getValues('profitMarginType') === 'percentage' ? <Percent className="h-5 w-5 text-muted-foreground" /> : <DollarSign className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {metasDoUsuario?.margemContribuicaoMediaPercentual !== undefined && metasDoUsuario.margemContribuicaoMediaPercentual > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md">
                      <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <Info size={14} /> Referência da Análise de Metas: Sua Margem de Contribuição Média definida é <strong className="font-semibold">{formatPercentage(metasDoUsuario.margemContribuicaoMediaPercentual)}</strong>.
                      </p>
                  </div>
                )}
                <FormField
                    control={pricingForm.control}
                    name="currentPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1">
                            6. Preço de Venda Atual (Opcional - R$)
                            <Tooltip>
                                <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                                <TooltipContent className="max-w-xs text-sm">Se você já pratica um preço para este item, informe aqui. Ele será usado para comparação e poderá ser usado no simulador de lucro se você não calcular um novo preço.</TooltipContent>
                            </Tooltip>
                        </FormLabel>
                        <FormControl><Input 
                            type="number" 
                            placeholder="0.00" 
                            {...field} 
                            value={field.value === undefined ? '' : field.value}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                            step="0.01" 
                            />
                        </FormControl>
                        <FormDescription className="text-xs">Informar seu preço atual ajuda a comparar com a sugestão da IA.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

            </CardContent>
            <CardFooter className="flex-col items-stretch gap-4">
              <Button type="submit" disabled={isLoadingPrice || !activeUserId} className="w-full mt-2">
                {isLoadingPrice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
                {isLoadingPrice ? "Analisando com IA..." : "Calcular e Analisar Preço (IA)"}
              </Button>
              {errorPrice && <p className="text-sm text-destructive flex items-center gap-1 mt-2"><AlertTriangle className="h-4 w-4" /> {errorPrice}</p>}
            </CardFooter>
          </form>
        </Form>
      </Card>

      {(pricingResult || errorPrice) && <div id="pricing-results-section"></div>}

      {pricingResult && !isLoadingPrice && (
        <>
        <Card className="shadow-lg rounded-lg animate-in fade-in-50 duration-500">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg py-6">
                <Label className="text-md text-primary font-semibold">Preço de Venda Sugerido</Label>
                <p className="text-5xl font-bold text-primary tracking-tight">{formatCurrency(animatedPrice)}</p>
                 {pricingForm.getValues('currentPrice') !== undefined && pricingResult.suggestedPrice !== pricingForm.getValues('currentPrice') && (
                    <p className={`text-sm mt-1 ${pricingResult.suggestedPrice > (pricingForm.getValues('currentPrice') || 0) ? 'text-yellow-600' : 'text-green-600'}`}>
                        (Seu preço atual informado: {formatCurrency(pricingForm.getValues('currentPrice'))})
                    </p>
                 )}
            </CardHeader>
            <CardContent className="p-6 space-y-4">
                <div className="p-4 border rounded-lg bg-background">
                    <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><MessageSquareQuote className="h-5 w-5 text-primary"/> Explicação da IA</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{pricingResult.analysis.humanExplanation}</p>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                    <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><HelpCircle className="h-5 w-5 text-primary"/> Pontos de Atenção</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{pricingResult.analysis.keyConsiderations}</p>
                </div>
                <div className="p-4 border rounded-lg bg-background">
                    <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><Lightbulb className="h-5 w-5 text-primary"/> Ações Recomendadas</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{pricingResult.analysis.alternativeScenariosOrAdvice}</p>
                </div>
                {pricingResult.analysis.customProductAdvice && (
                  <div className="p-4 border rounded-lg bg-background">
                    <h4 className="font-semibold text-md flex items-center gap-2 mb-2"><Tag className="h-5 w-5 text-primary"/> Dicas para "{pricingForm.getValues('productName')}"</h4>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{pricingResult.analysis.customProductAdvice}</p>
                  </div>
                )}
            </CardContent>
        </Card>

        {productDiagnostics && (
            <Card className="shadow-md rounded-lg animate-in fade-in-50 duration-600">
              <CardHeader>
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-primary" /> Diagnóstico do Preço Sugerido
                </CardTitle>
                <CardDescription>Métricas chave com base no preço sugerido pela IA.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-md bg-muted/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <ListTree size={14} /> Custo Base Unitário
                    <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">O custo total para produzir ou oferecer uma unidade do seu produto/serviço, antes da margem de lucro.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xl font-bold text-primary">{formatCurrency(productDiagnostics.baseCostPerUnit)}</p>
                </div>
                <div className="p-3 border rounded-md bg-muted/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <PiggyBank size={14} /> Lucro Bruto Unitário Estimado
                     <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">Quanto sobra de cada venda após subtrair o Custo Base Unitário. (Preço Sugerido - Custo Base Unitário).</TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(productDiagnostics.grossProfitPerUnit)}</p>
                </div>
                <div className="p-3 border rounded-md bg-muted/30">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent size={14} /> Margem de Contribuição (%)
                     <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm">Percentual do preço de venda que representa o Lucro Bruto Unitário. Essencial para cobrir custos fixos e gerar lucro. (Lucro Bruto Unitário / Preço Sugerido) * 100.</TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xl font-bold text-blue-600">{formatPercentage(productDiagnostics.contributionMarginPercentage)}</p>
                  {productDiagnostics.contributionMarginPercentage < 10 && (<p className="text-xs text-destructive mt-1">Margem de contribuição muito baixa. Avalie aumentar o preço ou reduzir custos variáveis.</p>)}
                  {productDiagnostics.contributionMarginPercentage > 70 && (<p className="text-xs text-amber-600 mt-1">Margem alta! Verifique se seu preço é competitivo no mercado.</p>)}
                </div>
                {productDiagnostics.lucroPorHora !== undefined && (
                  <div className="p-3 border rounded-md bg-muted/30">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={14} /> Lucro por Hora de Produção
                      <Tooltip>
                        <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm">Mostra quanto você ganha por cada hora gasta na produção/serviço. (Lucro Bruto Unitário / Horas de Produção por Unidade).</TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className="text-xl font-bold text-indigo-600">{formatCurrency(productDiagnostics.lucroPorHora)}</p>
                    {productDiagnostics.lucroPorHora < 20 && (
                      <p className="text-xs text-destructive mt-1">Atenção: Este valor pode ser baixo para um serviço qualificado. Considere se ele remunera adequadamente seu tempo.</p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                 {productDiagnostics.contributionMarginPercentage < 15 && (
                    <Alert variant="destructive" className="mt-4 w-full">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Viabilidade em Risco</AlertTitle>
                        <AlertDescription>
                            A margem de contribuição está abaixo de 15%. Isso pode dificultar a cobertura de custos fixos e o crescimento sustentável do negócio a longo prazo.
                        </AlertDescription>
                    </Alert>
                )}
              </CardFooter>
            </Card>
          )}
        </>
      )}

      {(pricingResult || pricingForm.getValues('currentPrice') !== undefined) && !isLoadingPrice && (
        <Card className="shadow-md rounded-lg animate-in fade-in-50 duration-700">
            <CardHeader>
              <CardTitle className="text-xl font-headline flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" /> Simulador de Cenários de Venda
              </CardTitle>
              <CardDescription>Estime a receita, o lucro bruto e o lucro líquido com base no preço e no volume de vendas.</CardDescription>
            </CardHeader>
             <Form {...simulationForm}>
                <form onSubmit={simulationForm.handleSubmit(onSimulationSubmit)}>
                  <CardContent className="space-y-4">
                     <FormField
                        control={simulationForm.control}
                        name="simulationSalesVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantidade de Vendas para Simulação *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="100"
                                {...field} 
                                value={field.value ?? ''} 
                                min="1"
                                onChange={(e) => { 
                                  const value = e.target.value;
                                  field.onChange(value === '' ? undefined : parseInt(value, 10));
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <div>
                        <Label className="text-xs text-muted-foreground">Preço usado na simulação:</Label>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(pricingForm.getValues('currentPrice') ?? pricingResult?.suggestedPrice)}
                          <span className="text-xs text-muted-foreground font-normal ml-1">
                            ({pricingForm.getValues('currentPrice') !== undefined ? "Preço Atual Informado" : pricingResult?.suggestedPrice !== undefined ? "Preço Sugerido pela IA" : "Nenhum preço base"})
                          </span>
                        </p>
                      </div>
                  </CardContent>
                  <CardFooter className="flex-col items-stretch">
                     <Button type="submit" className="w-full" disabled={
                        (!lastInputForSimulation && pricingForm.getValues('currentPrice') === undefined) ||
                        (pricingForm.getValues('currentPrice') === undefined && !pricingResult?.suggestedPrice)
                     }>
                        <CheckCircle className="mr-2 h-4 w-4" /> Simular Resultados
                    </Button>
                  </CardFooter>
                </form>
            </Form>
            {simulatedProfit && (
              <CardContent className="pt-6 border-t mt-4 space-y-4 bg-muted/30 rounded-b-lg">
                <h4 className="font-semibold text-md text-center mb-2">Resultado da Simulação:</h4>
                <div className="p-3 border rounded-md bg-background">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp size={14} /> Receita Total Estimada
                    <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                      <TooltipContent>Preço Usado na Simulação × Quantidade de Vendas</TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xl font-bold text-primary">{formatCurrency(simulatedProfit.totalRevenue)}</p>
                </div>
                <div className="p-3 border rounded-md bg-background">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <PiggyBank size={14} /> Lucro Bruto Estimado
                    <Tooltip>
                      <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                      <TooltipContent>Receita Total Estimada - (Custo Direto Unitário × Quantidade)</TooltipContent>
                    </Tooltip>
                  </Label>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(simulatedProfit.grossProfit)}</p>
                </div>

                {simulatedProfit.netProfit !== undefined && (
                  <div className="p-3 border rounded-md bg-background">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                       <CheckCircle size={14} /> Lucro Líquido Estimado
                       <Tooltip>
                        <TooltipTrigger type="button" onClick={(e) => e.preventDefault()}><Info size={12} className="cursor-help" /></TooltipTrigger>
                        <TooltipContent className="max-w-xs text-sm">Lucro Bruto Estimado - Custos Fixos Totais do Período. Este valor aparece apenas quando o método de "Meta Periódica" é usado, pois os custos fixos são conhecidos.</TooltipContent>
                      </Tooltip>
                    </Label>
                    <p className={`text-xl font-bold ${simulatedProfit.netProfit >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                        {formatCurrency(simulatedProfit.netProfit)}
                    </p>
                  </div>
                )}
              </CardContent>
            )}
        </Card>
      )}
    </div>
    </TooltipProvider>
  );
}
