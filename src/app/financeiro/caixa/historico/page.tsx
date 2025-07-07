
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, AlertTriangle, Info, DollarSign, ArrowUpCircle, ArrowDownCircle, MinusCircle } from "lucide-react";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllSessoesFechadasByUserId } from '@/services/sessaoCaixaService';
import type { SessaoCaixa, EntradasPorMetodo } from '@/schemas/sessaoCaixaSchema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function HistoricoCaixaPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [sessoes, setSessoes] = useState<SessaoCaixa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessoes = useCallback(async () => {
    if (!user?.uid) {
      if (!isAuthenticating) {
        router.push('/login?redirect=/financeiro/caixa/historico');
      }
      return;
    }
    setIsLoadingData(true);
    setError(null);
    try {
      const data = await getAllSessoesFechadasByUserId(user.uid);
      setSessoes(data);
    } catch (err: any) {
      console.error("Erro ao buscar histórico de sessões:", err);
      setError(err.message || "Falha ao buscar o histórico.");
    } finally {
      setIsLoadingData(false);
    }
  }, [user, router, isAuthenticating]);

  useEffect(() => {
    if (!isAuthenticating) {
      fetchSessoes();
    }
  }, [fetchSessoes, isAuthenticating]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return format(date, "dd/MM/yy 'às' HH:mm", { locale: ptBR });
  }

  if (isAuthenticating || (!user && isLoadingData)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !isAuthenticating) {
     return (
        <Card>
            <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Autenticação Necessária</AlertTitle>
                    <AlertDescription>
                        Você precisa estar logado para ver o histórico.
                    </AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/login?redirect=/financeiro/caixa/historico')} className="mt-4">
                    Fazer Login
                </Button>
            </CardContent>
        </Card>
     );
  }

  const renderPaymentMethods = (methods: EntradasPorMetodo | null | undefined) => {
    if (!methods) return <p className="text-sm text-muted-foreground">Nenhum detalhe de pagamento disponível.</p>;
    
    const paymentDetails = [
      { label: "Dinheiro", value: methods.dinheiro },
      { label: "PIX", value: methods.pix },
      { label: "Cartão de Crédito", value: methods.cartaoCredito },
      { label: "Cartão de Débito", value: methods.cartaoDebito },
      { label: "Boleto", value: methods.boleto },
      { label: "Transferência", value: methods.transferenciaBancaria },
      { label: "Outros", value: methods.outros },
    ].filter(detail => detail.value > 0);

    if (paymentDetails.length === 0) {
      return <p className="text-sm text-muted-foreground">Nenhuma entrada registrada por métodos de pagamento.</p>;
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
        {paymentDetails.map(detail => (
          <div key={detail.label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{detail.label}:</span>
            <span className="font-medium">{formatCurrency(detail.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <History className="h-8 w-8" />
          Histórico de Caixa
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Consulte o registro de todas as sessões de caixa abertas e fechadas.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Sessões de Caixa Anteriores</CardTitle>
          <CardDescription>
            {isLoadingData ? "Carregando histórico..." : 
              (error ? "Erro ao carregar histórico." : 
                (sessoes.length > 0 ? `Exibindo ${sessoes.length} sessão(ões) fechada(s). Clique para ver detalhes.` : "Nenhuma sessão de caixa fechada encontrada.")
              )
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Carregando...</p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : sessoes.length === 0 ? (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nenhum Histórico</AlertTitle>
                <AlertDescription>
                  Ainda não há sessões de caixa fechadas para exibir.
                </AlertDescription>
            </Alert>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {sessoes.map((sessao) => (
                <AccordionItem value={sessao.id} key={sessao.id}>
                  <AccordionTrigger className="hover:bg-muted/50 px-4 rounded-md">
                    <div className="flex justify-between items-center w-full">
                      <div className="text-left">
                        <p className="font-semibold">{formatDateTime(sessao.dataFechamento)}</p>
                        <p className="text-sm text-muted-foreground">Por: {sessao.responsavelFechamentoNome || 'N/A'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatCurrency(sessao.saldoFinalCalculado)}</p>
                        <p className="text-sm text-muted-foreground">Saldo Final</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pt-3 pb-4 border-t bg-muted/20">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-md">Detalhes da Sessão</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground"/><span>Troco Inicial:</span><span className="font-medium ml-auto">{formatCurrency(sessao.trocoInicial)}</span></div>
                        <div className="flex items-center gap-2 text-green-600"><ArrowUpCircle className="h-4 w-4"/><span>Total Entradas:</span><span className="font-medium ml-auto">{formatCurrency(sessao.totalEntradasCalculado)}</span></div>
                        <div className="flex items-center gap-2 text-red-600"><ArrowDownCircle className="h-4 w-4"/><span>Total Saídas:</span><span className="font-medium ml-auto">{formatCurrency(sessao.totalSaidasCalculado)}</span></div>
                        <div className="flex items-center gap-2 text-orange-600"><MinusCircle className="h-4 w-4"/><span>Sangrias:</span><span className="font-medium ml-auto">{formatCurrency(sessao.sangrias)}</span></div>
                      </div>
                      <div className="pt-2">
                        <h5 className="font-semibold text-sm mb-1">Entradas por Método:</h5>
                        {renderPaymentMethods(sessao.entradasPorMetodo)}
                      </div>
                      {sessao.observacoes && (
                        <div className="pt-2">
                          <h5 className="font-semibold text-sm mb-1">Observações:</h5>
                          <p className="text-sm text-muted-foreground italic bg-background/50 p-2 rounded-md">{sessao.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
