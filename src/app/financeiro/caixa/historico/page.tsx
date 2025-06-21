'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, AlertTriangle, Info } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { getAllSessoesFechadasByUserId } from '@/services/sessaoCaixaService';
import type { SessaoCaixa } from '@/schemas/sessaoCaixaSchema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function HistoricoCaixaPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [sessoes, setSessoes] = useState<SessaoCaixa[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessoes = useCallback(async () => {
    if (!user?.uid) {
      if (!isAuthLoading) {
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
  }, [user, router, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchSessoes();
    }
  }, [fetchSessoes, isAuthLoading]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const formatDateTime = (date: Date | null | undefined) => {
    if (!date) return 'N/A';
    return format(date, "dd/MM/yy 'às' HH:mm", { locale: ptBR });
  }

  if (isAuthLoading || (!user && isLoadingData)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !isAuthLoading) {
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
                (sessoes.length > 0 ? `Exibindo ${sessoes.length} sessão(ões) fechada(s).` : "Nenhuma sessão de caixa fechada encontrada.")
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Fechamento</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Troco Inicial</TableHead>
                    <TableHead className="text-right">Entradas</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Saídas</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Sangrias</TableHead>
                    <TableHead className="text-right">Saldo Final</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessoes.map((sessao) => (
                    <TableRow key={sessao.id}>
                      <TableCell className="font-medium">{formatDateTime(sessao.dataFechamento)}</TableCell>
                      <TableCell>{sessao.responsavelFechamentoNome || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sessao.trocoInicial)}</TableCell>
                      <TableCell className="text-right text-emerald-600">{formatCurrency(sessao.totalEntradasCalculado)}</TableCell>
                      <TableCell className="text-right text-rose-600 hidden sm:table-cell">{formatCurrency(sessao.totalSaidasCalculado)}</TableCell>
                      <TableCell className="text-right text-orange-600 hidden sm:table-cell">{formatCurrency(sessao.sangrias)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(sessao.saldoFinalCalculado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
