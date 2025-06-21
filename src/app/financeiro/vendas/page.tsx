
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingBag, AlertTriangle, Info, Calendar, User, CreditCard } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { getAllVendasByUserId } from '@/services/vendaService';
import type { Venda, VendaStatus } from '@/schemas/vendaSchema';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function HistoricoVendasPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVendas = useCallback(async () => {
    if (!user?.uid) {
      if (!isAuthLoading) router.push('/login?redirect=/financeiro/vendas');
      return;
    }
    setIsLoadingData(true);
    setError(null);
    try {
      const data = await getAllVendasByUserId(user.uid, 'dataVenda', 'desc');
      setVendas(data);
    } catch (err: any) {
      console.error("Erro ao buscar histórico de vendas:", err);
      setError(err.message || "Falha ao buscar o histórico.");
    } finally {
      setIsLoadingData(false);
    }
  }, [user, router, isAuthLoading]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchVendas();
    }
  }, [fetchVendas, isAuthLoading]);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  
  const getStatusVariant = (status?: VendaStatus): 'default' | 'destructive' | 'outline' => {
    switch (status) {
      case 'Concluída': return 'default';
      case 'Cancelada': return 'destructive';
      default: return 'outline';
    }
  };

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
                    <AlertDescription>Você precisa estar logado para ver o histórico.</AlertDescription>
                </Alert>
                <Button onClick={() => router.push('/login?redirect=/financeiro/vendas')} className="mt-4">
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
          <ShoppingBag className="h-8 w-8" />
          Histórico de Vendas
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Consulte o registro detalhado de todas as vendas realizadas no sistema.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Vendas Realizadas</CardTitle>
          <CardDescription>
            {isLoadingData ? "Carregando histórico..." : 
              (error ? "Erro ao carregar histórico." : 
                (vendas.length > 0 ? `Exibindo ${vendas.length} venda(s).` : "Nenhuma venda encontrada.")
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
          ) : vendas.length === 0 ? (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Nenhum Histórico</AlertTitle>
                <AlertDescription>Ainda não há vendas registradas para exibir.</AlertDescription>
            </Alert>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {vendas.map((venda) => (
                <AccordionItem value={venda.id} key={venda.id}>
                  <AccordionTrigger>
                    <div className="flex justify-between items-center w-full pr-4">
                      <div className="flex flex-col sm:flex-row sm:items-center text-left gap-x-4 gap-y-1">
                          <span className="font-semibold flex items-center gap-1.5"><Calendar className="h-4 w-4"/> {format(venda.dataVenda, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</span>
                          <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-4 w-4"/> {venda.clienteNome}</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <Badge variant={getStatusVariant(venda.status)}>{venda.status || 'N/A'}</Badge>
                        <span className="font-bold text-lg">{formatCurrency(venda.totalVenda)}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="p-4 bg-muted/50 rounded-md">
                        <div className="flex justify-between items-center mb-3 text-sm">
                            <span className="font-medium flex items-center gap-1.5"><CreditCard className="h-4 w-4"/>Forma de Pagamento: <Badge variant="outline">{venda.formaPagamento}</Badge></span>
                            <span className="text-muted-foreground">ID Venda: {venda.id.substring(0, 8)}...</span>
                        </div>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produto/Serviço</TableHead>
                                        <TableHead className="text-center">Qtd.</TableHead>
                                        <TableHead className="text-right">Val. Unitário</TableHead>
                                        <TableHead className="text-right">Total Item</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {venda.itens.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{item.nome}</TableCell>
                                            <TableCell className="text-center">{item.quantidade}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.valorUnitario)}</TableCell>
                                            <TableCell className="text-right">{formatCurrency(item.valorTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
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
