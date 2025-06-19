
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertCircle, Info, Printer, Calculator, CheckCircle, History } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FechamentoCaixaFormSchema, type FechamentoCaixaFormValues, type EntradasPorMetodo, EntradasPorMetodoSchema } from '@/schemas/fechamentoCaixaSchema';
import type { LancamentoFinanceiro } from '@/schemas/lancamentoFinanceiroSchema';
import type { Venda } from '@/schemas/vendaSchema';
import { getLancamentosByUserIdAndDateRange } from '@/services/lancamentoFinanceiroService';
import { getVendasByUserIdAndDateRange } from '@/services/vendaService';
import { createFechamentoCaixa, getAllFechamentosCaixaByUserId } from '@/services/fechamentoCaixaService';
import { getFirebaseInstances } from '@/lib/firebase';
import { collection, query, where, Timestamp, limit, getDocs, orderBy } from 'firebase/firestore';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CaixaDiarioCalculado {
  totalEntradasLancamentos: number;
  totalSaidasLancamentos: number;
  entradasPorMetodoCalculadas: EntradasPorMetodo;
}

export default function FechamentoCaixaPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fechamentosAnterioresHoje, setFechamentosAnterioresHoje] = useState<number>(0);
  const [caixaDiario, setCaixaDiario] = useState<CaixaDiarioCalculado>({
    totalEntradasLancamentos: 0,
    totalSaidasLancamentos: 0,
    entradasPorMetodoCalculadas: { dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, boleto: 0, transferenciaBancaria: 0, outros: 0 },
  });

  const [confirmationData, setConfirmationData] = useState<FechamentoCaixaFormValues & CaixaDiarioCalculado & { saldoFinal: number } | null>(null);

  const form = useForm<FechamentoCaixaFormValues>({
    resolver: zodResolver(FechamentoCaixaFormSchema),
    defaultValues: {
      trocoInicial: 0,
      sangrias: 0,
      observacoes: "",
    },
  });

  const { watch, setValue } = form;
  const trocoInicial = watch("trocoInicial", 0);
  const sangrias = watch("sangrias", 0);

  const responsavelPeloFechamento = useMemo(() => {
    if (!user) return "Usuário Desconhecido";
    return user.displayName || user.email || "Usuário não identificado";
  }, [user]);

  const saldoFinalCaixa = useMemo(() => {
    const entradas = caixaDiario.totalEntradasLancamentos || 0;
    const saidas = caixaDiario.totalSaidasLancamentos || 0;
    const troco = trocoInicial || 0;
    const sang = sangrias || 0;
    return (entradas + troco) - saidas - sang;
  }, [caixaDiario.totalEntradasLancamentos, caixaDiario.totalSaidasLancamentos, trocoInicial, sangrias]);

  const fetchLastClosingAndSuggestTroco = useCallback(async (userId: string) => {
    try {
      const todosFechamentos = await getAllFechamentosCaixaByUserId(userId, 'dataFechamento', 'desc');
      if (todosFechamentos.length > 0) {
        const ultimoFechamentoGeral = todosFechamentos[0];
        setValue("trocoInicial", ultimoFechamentoGeral.saldoFinalCalculado, { shouldValidate: true });
        toast({
            title: "Troco Inicial Sugerido",
            description: `Baseado no saldo final de R$ ${ultimoFechamentoGeral.saldoFinalCalculado.toFixed(2)} do último fechamento registrado.`,
            duration: 7000
        });
      }
    } catch (error: any) {
      // Silenciar erro de permissão se ocorrer, pois é esperado em alguns cenários de teste/config
      if (error.message && (error.message.includes("Missing or insufficient permissions") || error.message.includes(" Firestore DB não disponível"))) {
        console.warn(`[FechamentoCaixaPage] Permissão negada ou DB indisponível ao buscar último fechamento de caixa para usuário ${userId}. Continuando sem sugerir troco inicial.`);
      } else {
        console.error("Erro ao buscar último fechamento de caixa:", error);
        toast({ title: "Erro ao Buscar Dados Anteriores", description: "Não foi possível obter dados do último fechamento para sugerir o troco.", variant: "destructive" });
      }
    }
  }, [setValue, toast]);

  const fetchDataDiaria = useCallback(async () => {
    if (!user?.uid) {
      return;
    }
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());

      const [lancamentosDoDia, vendasDoDia] = await Promise.all([
        getLancamentosByUserIdAndDateRange(user.uid, hojeInicio, hojeFim),
        getVendasByUserIdAndDateRange(user.uid, hojeInicio, hojeFim)
      ]);

      let totalEntradasCalculado = 0;
      let totalSaidasCalculado = 0;
      const entradasPorMetodoTemp: Record<keyof EntradasPorMetodo, number> = { dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, boleto: 0, transferenciaBancaria: 0, outros: 0 };

      lancamentosDoDia.forEach(l => {
        if (l.tipo === 'receita' && (l.status === 'recebido' || l.status === 'pago')) {
          totalEntradasCalculado += l.valor;
          const formaPagamento = l.formaPagamento?.toLowerCase() || 'outros';
          if (formaPagamento.includes('dinheiro')) entradasPorMetodoTemp.dinheiro += l.valor;
          else if (formaPagamento.includes('pix')) entradasPorMetodoTemp.pix += l.valor;
          else if (formaPagamento.includes('crédito') || formaPagamento.includes('credito')) {
            entradasPorMetodoTemp.cartaoCredito += l.valor;
            entradasPorMetodoTemp.cartao += l.valor;
          } else if (formaPagamento.includes('débito') || formaPagamento.includes('debito')) {
            entradasPorMetodoTemp.cartaoDebito += l.valor;
            entradasPorMetodoTemp.cartao += l.valor;
          } else if (formaPagamento.includes('boleto')) entradasPorMetodoTemp.boleto += l.valor;
          else if (formaPagamento.includes('transferência') || formaPagamento.includes('transferencia')) entradasPorMetodoTemp.transferenciaBancaria += l.valor;
          else entradasPorMetodoTemp.outros += l.valor;

        } else if (l.tipo === 'despesa' && l.status === 'pago') {
          totalSaidasCalculado += l.valor;
        }
      });
      
      // Processar Vendas do PDV, mas apenas se elas NÃO gerarem lançamentos financeiros automaticamente
      // Se as vendas PDV JÁ geram lançamentos, esta seção pode causar dupla contagem.
      // A heurística aqui é verificar se existe um LancamentoFinanceiro com o vendaId.
      vendasDoDia.forEach(venda => {
        if (venda.status === 'Concluída') {
            const lancamentoDaVendaExistente = lancamentosDoDia.find(l => l.vendaId === venda.id && l.tipo === 'receita');
            if (!lancamentoDaVendaExistente) {
                // Só contabiliza a venda para o total e para as formas de pagamento se não houver um lançamento correspondente
                totalEntradasCalculado += venda.totalVenda;
                switch (venda.formaPagamento.toLowerCase()) {
                  case 'dinheiro': entradasPorMetodoTemp.dinheiro += venda.totalVenda; break;
                  case 'pix': entradasPorMetodoTemp.pix += venda.totalVenda; break;
                  case 'cartao_credito': entradasPorMetodoTemp.cartaoCredito += venda.totalVenda; entradasPorMetodoTemp.cartao += venda.totalVenda; break;
                  case 'cartao_debito': entradasPorMetodoTemp.cartaoDebito += venda.totalVenda; entradasPorMetodoTemp.cartao += venda.totalVenda; break;
                  case 'boleto': entradasPorMetodoTemp.boleto += venda.totalVenda; break;
                  case 'transferencia': entradasPorMetodoTemp.transferenciaBancaria += venda.totalVenda; break;
                  default: entradasPorMetodoTemp.outros += venda.totalVenda;
                }
            }
        }
      });
      
      const parsedEntradasPorMetodo = EntradasPorMetodoSchema.parse(entradasPorMetodoTemp);

      setCaixaDiario({ totalEntradasLancamentos: totalEntradasCalculado, totalSaidasLancamentos: totalSaidasCalculado, entradasPorMetodoCalculadas: parsedEntradasPorMetodo });

    } catch (error: any) {
      toast({ title: "Erro ao buscar dados do dia", description: error.message, variant: "destructive" });
      console.error("Erro ao buscar dados para fechamento de caixa:", error);
    }
  }, [user?.uid, toast]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      const loadPageData = async () => {
        setIsLoadingData(true);
        try {
          const { db: dbInstance } = getFirebaseInstances();
          if (dbInstance && user.uid) {
            const todayStart = startOfDay(new Date());
            const todayEnd = endOfDay(new Date());
            const qFechamentosHoje = query(
              collection(dbInstance, "fechamentosCaixa"),
              where("userId", "==", user.uid),
              where("dataFechamento", ">=", Timestamp.fromDate(todayStart)),
              where("dataFechamento", "<=", Timestamp.fromDate(todayEnd))
            );
            const snapshotFechamentosHoje = await getDocs(qFechamentosHoje);
            setFechamentosAnterioresHoje(snapshotFechamentosHoje.size);

            // Só sugere troco se NENHUM fechamento foi feito hoje
            if (snapshotFechamentosHoje.empty) {
              await fetchLastClosingAndSuggestTroco(user.uid);
            }
          } else {
            // Se dbInstance ou user.uid não estiverem disponíveis, ainda tentar sugerir troco
            // Isso pode falhar se o db não estiver pronto, mas fetchLastClosingAndSuggestTroco tem seu próprio try/catch
             await fetchLastClosingAndSuggestTroco(user.uid);
          }
          await fetchDataDiaria();

        } catch (e: any) {
          console.error("Erro no carregamento inicial da página de fechamento:", e);
          toast({ title: "Erro ao Carregar Página", description: e.message, variant: "destructive" });
        } finally {
          setIsLoadingData(false);
        }
      };
      loadPageData();
    } else if (!user && !isAuthLoading && typeof window !== 'undefined') { 
        router.push('/login?redirect=/financeiro/fechamento-caixa');
    }
  }, [user, isAuthLoading, fetchDataDiaria, fetchLastClosingAndSuggestTroco, router, toast]);


  const handleOpenConfirmation = (values: FechamentoCaixaFormValues) => {
     setConfirmationData({
      ...values,
      ...caixaDiario,
      saldoFinal: saldoFinalCaixa,
    });
  };

  const finalSubmitFechamento = async () => {
    if (!user?.uid || !confirmationData) {
      toast({ title: "Erro de Dados", description: "Usuário ou dados de confirmação ausentes.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fechamentoData = {
        dataFechamento: new Date(),
        totalEntradasCalculado: confirmationData.totalEntradasLancamentos,
        totalSaidasCalculado: confirmationData.totalSaidasLancamentos,
        trocoInicial: confirmationData.trocoInicial || 0,
        sangrias: confirmationData.sangrias || 0,
        saldoFinalCalculado: confirmationData.saldoFinal,
        entradasPorMetodo: confirmationData.entradasPorMetodoCalculadas,
        responsavelNome: responsavelPeloFechamento,
        responsavelId: user.uid,
        observacoes: confirmationData.observacoes || "",
      };
      await createFechamentoCaixa(user.uid, fechamentoData);
      toast({ title: "Fechamento de Caixa Salvo!", description: "O fechamento do caixa foi registrado com sucesso." });
      form.reset({trocoInicial: 0, sangrias: 0, observacoes: ""}); 
      setFechamentosAnterioresHoje(prev => prev + 1); // Incrementa o contador de fechamentos do dia
      fetchDataDiaria(); // Recarrega os dados do dia, pois podem ter mudado (ex: um novo lançamento enquanto o modal estava aberto)
      // fetchLastClosingAndSuggestTroco(user.uid); // Recarrega a sugestão de troco para o PRÓXIMO dia, se necessário.
      setConfirmationData(null); 
    } catch (error: any) {
      toast({ title: "Erro ao Salvar Fechamento", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthLoading || (!user && !isLoadingData && typeof window !== 'undefined')) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Fechamento de Caixa
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Registre e confira o movimento financeiro do dia: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.
        </p>
      </section>

      {isLoadingData && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Carregando dados financeiros do dia...</p>
        </div>
      )}

      {!isLoadingData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Dia</CardTitle>
                <CardDescription>Valores calculados com base nos lançamentos financeiros e vendas registrados hoje.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <span className="font-medium text-green-700 dark:text-green-400 flex items-center"><TrendingUp className="mr-2 h-5 w-5" />Total de Entradas (Receitas do Dia):</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-400">R$ {caixaDiario.totalEntradasLancamentos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                  <span className="font-medium text-red-700 dark:text-red-400 flex items-center"><TrendingDown className="mr-2 h-5 w-5" />Total de Saídas (Despesas do Dia):</span>
                  <span className="font-bold text-lg text-red-700 dark:text-red-400">R$ {caixaDiario.totalSaidasLancamentos.toFixed(2)}</span>
                </div>
                
                <Separator />
                <h4 className="font-semibold">Entradas por Método (Vendas e Recebimentos de OS):</h4>
                <div className="text-sm space-y-1 pl-2">
                  <p>Dinheiro: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.dinheiro.toFixed(2)}</span></p>
                  <p>PIX: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.pix.toFixed(2)}</span></p>
                  <p>Cartão de Crédito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.cartaoCredito.toFixed(2)}</span></p>
                  <p>Cartão de Débito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.cartaoDebito.toFixed(2)}</span></p>
                  <p>Boleto: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.boleto.toFixed(2)}</span></p>
                  <p>Transferência: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.transferenciaBancaria.toFixed(2)}</span></p>
                  <p className="text-muted-foreground">Total Cartões (Consolidado): <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.cartao.toFixed(2)}</span></p>
                  <p>Outros Métodos: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoCalculadas.outros.toFixed(2)}</span></p>
                </div>
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Atenção sobre Entradas por Método</AlertTitle>
                  <AlertDescription>
                    O "Total de Entradas" refere-se a todos os lançamentos de receita efetivados e vendas PDV que não geraram lançamento. O detalhamento "Entradas por Método" agrupa essas receitas pela forma de pagamento registrada. Para um resumo preciso, certifique-se de que as formas de pagamento estejam corretamente registradas nas vendas e lançamentos.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Fechamento</CardTitle>
                {fechamentosAnterioresHoje > 0 && (
                    <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/30 mt-2">
                        <History className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                        <AlertTitle className="text-orange-700 dark:text-orange-400">Fechamento(s) já Realizado(s) Hoje</AlertTitle>
                        <AlertDescription className="text-orange-600 dark:text-orange-300">
                            Já existe(m) {fechamentosAnterioresHoje} fechamento(s) registrado(s) para hoje. Você pode realizar um novo fechamento se necessário (ex: complementar ou corretivo). O troco inicial foi sugerido com base no último fechamento geral.
                        </AlertDescription>
                    </Alert>
                )}
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleOpenConfirmation)} id="fechamentoCaixaForm">
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="trocoInicial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Troco Inicial (R$)</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="sangrias"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sangrias / Retiradas (R$)</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Separator />
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-center">
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Saldo Final Esperado no Caixa:</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">R$ {saldoFinalCaixa.toFixed(2)}</p>
                    </div>
                     <FormField
                      control={form.control}
                      name="observacoes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (Opcional)</FormLabel>
                          <FormControl><Textarea placeholder="Ex: Diferença no caixa, sangria para cofre, etc." {...field} rows={3} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-xs text-muted-foreground">Responsável: {responsavelPeloFechamento}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                     <AlertDialog open={!!confirmationData} onOpenChange={(open) => !open && setConfirmationData(null)}>
                       <AlertDialogTrigger asChild>
                         <Button type="submit" form="fechamentoCaixaForm" className="w-full" disabled={isSubmitting || isLoadingData}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finalizar Fechamento do Caixa
                          </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Confirmar Fechamento de Caixa</AlertDialogTitle>
                           <AlertDialogDescription asChild>
                             <div>
                               <p>Revise os valores antes de confirmar:</p>
                               <ul className="list-disc pl-5 my-2 text-sm text-foreground">
                                 <li>Total Entradas (Dia): <span className="font-semibold">R$ {confirmationData?.totalEntradasLancamentos.toFixed(2)}</span></li>
                                 <li>Total Saídas (Dia): <span className="font-semibold">R$ {confirmationData?.totalSaidasLancamentos.toFixed(2)}</span></li>
                                 <li>Troco Inicial: <span className="font-semibold">R$ {(confirmationData?.trocoInicial || 0).toFixed(2)}</span></li>
                                 <li>Sangrias: <span className="font-semibold">R$ {(confirmationData?.sangrias || 0).toFixed(2)}</span></li>
                                 <li className="mt-1">Saldo Final Esperado no Caixa: <strong className="text-lg">R$ {confirmationData?.saldoFinal.toFixed(2)}</strong></li>
                               </ul>
                               <p>Esta ação registrará um novo fechamento de caixa. Deseja continuar?</p>
                             </div>
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel onClick={() => setConfirmationData(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                           <AlertDialogAction onClick={finalSubmitFechamento} disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Confirmar e Salvar
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>

                    <Button type="button" variant="outline" className="w-full" disabled>
                       <Printer className="mr-2 h-4 w-4" /> Imprimir Comprovante (Em breve)
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>
        </div>
      )}
       { !isLoadingData && !user && typeof window !== 'undefined' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Usuário Não Autenticado</AlertTitle>
            <AlertDescription>
              Você precisa estar logado para realizar o fechamento de caixa. 
              <Button variant="link" onClick={() => router.push('/login')} className="p-0 h-auto ml-1">Fazer Login</Button>
            </AlertDescription>
          </Alert>
       )}
    </div>
  );
}

