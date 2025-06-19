
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListChecks, AlertTriangle, Info } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { getAllLancamentosFinanceirosByUserId } from '@/services/lancamentoFinanceiroService';
import type { LancamentoFinanceiro, LancamentoStatus, LancamentoTipo } from '@/schemas/lancamentoFinanceiroSchema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button'; // Import Button

export default function LancamentosFinanceirosPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLancamentos = useCallback(async () => {
    if (!user?.uid) {
      setIsLoadingData(false);
      if (!isAuthLoading) { // Apenas redireciona se a autenticação já foi verificada
        router.push('/login?redirect=/financeiro/lancamentos');
      }
      return;
    }
    setIsLoadingData(true);
    setError(null);
    try {
      const data = await getAllLancamentosFinanceirosByUserId(user.uid, 'data', 'desc');
      setLancamentos(data);
    } catch (err: any) {
      console.error("Erro ao buscar lançamentos:", err);
      setError(err.message || "Falha ao buscar lançamentos.");
    } finally {
      setIsLoadingData(false);
    }
  }, [user, router, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading) { // Executa fetchLancamentos apenas quando o estado de autenticação estiver resolvido
        fetchLancamentos();
    }
  }, [fetchLancamentos, isAuthLoading]);

  const getStatusVariant = (status: LancamentoStatus) => {
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800 border-green-300'; // Despesa paga
      case 'recebido': return 'bg-blue-100 text-blue-800 border-blue-300'; // Receita recebida
      case 'pendente': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getTipoVariant = (tipo: LancamentoTipo) => {
    return tipo === 'receita' ? 'bg-emerald-500/20 text-emerald-700 border-emerald-400' : 'bg-rose-500/20 text-rose-700 border-rose-400';
  };

  if (isAuthLoading || (!user && isLoadingData)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && !isLoadingData) {
     return (
        <Card>
            <CardHeader>
                <CardTitle>Acesso Negado</CardTitle>
            </CardHeader>
            <CardContent>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Autenticação Necessária</AlertTitle>
                    <AlertDescription>
                        Você precisa estar logado para ver seus lançamentos financeiros.
                    </AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/login?redirect=/financeiro/lancamentos')} className="mt-4">
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
          <ListChecks className="h-8 w-8" />
          Lançamentos Financeiros
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Visualize o histórico de todas as suas transações financeiras.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <div>
            <CardTitle>Histórico de Lançamentos</CardTitle>
            <CardDescription>
              {isLoadingData ? "Carregando seus lançamentos..." : 
                (error ? "Erro ao carregar lançamentos." : 
                  (lancamentos.length > 0 ? `Exibindo ${lancamentos.length} lançamento(s).` : "Nenhum lançamento encontrado.")
                )
              }
            </CardDescription>
          </div>
          {/* Futuramente, adicionar filtros aqui (data, tipo, categoria, etc.) */}
        </CardHeader>
        <CardContent>
          {isLoadingData && (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2">Carregando...</p>
            </div>
          )}

          {!isLoadingData && error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro ao Carregar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isLoadingData && !error && lancamentos.length === 0 && (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nenhum Lançamento</AlertTitle>
                <AlertDescription>
                Você ainda não possui lançamentos financeiros registrados. 
                As vendas e pagamentos de Ordens de Serviço gerarão lançamentos automaticamente.
                </AlertDescription>
            </Alert>
          )}

          {!isLoadingData && !error && lancamentos.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Título/Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentos.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell>{format(lancamento.data, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                      <TableCell className="font-medium">{lancamento.titulo}</TableCell>
                      <TableCell className="hidden sm:table-cell">{lancamento.categoria}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={getTipoVariant(lancamento.tipo)}>
                          {lancamento.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-semibold ${lancamento.tipo === 'receita' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {lancamento.valor.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge variant="outline" className={getStatusVariant(lancamento.status)}>
                          {lancamento.status.charAt(0).toUpperCase() + lancamento.status.slice(1)}
                        </Badge>
                      </TableCell>
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
