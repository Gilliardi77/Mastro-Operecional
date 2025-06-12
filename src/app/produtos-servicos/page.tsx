
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, PlusCircle, BarChart3, Users, Package, Settings, ActivitySquare, ListOrdered, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { format, startOfDay, endOfDay, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
}

export default function ProdutosServicosPage() {
  const { user } = useAuth();
  const [agendaHoje, setAgendaHoje] = useState<AgendamentoResumo[]>([]);
  const [resumoOperacional, setResumoOperacional] = useState<ResumoOperacional>({
    osConcluidasHoje: 0,
    vendasHojeValor: 0,
    osAtrasadas: 0,
  });
  const [isLoadingAgenda, setIsLoadingAgenda] = useState(true);
  const [isLoadingResumo, setIsLoadingResumo] = useState(true);

  const bypassAuth = true; // Mantenha como no restante do app para consistência de dados de teste

  const fetchAgendaHoje = useCallback(async (userId: string) => {
    setIsLoadingAgenda(true);
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());

      const q = query(
        collection(db, 'agendamentos'),
        where('userId', '==', userId),
        where('dataHora', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataHora', '<=', Timestamp.fromDate(hojeFim)),
        orderBy('dataHora', 'asc'),
        limit(3) // Limitar aos próximos 3 para o resumo
      );
      const querySnapshot = await getDocs(q);
      const agendamentos = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          clienteNome: data.clienteNome,
          servicoNome: data.servicoNome,
          dataHora: (data.dataHora as Timestamp).toDate(),
          status: data.status,
        } as AgendamentoResumo;
      });
      setAgendaHoje(agendamentos);
    } catch (error) {
      console.error("Erro ao buscar agenda de hoje:", error);
    } finally {
      setIsLoadingAgenda(false);
    }
  }, []);

  const fetchResumoOperacional = useCallback(async (userId: string) => {
    setIsLoadingResumo(true);
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      let osConcluidasHoje = 0;
      let vendasHojeValor = 0;
      let osAtrasadas = 0;

      // OS Concluídas Hoje
      const osQuery = query(
        collection(db, 'ordensServico'),
        where('userId', '==', userId),
        where('status', '==', 'Concluído')
        // Idealmente, teríamos um campo 'dataConclusao'. Usando 'atualizadoEm' como proxy se for atualizado na conclusão.
        // where('atualizadoEm', '>=', Timestamp.fromDate(hojeInicio)),
        // where('atualizadoEm', '<=', Timestamp.fromDate(hojeFim))
      );
      // Para simplificar, vamos iterar e filtrar por data no cliente para 'atualizadoEm'
      // pois queries de range em múltiplos campos são complexas.
      const osSnapshot = await getDocs(osQuery);
      osSnapshot.forEach(doc => {
        const data = doc.data();
        const atualizadoEmDate = (data.atualizadoEm as Timestamp).toDate();
        if (atualizadoEmDate >= hojeInicio && atualizadoEmDate <= hojeFim) {
          osConcluidasHoje++;
        }
      });


      // Vendas Hoje
      const vendasQuery = query(
        collection(db, 'vendas'),
        where('userId', '==', userId),
        where('dataVenda', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataVenda', '<=', Timestamp.fromDate(hojeFim))
      );
      const vendasSnapshot = await getDocs(vendasQuery);
      vendasSnapshot.forEach(doc => {
        vendasHojeValor += doc.data().totalVenda as number;
      });

      // OS Atrasadas
      const osAtrasadasQuery = query(
        collection(db, 'ordensServico'),
        where('userId', '==', userId),
        where('dataEntrega', '<', Timestamp.fromDate(hojeInicio)),
        // where('status', 'in', ['Pendente', 'Em Andamento']) // Firestore 'in' com '!=' não é direto. Filtraremos no cliente.
      );
      const osAtrasadasSnapshot = await getDocs(osAtrasadasQuery);
      osAtrasadasSnapshot.forEach(doc => {
        const status = doc.data().status as string;
        if (status === 'Pendente' || status === 'Em Andamento') {
          osAtrasadas++;
        }
      });
      
      setResumoOperacional({ osConcluidasHoje, vendasHojeValor, osAtrasadas });
    } catch (error) {
      console.error("Erro ao buscar resumo operacional:", error);
    } finally {
      setIsLoadingResumo(false);
    }
  }, []);

  useEffect(() => {
    const currentUserId = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
    if (currentUserId) {
      fetchAgendaHoje(currentUserId);
      fetchResumoOperacional(currentUserId);
    } else {
      setIsLoadingAgenda(false);
      setIsLoadingResumo(false);
    }
  }, [user, bypassAuth, fetchAgendaHoje, fetchResumoOperacional]);

  const getStatusColorClasses = (status: string): string => {
    switch (status) {
      case "Pendente": return "border-blue-500 bg-blue-50 text-blue-700";
      case "Em Andamento": return "border-yellow-500 bg-yellow-50 text-yellow-700";
      case "Concluído": return "border-green-500 bg-green-50 text-green-700";
      case "Cancelado": return "border-red-500 bg-red-50 text-red-700";
      default: return "border-gray-500 bg-gray-50 text-gray-700";
    }
  };

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Módulo Produtos + Serviços
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Gestão completa de atendimentos, orçamentos, ordens de serviço e mais.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <CalendarDays className="h-6 w-6" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>Próximos atendimentos e tarefas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingAgenda ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : agendaHoje.length > 0 ? (
              agendaHoje.map(ag => (
                <div key={ag.id} className="p-3 border rounded-md bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold">{format(ag.dataHora, "HH:mm", { locale: ptBR })} - {ag.clienteNome}</p>
                      <p className="text-xs text-muted-foreground">{ag.servicoNome}</p>
                    </div>
                    <Badge variant="outline" className={`${getStatusColorClasses(ag.status)} text-xs`}>{ag.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center border-2 border-dashed rounded-md border-muted">
                <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para hoje.</p>
              </div>
            )}
            <Button variant="outline" className="w-full mt-3" asChild>
              <Link href="/produtos-servicos/agenda">Ver Agenda Completa</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <PlusCircle className="h-6 w-6" />
              Acesso Rápido
            </CardTitle>
            <CardDescription>Inicie um novo atendimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" asChild>
              <Link href="/produtos-servicos/balcao">Balcão de Vendas</Link>
            </Button>
            <Button className="w-full" asChild>
              <Link href="/produtos-servicos/atendimentos/novo?tipo=orcamento">Novo Orçamento</Link>
            </Button>
            <Button className="w-full" asChild>
              <Link href="/produtos-servicos/atendimentos/novo?tipo=os">Nova Ordem de Serviço</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <BarChart3 className="h-6 w-6" />
              Resumo do Dia
            </CardTitle>
            <CardDescription>Visão geral das atividades de hoje.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingResumo ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-6 bg-muted rounded animate-pulse" />)}
              </div>
            ) : (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500"/>OS Concluídas Hoje:</span>
                  <span className="font-semibold">{resumoOperacional.osConcluidasHoje}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vendas Balcão Hoje:</span>
                  <span className="font-semibold">R$ {resumoOperacional.vendasHojeValor.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {resumoOperacional.osAtrasadas > 0 ? <AlertTriangle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500"/>}
                    OS com Entrega Atrasada:
                  </span>
                  <span className={`font-semibold ${resumoOperacional.osAtrasadas > 0 ? 'text-destructive' : ''}`}>
                    {resumoOperacional.osAtrasadas}
                  </span>
                </div>
                {/* Placeholder para entregas, podemos adicionar se tivermos campo específico */}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entregas (Placeholder):</span>
                  <span className="font-semibold">0</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="mb-4 text-xl font-semibold text-center text-primary">Gestão</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
          <Link href="/produtos-servicos/clientes" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Users className="mr-3 h-7 w-7" /> Clientes
            </Button>
          </Link>
          <Link href="/produtos-servicos/produtos" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Package className="mr-3 h-7 w-7" /> Produtos e Serviços
            </Button>
          </Link>
          <Link href="/produtos-servicos/agenda" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <CalendarDays className="mr-3 h-7 w-7" /> Agenda
            </Button>
          </Link>
          <Link href="/produtos-servicos/producao" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Settings className="mr-3 h-7 w-7" /> Produção
            </Button>
          </Link>
          <Link href="/produtos-servicos/estoque" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <ActivitySquare className="mr-3 h-7 w-7" /> Estoque
            </Button>
          </Link>
          <Link href="/produtos-servicos/ordens" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <ListOrdered className="mr-3 h-7 w-7" /> Ordens de Serviço
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
