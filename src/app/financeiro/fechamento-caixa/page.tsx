
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Loader2, DollarSign, TrendingUp, TrendingDown, AlertCircle, Info, Printer, Calculator, Lock, Unlock, History } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useCashBox } from '@/contexts/CashBoxContext';
import { getLancamentosByUserIdAndDateRange } from '@/services/lancamentoFinanceiroService';
import { abrirSessaoCaixa, fecharSessaoCaixa } from '@/services/sessaoCaixaService';
import type { SessaoCaixaUpdateData } from '@/schemas/sessaoCaixaSchema';
import type { EntradasPorMetodo } from '@/schemas/fechamentoCaixaSchema';
import { FechamentoCaixaFormSchema, EntradasPorMetodoSchema } from '@/schemas/fechamentoCaixaSchema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AbrirCaixaForm } from '@/components/cash-box/AbrirCaixaForm';

// --- Sub-componente para Fechar o Caixa ---
const FecharCaixaForm = () => {
    const { user } = useAuth();
    const { activeSession, mutate } = useCashBox();
    const { toast } = useToast();
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [caixaDiario, setCaixaDiario] = useState({
      totalEntradas: 0,
      totalSaidas: 0,
      entradasPorMetodo: EntradasPorMetodoSchema.parse({}),
    });
    const [confirmationData, setConfirmationData] = useState<any>(null);

    const form = useForm({
        resolver: zodResolver(FechamentoCaixaFormSchema),
        defaultValues: { sangrias: 0, observacoes: "" },
    });
    
    const sangrias = form.watch("sangrias", 0);
    
    const saldoFinalCaixa = useMemo(() => {
        const troco = activeSession?.trocoInicial || 0;
        return (caixaDiario.totalEntradas + troco) - caixaDiario.totalSaidas - sangrias;
    }, [activeSession, caixaDiario, sangrias]);


    const fetchDataDaSessao = useCallback(async () => {
        if (!user?.uid || !activeSession) return;

        setIsLoadingData(true);
        try {
            const inicioSessao = activeSession.dataAbertura;
            const fimSessao = new Date(); // Até o momento atual

            // ÚNICA FONTE DA VERDADE: lancamentosFinanceiros
            const lancamentos = await getLancamentosByUserIdAndDateRange(user.uid, inicioSessao, fimSessao);
            
            let totalEntradas = 0;
            let totalSaidas = 0;
            const entradasPorMetodoTemp: Record<keyof EntradasPorMetodo, number> = {
                dinheiro: 0, pix: 0, cartaoCredito: 0, cartaoDebito: 0, cartao: 0, boleto: 0, transferenciaBancaria: 0, outros: 0
            };
            
            lancamentos.forEach(l => {
                if (l.tipo === 'receita' && l.status === 'recebido') {
                    totalEntradas += l.valor;
                    const formaPagamento = l.formaPagamento || 'outros';
                    switch (formaPagamento) {
                        case 'dinheiro':
                            entradasPorMetodoTemp.dinheiro += l.valor;
                            break;
                        case 'pix':
                            entradasPorMetodoTemp.pix += l.valor;
                            break;
                        case 'cartao_credito':
                            entradasPorMetodoTemp.cartaoCredito += l.valor;
                            entradasPorMetodoTemp.cartao += l.valor;
                            break;
                        case 'cartao_debito':
                            entradasPorMetodoTemp.cartaoDebito += l.valor;
                            entradasPorMetodoTemp.cartao += l.valor;
                            break;
                        case 'boleto':
                            entradasPorMetodoTemp.boleto += l.valor;
                            break;
                        case 'transferencia_bancaria':
                            entradasPorMetodoTemp.transferenciaBancaria += l.valor;
                            break;
                        default:
                            entradasPorMetodoTemp.outros += l.valor;
                            break;
                    }
                } else if (l.tipo === 'despesa' && l.status === 'pago') {
                    totalSaidas += l.valor;
                }
            });

            setCaixaDiario({
                totalEntradas,
                totalSaidas,
                entradasPorMetodo: EntradasPorMetodoSchema.parse(entradasPorMetodoTemp),
            });

        } catch (error: any) {
            toast({ title: "Erro ao buscar dados da sessão", description: error.message, variant: "destructive" });
        } finally {
            setIsLoadingData(false);
        }
    }, [user, activeSession, toast]);

    useEffect(() => {
        fetchDataDaSessao();
    }, [fetchDataDaSessao]);

    const handleOpenConfirmation = (values: { sangrias: number, observacoes?: string }) => {
        setConfirmationData({
            ...values,
            ...caixaDiario,
            trocoInicial: activeSession?.trocoInicial,
            saldoFinal: saldoFinalCaixa,
        });
    };

    const finalSubmitFechamento = async () => {
        if (!user?.uid || !activeSession || !confirmationData) return;

        setIsSubmitting(true);
        try {
            const dadosFechamento: Omit<SessaoCaixaUpdateData, 'status' | 'dataFechamento'> = {
                totalEntradasCalculado: confirmationData.totalEntradas,
                totalSaidasCalculado: confirmationData.totalSaidas,
                sangrias: confirmationData.sangrias,
                saldoFinalCalculado: confirmationData.saldoFinal,
                entradasPorMetodo: confirmationData.entradasPorMetodo,
                responsavelFechamentoNome: user.displayName || user.email || 'Usuário desconhecido',
                responsavelFechamentoId: user.uid,
                observacoes: confirmationData.observacoes,
            };
            await fecharSessaoCaixa(activeSession.id, dadosFechamento);
            toast({ title: "Caixa Fechado!", description: "A sessão de caixa foi encerrada com sucesso." });
            mutate();
        } catch (error: any) {
            toast({ title: "Erro ao Fechar Caixa", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
            setConfirmationData(null);
        }
    };
    
    if (!activeSession) return null; // Should not happen if logic in parent is correct
    
     if (isLoadingData) {
        return <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Carregando dados da sessão de caixa...</p>
        </div>
     }


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo da Sessão</CardTitle>
                <CardDescription>Valores calculados desde a abertura do caixa em {format(activeSession.dataAbertura, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <span className="font-medium text-green-700 dark:text-green-400 flex items-center"><TrendingUp className="mr-2 h-5 w-5" />Total de Entradas na Sessão:</span>
                  <span className="font-bold text-lg text-green-700 dark:text-green-400">R$ {caixaDiario.totalEntradas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/30 rounded-md">
                  <span className="font-medium text-red-700 dark:text-red-400 flex items-center"><TrendingDown className="mr-2 h-5 w-5" />Total de Saídas na Sessão:</span>
                  <span className="font-bold text-lg text-red-700 dark:text-red-400">R$ {caixaDiario.totalSaidas.toFixed(2)}</span>
                </div>
                
                <Separator />
                <h4 className="font-semibold">Entradas por Método na Sessão:</h4>
                <div className="text-sm space-y-1 pl-2">
                  <p>Dinheiro: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.dinheiro.toFixed(2)}</span></p>
                  <p>PIX: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.pix.toFixed(2)}</span></p>
                  <p>Cartão de Crédito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.cartaoCredito.toFixed(2)}</span></p>
                  <p>Cartão de Débito: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.cartaoDebito.toFixed(2)}</span></p>
                  <p>Boleto: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.boleto.toFixed(2)}</span></p>
                  <p>Transferência: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.transferenciaBancaria.toFixed(2)}</span></p>
                  <p>Outros: <span className="font-medium">R$ {caixaDiario.entradasPorMetodo.outros.toFixed(2)}</span></p>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="md:col-span-1 space-y-6">
             <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5"/>Fechar o Caixa</CardTitle>
                <CardDescription>Troco inicial desta sessão: R$ {activeSession.trocoInicial.toFixed(2)}</CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleOpenConfirmation)}>
                  <CardContent className="space-y-4">
                     <FormField control={form.control} name="sangrias" render={({ field }) => (
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
                     <FormField control={form.control} name="observacoes" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (Opcional)</FormLabel>
                          <FormControl><Textarea placeholder="Ex: Diferença no caixa, sangria para cofre, etc." {...field} rows={3} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                     <AlertDialog open={!!confirmationData} onOpenChange={(open) => !open && setConfirmationData(null)}>
                       <AlertDialogTrigger asChild>
                         <Button type="submit" className="w-full" disabled={isSubmitting || isLoadingData}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Finalizar Sessão do Caixa
                          </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Confirmar Fechamento de Caixa</AlertDialogTitle>
                           <AlertDialogDescription asChild>
                             <div>
                               <p>Revise os valores antes de confirmar:</p>
                               <ul className="list-disc pl-5 my-2 text-sm text-foreground">
                                 <li>Troco Inicial: <span className="font-semibold">R$ {(confirmationData?.trocoInicial || 0).toFixed(2)}</span></li>
                                 <li>Total Entradas: <span className="font-semibold">R$ {confirmationData?.totalEntradas.toFixed(2)}</span></li>
                                 <li>Total Saídas: <span className="font-semibold">R$ {confirmationData?.totalSaidas.toFixed(2)}</span></li>
                                 <li>Sangrias: <span className="font-semibold">R$ {(confirmationData?.sangrias || 0).toFixed(2)}</span></li>
                                 <li className="mt-1">Saldo Final Esperado no Caixa: <strong className="text-lg">R$ {confirmationData?.saldoFinal.toFixed(2)}</strong></li>
                               </ul>
                               <p>Esta ação encerrará a sessão de caixa atual. Deseja continuar?</p>
                             </div>
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel onClick={() => setConfirmationData(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                           <AlertDialogAction onClick={finalSubmitFechamento} disabled={isSubmitting}>
                             {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Confirmar e Fechar Caixa
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </div>
        </div>
    );
};

export default function GestaoCaixaPage() {
  const { user, isAuthenticating } = useAuth();
  const { activeSession, isLoading: isCashBoxLoading } = useCashBox();
  const router = useRouter();

  if (isAuthenticating || isCashBoxLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!user) {
    router.push('/login?redirect=/financeiro/fechamento-caixa');
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Gestão de Caixa
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          {activeSession ? `Sessão de caixa aberta em ${format(activeSession.dataAbertura, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.` : 'Nenhuma sessão de caixa ativa.'}
        </p>
      </section>
      
      <div className="text-center sm:text-right">
        <Button asChild variant="link">
          <Link href="/financeiro/caixa/historico">
            <History className="mr-2 h-4 w-4" />
            Ver Histórico de Caixa
          </Link>
        </Button>
      </div>

      {activeSession ? <FecharCaixaForm /> : <AbrirCaixaForm />}
    </div>
  );
}
