
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
import { FechamentoCaixaFormSchema, type FechamentoCaixaFormValues, type EntradasPorMetodo } from '@/schemas/fechamentoCaixaSchema';
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
  const [fechamentosDoDia, setFechamentosDoDia] = useState<number>(0);
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
      // Buscar o último fechamento geral para sugerir o troco inicial
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
      if (error.message && error.message.includes("Missing or insufficient permissions")) {
        console.warn(`[FechamentoCaixaPage] Permissão negada ao buscar último fechamento de caixa para usuário ${userId}. Verifique as regras do Firestore ou a configuração do Firebase. Continuando sem sugerir troco inicial.`);
      } else {
        console.error("Erro ao buscar último fechamento de caixa:", error);
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

      let totalEntradasLancamentos = 0;
      let totalSaidasLancamentos = 0;
      const entradasPorMetodoCalculadas: EntradasPorMetodo = { dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, boleto: 0, transferenciaBancaria: 0, outros: 0 };

      // Processar Lançamentos Financeiros (incluindo pagamentos de OS)
      lancamentosDoDia.forEach(l => {
        if (l.tipo === 'receita' && (l.status === 'recebido' || l.status === 'pago')) {
          totalEntradasLancamentos += l.valor;
          const formaPagamento = l.formaPagamento?.toLowerCase() || 'outros';
          if (formaPagamento.includes('dinheiro')) entradasPorMetodoCalculadas.dinheiro += l.valor;
          else if (formaPagamento.includes('pix')) entradasPorMetodoCalculadas.pix += l.valor;
          else if (formaPagamento.includes('crédito') || formaPagamento.includes('credito')) {
            entradasPorMetodoCalculadas.cartaoCredito += l.valor;
            entradasPorMetodoCalculadas.cartao += l.valor;
          } else if (formaPagamento.includes('débito') || formaPagamento.includes('debito')) {
            entradasPorMetodoCalculadas.cartaoDebito += l.valor;
            entradasPorMetodoCalculadas.cartao += l.valor;
          } else if (formaPagamento.includes('boleto')) entradasPorMetodoCalculadas.boleto += l.valor;
          else if (formaPagamento.includes('transferência') || formaPagamento.includes('transferencia')) entradasPorMetodoCalculadas.transferenciaBancaria += l.valor;
          else entradasPorMetodoCalculadas.outros += l.valor;
        } else if (l.tipo === 'despesa' && l.status === 'pago') {
          totalSaidasLancamentos += l.valor;
        }
      });
      
      // Processar Vendas do PDV (Balcão)
      // ATENÇÃO: Esta seção pode causar dupla contagem se as vendas do PDV também gerarem `LancamentoFinanceiro`
      // que já foram processados acima. O ideal é que `entradasPorMetodoCalculadas` seja populado *apenas*
      // por `lancamentosDoDia`, e que todas as vendas PDV gerem um `LancamentoFinanceiro` com `formaPagamento`.
      // Por ora, somamos as vendas PDV aqui, assumindo que elas podem não ter gerado um lançamento financeiro detalhado
      // ou para garantir que não sejam perdidas se a lógica de geração de lançamentos não for completa.
      vendasDoDia.forEach(venda => {
        if (venda.status === 'Concluída') {
            // Para evitar dupla contagem, só somaremos a venda se não encontrarmos um lançamento correspondente já contabilizado.
            const lancamentoDaVendaExistente = lancamentosDoDia.find(l => l.vendaId === venda.id && l.tipo === 'receita');
            if (!lancamentoDaVendaExistente) {
                // Se não há lançamento para esta venda (ou se a lógica de lançamento não inclui forma de pagamento),
                // então adicionamos aqui.
                // No futuro, o ideal é que a venda gere um lançamento que já seja pego pela lógica anterior.
                switch (venda.formaPagamento) {
                case 'dinheiro': entradasPorMetodoCalculadas.dinheiro += venda.totalVenda; break;
                case 'pix': entradasPorMetodoCalculadas.pix += venda.totalVenda; break;
                case 'cartao_credito': entradasPorMetodoCalculadas.cartaoCredito += venda.totalVenda; entradasPorMetodoCalculadas.cartao += venda.totalVenda; break;
                case 'cartao_debito': entradasPorMetodoCalculadas.cartaoDebito += venda.totalVenda; entradasPorMetodoCalculadas.cartao += venda.totalVenda; break;
                case 'boleto': entradasPorMetodoCalculadas.boleto += venda.totalVenda; break;
                default: entradasPorMetodoCalculadas.outros += venda.totalVenda;
                }
                // Se a venda não gerou lançamento, ela também contribui para o total de entradas.
                totalEntradasLancamentos += venda.totalVenda;
            }
        }
      });

      setCaixaDiario({ totalEntradasLancamentos, totalSaidasLancamentos, entradasPorMetodoCalculadas });

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
            setFechamentosDoDia(snapshotFechamentosHoje.size);
          }
          await fetchLastClosingAndSuggestTroco(user.uid);
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
      setFechamentosDoDia(prev => prev + 1);
      fetchDataDiaria(); 
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
                    O "Total de Entradas" acima refere-se a todos os lançamentos de receita efetivados. O detalhamento "Entradas por Método" agora inclui receitas de Ordens de Serviço e Vendas, agrupadas pela forma de pagamento registrada no sistema. Para um resumo preciso, certifique-se de que as formas de pagamento estejam corretamente registradas nos lançamentos e vendas.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Fechamento</CardTitle>
                {fechamentosDoDia > 0 && (
                    <Alert variant="default" className="border-orange-500 bg-orange-50 dark:bg-orange-900/30 mt-2">
                        <History className="h-4 w-4 text-orange-700 dark:text-orange-400" />
                        <AlertTitle className="text-orange-700 dark:text-orange-400">Caixa Já Fechado Hoje</AlertTitle>
                        <AlertDescription className="text-orange-600 dark:text-orange-300">
                            Já existe(m) {fechamentosDoDia} fechamento(s) registrado(s) hoje. Um novo fechamento pode ser adicionado se necessário (ex: correção ou fechamento complementar). O último fechamento geral é usado para sugerir o troco inicial.
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
                           <AlertDialogDescription>
                             Revise os valores antes de confirmar:
                             <ul className="list-disc pl-5 my-2 text-sm text-foreground">
                               <li>Total Entradas (Dia): <span className="font-semibold">R$ {confirmationData?.totalEntradasLancamentos.toFixed(2)}</span></li>
                               <li>Total Saídas (Dia): <span className="font-semibold">R$ {confirmationData?.totalSaidasLancamentos.toFixed(2)}</span></li>
                               <li>Troco Inicial: <span className="font-semibold">R$ {(confirmationData?.trocoInicial || 0).toFixed(2)}</span></li>
                               <li>Sangrias: <span className="font-semibold">R$ {(confirmationData?.sangrias || 0).toFixed(2)}</span></li>
                               <li className="mt-1">Saldo Final Esperado no Caixa: <strong className="text-lg">R$ {confirmationData?.saldoFinal.toFixed(2)}</strong></li>
                             </ul>
                             Esta ação registrará um novo fechamento de caixa. Deseja continuar?
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

