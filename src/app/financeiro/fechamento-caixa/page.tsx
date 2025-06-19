
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
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertCircle, Info, Printer, Calculator } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FechamentoCaixaFormSchema, type FechamentoCaixaFormValues, type EntradasPorMetodo } from '@/schemas/fechamentoCaixaSchema';
import type { LancamentoFinanceiro } from '@/schemas/lancamentoFinanceiroSchema';
import type { Venda } from '@/schemas/vendaSchema'; // Removido FormaPagamento pois não é usado diretamente aqui
import { getLancamentosByUserIdAndDateRange } from '@/services/lancamentoFinanceiroService';
import { getVendasByUserIdAndDateRange } from '@/services/vendaService';
import { createFechamentoCaixa, getAllFechamentosCaixaByUserId } from '@/services/fechamentoCaixaService';
import { startOfDay, endOfDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CaixaDiarioCalculado {
  totalEntradasLancamentos: number; // Renomeado para clareza
  totalSaidasLancamentos: number;   // Renomeado para clareza
  entradasPorMetodoVendas: EntradasPorMetodo; // Renomeado para clareza
}

export default function FechamentoCaixaPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [caixaDiario, setCaixaDiario] = useState<CaixaDiarioCalculado>({
    totalEntradasLancamentos: 0,
    totalSaidasLancamentos: 0,
    entradasPorMetodoVendas: { dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, outros: 0 },
  });

  const form = useForm<FechamentoCaixaFormValues>({
    resolver: zodResolver(FechamentoCaixaFormSchema),
    defaultValues: {
      trocoInicial: 0,
      sangrias: 0,
      observacoes: "",
    },
  });

  const { watch, setValue } = form; // Adicionado setValue
  const trocoInicial = watch("trocoInicial", 0);
  const sangrias = watch("sangrias", 0);

  const saldoFinalCaixa = useMemo(() => {
    const entradas = caixaDiario.totalEntradasLancamentos || 0;
    const saidas = caixaDiario.totalSaidasLancamentos || 0;
    const troco = trocoInicial || 0;
    const sang = sangrias || 0;
    return (entradas + troco) - saidas - sang;
  }, [caixaDiario.totalEntradasLancamentos, caixaDiario.totalSaidasLancamentos, trocoInicial, sangrias]);

  // Função para buscar o último fechamento e sugerir troco inicial
  const fetchLastClosingAndSuggestTroco = useCallback(async (userId: string) => {
    try {
      const historicoFechamentos = await getAllFechamentosCaixaByUserId(userId, 'dataFechamento', 'desc');
      if (historicoFechamentos.length > 0) {
        const ultimoFechamento = historicoFechamentos[0];
        setValue("trocoInicial", ultimoFechamento.saldoFinalCalculado, { shouldValidate: true });
        toast({
            title: "Troco Inicial Sugerido",
            description: `Baseado no saldo final de R$ ${ultimoFechamento.saldoFinalCalculado.toFixed(2)} do último fechamento.`,
            duration: 7000
        });
      }
    } catch (error: any) {
      console.error("Erro ao buscar último fechamento de caixa:", error);
      // Não mostra toast para erro aqui, para não poluir se for um usuário novo sem histórico
    }
  }, [setValue, toast]);


  const fetchDataDiaria = useCallback(async () => {
    if (!user?.uid) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    await fetchLastClosingAndSuggestTroco(user.uid); // Busca troco antes dos dados do dia
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());

      const [lancamentosDoDia, vendasDoDia] = await Promise.all([
        getLancamentosByUserIdAndDateRange(user.uid, hojeInicio, hojeFim),
        getVendasByUserIdAndDateRange(user.uid, hojeInicio, hojeFim)
      ]);

      let totalEntradasLancamentos = 0;
      let totalSaidasLancamentos = 0;
      const entradasPorMetodoVendas: EntradasPorMetodo = { dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, outros: 0 };

      lancamentosDoDia.forEach(l => {
        if (l.tipo === 'receita' && (l.status === 'recebido' || l.status === 'pago')) {
          totalEntradasLancamentos += l.valor;
        } else if (l.tipo === 'despesa' && l.status === 'pago') {
          totalSaidasLancamentos += l.valor;
        }
      });
      
      vendasDoDia.forEach(venda => {
        if (venda.status === 'Concluída') {
          switch (venda.formaPagamento) {
            case 'dinheiro':
              entradasPorMetodoVendas.dinheiro += venda.totalVenda;
              break;
            case 'pix':
              entradasPorMetodoVendas.pix += venda.totalVenda;
              break;
            case 'cartao_credito':
              entradasPorMetodoVendas.cartaoCredito += venda.totalVenda;
              entradasPorMetodoVendas.cartao += venda.totalVenda;
              break;
            case 'cartao_debito':
              entradasPorMetodoVendas.cartaoDebito += venda.totalVenda;
              entradasPorMetodoVendas.cartao += venda.totalVenda;
              break;
            default: // Inclui 'boleto', 'transferencia', 'outro'
              entradasPorMetodoVendas.outros += venda.totalVenda;
          }
        }
      });

      setCaixaDiario({ totalEntradasLancamentos, totalSaidasLancamentos, entradasPorMetodoVendas });

    } catch (error: any) {
      toast({ title: "Erro ao buscar dados do dia", description: error.message, variant: "destructive" });
      console.error("Erro ao buscar dados para fechamento de caixa:", error);
    } finally {
      setIsLoadingData(false);
    }
  }, [user?.uid, toast, fetchLastClosingAndSuggestTroco]);

  useEffect(() => {
    if (user && !isAuthLoading) {
      fetchDataDiaria();
    } else if (!user && !isAuthLoading) {
        router.push('/login?redirect=/financeiro/fechamento-caixa');
    }
  }, [user, isAuthLoading, fetchDataDiaria, router]);

  const onSubmit = async (values: FechamentoCaixaFormValues) => {
    if (!user?.uid || !user.displayName) {
      toast({ title: "Erro de Autenticação", description: "Usuário não identificado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const fechamentoData = {
        dataFechamento: new Date(),
        totalEntradasCalculado: caixaDiario.totalEntradasLancamentos,
        totalSaidasCalculado: caixaDiario.totalSaidasLancamentos,
        trocoInicial: values.trocoInicial || 0,
        sangrias: values.sangrias || 0,
        saldoFinalCalculado: saldoFinalCaixa,
        entradasPorMetodo: caixaDiario.entradasPorMetodoVendas,
        responsavelNome: user.displayName,
        responsavelId: user.uid,
        observacoes: values.observacoes || "",
      };
      await createFechamentoCaixa(user.uid, fechamentoData);
      toast({ title: "Fechamento de Caixa Salvo!", description: "O fechamento do caixa foi registrado com sucesso." });
      // Resetar o formulário e recarregar dados para um possível próximo fechamento no mesmo dia (raro) ou para limpar
      form.reset({trocoInicial: 0, sangrias: 0, observacoes: ""}); 
      fetchDataDiaria(); 
    } catch (error: any) {
      toast({ title: "Erro ao Salvar Fechamento", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isAuthLoading || (!user && !isLoadingData && typeof window !== 'undefined')) { // Adicionado check para typeof window
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
                  <span className="font-medium text-green-700 dark:text-green-400 flex items-center"><TrendingUp className="mr-2 h-5 w-5" />Total de Entradas (Lançamentos):</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-400">R$ {caixaDiario.totalEntradasLancamentos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                  <span className="font-medium text-red-700 dark:text-red-400 flex items-center"><TrendingDown className="mr-2 h-5 w-5" />Total de Saídas (Lançamentos):</span>
                  <span className="font-bold text-lg text-red-700 dark:text-red-400">R$ {caixaDiario.totalSaidasLancamentos.toFixed(2)}</span>
                </div>
                
                <Separator />
                <h4 className="font-semibold">Entradas por Método (das Vendas):</h4>
                <div className="text-sm space-y-1 pl-2">
                  <p>Dinheiro: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.dinheiro.toFixed(2)}</span></p>
                  <p>PIX: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.pix.toFixed(2)}</span></p>
                  <p>Cartão de Crédito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.cartaoCredito.toFixed(2)}</span></p>
                  <p>Cartão de Débito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.cartaoDebito.toFixed(2)}</span></p>
                  <p className="text-muted-foreground">Total Cartões (Vendas): <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.cartao.toFixed(2)}</span></p>
                  <p>Outros Métodos (Vendas): <span className="font-medium">R$ {caixaDiario.entradasPorMetodoVendas.outros.toFixed(2)}</span></p>
                </div>
                <Alert variant="default">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Atenção</AlertTitle>
                  <AlertDescription>
                    O "Total de Entradas" refere-se a todos os lançamentos de receita efetivados. O detalhamento "Entradas por Método" é baseado apenas nas vendas concluídas no sistema hoje.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Registrar Fechamento</CardTitle>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
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
                    <p className="text-xs text-muted-foreground">Responsável: {user?.displayName || user?.email}</p>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingData}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Finalizar Fechamento do Caixa
                    </Button>
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
       { !isLoadingData && !user && typeof window !== 'undefined' && ( // Adicionado check para typeof window
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
