// Otimizado e corrigido: ProdutosServicosPage
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection, query, where, getDocs, Timestamp, orderBy, limit, type Firestore
} from 'firebase/firestore';
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseInstances } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, PlusCircle, BarChart3, Users,
  Package, Settings, ActivitySquare, ListOrdered,
  CheckCircle, AlertTriangle, Loader2, FilePlus2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgendamentoResumo {
  id: string;
  clienteNome: string;
  servicoNome: string;
  dataHora: Date;
  status: string;
}

interface ResumoOperacional {
  osConcluidasHoje: number;
  vendasHojeValor: number;
  osAtrasadas: number;
  novasOsHoje: number; // Novo campo
}

export default function ProdutosServicosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [agendaHoje, setAgendaHoje] = useState<AgendamentoResumo[]>([]);
  const [resumoOperacional, setResumoOperacional] = useState<ResumoOperacional>({
    osConcluidasHoje: 0,
    vendasHojeValor: 0,
    osAtrasadas: 0,
    novasOsHoje: 0, // Inicializa o novo campo
  });
  const [loading, setLoading] = useState({ agenda: true, resumo: true });

  const userId = user?.uid || 'bypass_user_placeholder';

  const getStatusClass = (status: string): string => {
    const map: Record<string, string> = {
      Pendente: 'border-blue-500 bg-blue-50 text-blue-700',
      'Em Andamento': 'border-yellow-500 bg-yellow-50 text-yellow-700',
      Concluído: 'border-green-500 bg-green-50 text-green-700',
      Cancelado: 'border-red-500 bg-red-50 text-red-700',
    };
    return map[status] || 'border-gray-500 bg-gray-50 text-gray-700';
  };

  const fetchAgendaHoje = useCallback(async () => {
    setLoading(prev => ({ ...prev, agenda: true }));
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para buscar agenda.", variant: "destructive" });
      setLoading(prev => ({ ...prev, agenda: false }));
      return;
    }

    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      const q = query(
        collection(dbInstance, 'agendamentos'),
        where('userId', '==', userId),
        where('dataHora', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataHora', '<=', Timestamp.fromDate(hojeFim)),
        orderBy('dataHora', 'asc'),
        limit(5) // Aumentado para 5
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataHora: (doc.data().dataHora as Timestamp).toDate(),
      })) as AgendamentoResumo[];
      setAgendaHoje(data);
    } catch (e: any) {
      console.error('Erro na agenda:', e);
      toast({ title: "Erro ao buscar agenda", description: e.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, agenda: false }));
    }
  }, [userId, toast]);

  const fetchResumo = useCallback(async () => {
    setLoading(prev => ({ ...prev, resumo: true }));
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para buscar resumo.", variant: "destructive" });
      setLoading(prev => ({ ...prev, resumo: false }));
      return;
    }

    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      let osConcluidasHoje = 0, vendasHojeValor = 0, osAtrasadas = 0, novasOsHoje = 0;

      // OS Concluídas Hoje
      const osConcluidasSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        where('userId', '==', userId),
        where('status', '==', 'Concluído'),
        where('updatedAt', '>=', Timestamp.fromDate(hojeInicio)), // updatedAt pode não ser ideal, mas é o que temos
        where('updatedAt', '<=', Timestamp.fromDate(hojeFim))
      ));
      osConcluidasHoje = osConcluidasSnap.size;

      // Vendas de Hoje
      const vendasSnap = await getDocs(query(
        collection(dbInstance, 'vendas'),
        where('userId', '==', userId),
        where('dataVenda', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataVenda', '<=', Timestamp.fromDate(hojeFim))
      ));
      vendasSnap.forEach(doc => {
        if (typeof doc.data().totalVenda === 'number') {
            vendasHojeValor += doc.data().totalVenda;
        }
      });

      // OS em Atraso
      const atrasadasSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        where('userId', '==', userId),
        where('dataEntrega', '<', Timestamp.fromDate(hojeInicio))
        // Adicionar filtro para status !== 'Concluído' e !== 'Cancelado'
      ));
      atrasadasSnap.forEach(doc => {
        const status = doc.data().status;
        if (status === 'Pendente' || status === 'Em Andamento') {
            osAtrasadas++;
        }
      });
      
      // Novas OS Criadas Hoje
      const novasOsSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        where('userId', '==', userId),
        where('createdAt', '>=', Timestamp.fromDate(hojeInicio)),
        where('createdAt', '<=', Timestamp.fromDate(hojeFim))
      ));
      novasOsHoje = novasOsSnap.size;

      setResumoOperacional({ osConcluidasHoje, vendasHojeValor, osAtrasadas, novasOsHoje });
    } catch (e:any) {
      console.error('Erro resumo operacional:', e);
      toast({ title: "Erro ao buscar resumo", description: e.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, resumo: false }));
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) { 
        fetchAgendaHoje();
        fetchResumo();
    }
  }, [fetchAgendaHoje, fetchResumo, userId]);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">Dashboard Operacional Diário</h2>
        <p className="mt-4 text-lg text-muted-foreground">Visão geral da sua operação hoje.</p>
      </section>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OS Concluídas Hoje</CardTitle>
            <CheckCircle className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            {loading.resumo ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{resumoOperacional.osConcluidasHoje}</div>}
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Novas OS Hoje</CardTitle>
            <FilePlus2 className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            {loading.resumo ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{resumoOperacional.novasOsHoje}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendas de Hoje (R$)</CardTitle>
            <BarChart3 className="h-5 w-5 text-indigo-500" />
          </CardHeader>
          <CardContent>
          {loading.resumo ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">R$ {resumoOperacional.vendasHojeValor.toFixed(2)}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OS em Atraso</CardTitle>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {loading.resumo ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{resumoOperacional.osAtrasadas}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Agenda para Hoje</CardTitle>
            <CardDescription>Próximos 5 compromissos de hoje.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading.agenda ? (
              <div className="flex justify-center items-center h-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : agendaHoje.length > 0 ? (
              <ul className="space-y-3">
                {agendaHoje.map(ag => (
                  <li key={ag.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium">{ag.servicoNome}</p>
                      <p className="text-sm text-muted-foreground">{ag.clienteNome} - {format(ag.dataHora, 'HH:mm', { locale: ptBR })}</p>
                    </div>
                    <Badge variant="outline" className={getStatusClass(ag.status)}>{ag.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum agendamento para hoje.</p>
            )}
            <Button variant="outline" className="mt-4 w-full" asChild><Link href="/produtos-servicos/agenda">Ver Agenda Completa</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ActivitySquare className="h-5 w-5 text-primary" /> Ações Rápidas</CardTitle>
            <CardDescription>Principais funcionalidades do módulo.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button asChild size="lg" className="h-auto py-4 flex-col">
              <Link href="/produtos-servicos/atendimentos/novo">
                <PlusCircle className="mb-1 h-6 w-6" /> Nova OS
              </Link>
            </Button>
            <Button asChild size="lg" className="h-auto py-4 flex-col">
              <Link href="/produtos-servicos/balcao">
                <Package className="mb-1 h-6 w-6" /> Balcão PDV
              </Link>
            </Button>
            <Button asChild size="lg" className="h-auto py-4 flex-col" variant="secondary">
              <Link href="/produtos-servicos/clientes">
                <Users className="mb-1 h-6 w-6" /> Clientes
              </Link>
            </Button>
            <Button asChild size="lg" className="h-auto py-4 flex-col" variant="secondary">
              <Link href="/produtos-servicos/produtos">
                <ListOrdered className="mb-1 h-6 w-6" /> Produtos/Serviços
              </Link>
            </Button>
             <Button asChild size="lg" className="h-auto py-4 flex-col" variant="outline">
              <Link href="/produtos-servicos/producao">
                <Settings className="mb-1 h-6 w-6" /> Controle de Produção
              </Link>
            </Button>
             <Button asChild size="lg" className="h-auto py-4 flex-col" variant="outline">
              <Link href="/produtos-servicos/estoque">
                <BarChart3 className="mb-1 h-6 w-6" /> Controle de Estoque
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
