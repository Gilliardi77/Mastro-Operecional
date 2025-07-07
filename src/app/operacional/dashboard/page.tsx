
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format, startOfDay, endOfDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection, query, where, getDocs, Timestamp, orderBy, limit, type DocumentData
} from 'firebase/firestore';
import { getFirebaseInstances } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, PlusCircle, BarChart3, Users,
  Package, Settings, ActivitySquare, ListOrdered,
  CheckCircle, AlertTriangle, Loader2, FilePlus2, ShoppingCart, ServerIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { OrdemServico, ItemOS } from '@/schemas/ordemServicoSchema';
import type { Venda, ItemVenda } from '@/schemas/vendaSchema';

interface AgendamentoResumo {
  id: string;
  clienteNome: string;
  servicoNome: string;
  dataHora: Date;
  status: string;
}

interface ResumoDiarioOperacional {
  novasOsHoje: number;
  numeroVendasHoje: number;
  clientesAtendidosHoje: number;
  osConcluidasHoje: number;
  produtosVendidosHoje: number;
  osAtrasadas: number;
}

export default function DashboardOperacionalPage() {
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [agendaHoje, setAgendaHoje] = useState<AgendamentoResumo[]>([]);
  const [resumoDiario, setResumoDiario] = useState<ResumoDiarioOperacional>({
    novasOsHoje: 0,
    numeroVendasHoje: 0,
    clientesAtendidosHoje: 0,
    osConcluidasHoje: 0,
    produtosVendidosHoje: 0,
    osAtrasadas: 0,
  });
  const [loading, setLoading] = useState({ agenda: true, resumo: true });
  
  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/operacional/dashboard');
    }
  }, [user, isAuthenticating, router]);

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
    if (!user?.uid) return;
    setLoading(prev => ({ ...prev, agenda: true }));
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      setLoading(prev => ({ ...prev, agenda: false }));
      return;
    }

    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      const q = query(
        collection(dbInstance, 'agendamentos'),
        where('userId', '==', user.uid),
        where('dataHora', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataHora', '<=', Timestamp.fromDate(hojeFim)),
        orderBy('dataHora', 'asc'),
        limit(5)
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
  }, [user, toast]);

  const fetchResumoDiario = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(prev => ({ ...prev, resumo: true }));
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      setLoading(prev => ({ ...prev, resumo: false }));
      return;
    }

    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      let novasOsHoje = 0, numeroVendasHoje = 0, osConcluidasHoje = 0, produtosVendidosHoje = 0, osAtrasadas = 0;
      const clientesAtendidosIds = new Set<string>();

      const novasOsSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        where('userId', '==', user.uid),
        where('createdAt', '>=', Timestamp.fromDate(hojeInicio)),
        where('createdAt', '<=', Timestamp.fromDate(hojeFim))
      ));
      novasOsHoje = novasOsSnap.size;
      novasOsSnap.forEach(doc => {
        const os = doc.data() as OrdemServico;
        if (os.clienteId) clientesAtendidosIds.add(os.clienteId);
        else if (os.clienteNome) clientesAtendidosIds.add(`avulso_${os.clienteNome.toLowerCase().trim()}`);
      });

      const vendasSnap = await getDocs(query(
        collection(dbInstance, 'vendas'),
        where('userId', '==', user.uid),
        where('dataVenda', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataVenda', '<=', Timestamp.fromDate(hojeFim))
      ));
      numeroVendasHoje = vendasSnap.size;
      vendasSnap.forEach(doc => {
        const venda = doc.data() as Venda;
        if (venda.clienteId) clientesAtendidosIds.add(venda.clienteId);
        else if (venda.clienteNome) clientesAtendidosIds.add(`avulso_${venda.clienteNome.toLowerCase().trim()}`);
        if (venda.itens) {
          venda.itens.forEach((item: ItemVenda) => {
            if (item.productType === 'Produto' || (item.manual && !item.productType)) {
              produtosVendidosHoje += item.quantidade;
            }
          });
        }
      });

      const osConcluidasSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        where('userId', '==', user.uid),
        where('status', '==', 'Concluído')
      ));
      osConcluidasSnap.forEach(doc => {
        const os = doc.data() as OrdemServico;
        if (os.updatedAt instanceof Timestamp && isToday(os.updatedAt.toDate())) {
            osConcluidasHoje++;
            if (os.itens) {
               os.itens.forEach((item: ItemOS) => {
                if (item.tipo === 'Produto') {
                  produtosVendidosHoje += item.quantidade;
                }
              });
            }
        }
      });
      
      const osQueryConstraintsAtrasadas = [
        where('userId', '==', user.uid),
        where('dataEntrega', '<', Timestamp.fromDate(hojeInicio)),
        where('status', 'in', ['Pendente', 'Em Andamento'])
      ];
      const atrasadasSnap = await getDocs(query(
        collection(dbInstance, 'ordensServico'),
        ...osQueryConstraintsAtrasadas
      ));
      osAtrasadas = atrasadasSnap.size;

      setResumoDiario({ 
        novasOsHoje, 
        numeroVendasHoje, 
        clientesAtendidosHoje: clientesAtendidosIds.size, 
        osConcluidasHoje, 
        produtosVendidosHoje,
        osAtrasadas 
      });

    } catch (e:any) {
      console.error('Erro ao buscar resumo diário:', e);
      toast({ title: "Erro ao buscar resumo diário", description: e.message, variant: "destructive" });
    } finally {
      setLoading(prev => ({ ...prev, resumo: false }));
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) { 
        fetchAgendaHoje();
        fetchResumoDiario();
    }
  }, [user, fetchAgendaHoje, fetchResumoDiario]);

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const metricCards = [
    { title: "Novas OS Hoje", value: resumoDiario.novasOsHoje, icon: FilePlus2, color: "text-blue-500" },
    { title: "Nº de Vendas Hoje", value: resumoDiario.numeroVendasHoje, icon: ShoppingCart, color: "text-purple-500" },
    { title: "Clientes Atendidos Hoje", value: resumoDiario.clientesAtendidosHoje, icon: Users, color: "text-teal-500" },
    { title: "OS Concluídas Hoje", value: resumoDiario.osConcluidasHoje, icon: CheckCircle, color: "text-green-500" },
    { title: "Produtos Vendidos Hoje", value: resumoDiario.produtosVendidosHoje, icon: Package, color: "text-orange-500" },
    { title: "OS em Atraso", value: resumoDiario.osAtrasadas, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">Dashboard Operacional Diário</h2>
        <p className="mt-4 text-lg text-muted-foreground">Visão geral da sua operação hoje.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metricCards.map(metric => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-5 w-5 ${metric.color || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              {loading.resumo ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{metric.value}</div>}
            </CardContent>
          </Card>
        ))}
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
                      <p className="font-medium truncate max-w-[200px] sm:max-w-xs" title={ag.servicoNome}>{ag.servicoNome}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-xs" title={ag.clienteNome}>{ag.clienteNome} - {format(ag.dataHora, 'HH:mm', { locale: ptBR })}</p>
                    </div>
                    <Badge variant="outline" className={getStatusClass(ag.status)}>{ag.status}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhum agendamento para hoje.</p>
            )}
            <Button variant="outline" className="mt-4 w-full" asChild><Link href="/operacional/agenda">Ver Agenda Completa</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ActivitySquare className="h-5 w-5 text-primary" /> Ações Rápidas</CardTitle>
            <CardDescription>Principais funcionalidades do módulo.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { href: "/operacional/atendimentos/novo", label: "Nova OS", icon: PlusCircle },
              { href: "/operacional/balcao", label: "Balcão PDV", icon: Package },
              { href: "/operacional/clientes", label: "Clientes", icon: Users, variant: "secondary" as const },
              { href: "/operacional/produtos", label: "Produtos/Serviços", icon: ListOrdered, variant: "secondary" as const },
              { href: "/operacional/producao", label: "Controle de Produção", icon: Settings, variant: "outline" as const },
              { href: "/operacional/estoque", label: "Controle de Estoque", icon: BarChart3, variant: "outline" as const },
            ].map(action => (
              <Button key={action.href} asChild size="lg" className="h-auto py-3 flex-col text-center" variant={action.variant || "default"}>
                <Link href={action.href}>
                  <action.icon className="mb-1 h-5 w-5 sm:h-6 sm:w-6" /> 
                  <span className="text-xs sm:text-sm">{action.label}</span>
                </Link>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
       <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><ServerIcon className="h-5 w-5 text-primary"/> Histórico de Dados Recentes</CardTitle>
            <CardDescription>Visualização de tabelas com dados recentes das principais coleções. (Em desenvolvimento)</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Esta seção exibirá tabelas dinâmicas com as últimas OS, Vendas, etc.</p>
        </CardContent>
      </Card>
    </div>
  );
}
