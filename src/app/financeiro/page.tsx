
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  getYear,
  getMonth,
  isToday,
  startOfDay,
  endOfDay,
  addDays,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  doc,
  getDoc,
  type FirestoreError
} from 'firebase/firestore';
import {
  BarChart as RechartsBarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from 'recharts';
import * as RechartsPrimitive from "recharts";

import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { getActiveUserId } from '@/lib/authUtils';
import type { CustoFixoConfiguradoClient } from '@/services/custoFixoConfiguradoService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Progress } from "@/components/ui/progress";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Target,
  Loader2,
  CalendarClock,
  FileText,
  FileWarning,
  BadgeCheck,
  PackageSearch,
  Info,
  BrainCircuit,
  LayoutDashboard,
  CreditCard,
  Percent,
} from 'lucide-react';

interface LancamentoFinanceiro {
  id: string;
  valor: number;
  tipo: string;
  data: Date;
  status: string;
  categoria: string;
}

interface MetaMensal {
  metaFaturamento: number;
  metaLucro?: number;
  margemContribuicaoMediaPercentual?: number;
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const activeUserId = useMemo(() => getActiveUserId(user), [user]);

  const { toast } = useToast();
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [lucroMensal, setLucroMensal] = useState(0);
  const [receitasMensais, setReceitasMensais] = useState(0);
  const [custosTotaisMes, setCustosTotaisMes] = useState(0);
  const [despesasPendentesMensais, setDespesasPendentesMensais] = useState(0);
  const [percentualDespesasPagas, setPercentualDespesasPagas] = useState(0);
  const [metaFaturamento, setMetaFaturamento] = useState<number | null>(null);
  const [progressoMetaFaturamento, setProgressoMetaFaturamento] = useState(0);
  const [totalVendasMes, setTotalVendasMes] = useState(0);
  const [pontoEquilibrio, setPontoEquilibrio] = useState<number | string | null>(null);
  const [custosFixosReaisConfigurados, setCustosFixosReaisConfigurados] = useState<number | null>(null);
  const [chartDataMonthly, setChartDataMonthly] = useState<any[]>([]);
  const [pieDataExpenses, setPieDataExpenses] = useState<any[]>([]);
  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [contasPagarHoje, setContasPagarHoje] = useState(0);
  const [contasReceberHoje, setContasReceberHoje] = useState(0);

  const chartConfigMonthly = useMemo(() => ({
    revenue: { label: "Receitas", color: chartColors[0] },
    expenses: { label: "Custos Totais", color: chartColors[1] },
  }), []);

  const pieChartConfig = useMemo(() => (
    pieDataExpenses.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as any)
  ), [pieDataExpenses]);

  const breakEvenChartData = useMemo(() => {
    if (typeof pontoEquilibrio !== 'number') return [];
    return [
      { name: 'Receita Atual', valor: receitasMensais, fill: chartColors[0] },
      { name: 'Ponto de Equilíbrio', valor: pontoEquilibrio, fill: chartColors[1] },
    ];
  }, [pontoEquilibrio, receitasMensais]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/');
    }
  }, [user, authLoading, router]);


  const fetchData = useCallback(async () => {
    if (!activeUserId) {
      setIsLoadingData(false);
      return;
    }
    
    setIsLoadingData(true);
    try {
      const today = new Date();
      const startMonth = startOfMonth(today);
      const endMonth = endOfMonth(today);
      const startToday = startOfDay(today);
      const endToday = endOfDay(today);
      const in3Days = endOfDay(addDays(today, 3));
      const sixMonthsAgo = subMonths(today, 5);
      const startOfSixMonths = startOfMonth(sixMonthsAgo);
      const anoMes = `${getYear(today)}-${String(getMonth(today) + 1).padStart(2, '0')}`;

      // Prepare all queries
      const lancamentosQuery = query(
          collection(db, 'lancamentosFinanceiros'),
          where('userId', '==', activeUserId),
          where('data', '>=', Timestamp.fromDate(startOfSixMonths)),
          where('data', '<=', Timestamp.fromDate(in3Days))
      );

      const vendasQuery = query(
          collection(db, 'vendas'),
          where('userId', '==', activeUserId),
          where('dataVenda', '>=', Timestamp.fromDate(startMonth)),
          where('dataVenda', '<=', Timestamp.fromDate(endMonth))
      );
      
      const osQuery = query(
          collection(db, 'ordensServico'), 
          where('userId', '==', activeUserId), 
          where('createdAt', '>=', Timestamp.fromDate(startMonth)), 
          where('createdAt', '<=', Timestamp.fromDate(endMonth))
      );
      
      const metaDoc = doc(db, 'metasFinanceiras', `${activeUserId}_${anoMes}`);

      const custosFixosQuery = query(collection(db, 'custosFixosConfigurados'), where('userId', '==', activeUserId), where('ativo', '==', true));

      const agendamentosQuery = query(
          collection(db, 'agendamentos'),
          where('userId', '==', activeUserId),
          where('dataHora', '>=', Timestamp.fromDate(startToday)),
          where('dataHora', '<=', Timestamp.fromDate(endToday))
      );

      // Execute all queries in parallel
      const [
          lancamentosSnap,
          vendasSnap,
          osSnap,
          metaSnap,
          custosFixosSnap,
          agendamentosSnap
      ] = await Promise.all([
          getDocs(lancamentosQuery),
          getDocs(vendasQuery),
          getDocs(osQuery).catch(() => null), // Handle cases where query fails due to no index
          getDoc(metaDoc),
          getDocs(custosFixosQuery),
          getDocs(agendamentosQuery)
      ]);
      
      // Process all results
      
      const custosFixosPlanejados = custosFixosSnap.docs
        .reduce((sum, doc) => sum + (doc.data().valorMensal || 0), 0);
      setCustosFixosReaisConfigurados(custosFixosPlanejados);

      // Process lancamentos
      const todosLancamentosHistoricos: LancamentoFinanceiro[] = lancamentosSnap.docs.map(d => {
          const data = d.data();
          return {
              id: d.id,
              valor: data.valor || 0,
              tipo: (data.tipo || '').toUpperCase(),
              data: (data.data as Timestamp)?.toDate ? (data.data as Timestamp).toDate() : new Date(0),
              status: (data.status || '').toLowerCase(),
              categoria: data.categoria || "Sem Categoria",
          } as LancamentoFinanceiro;
      });

      const todosLancamentosMes = todosLancamentosHistoricos.filter(l => l.data >= startMonth && l.data <= endMonth);

      const receitas = todosLancamentosMes.filter(l => l.tipo === 'RECEITA' && l.status === 'recebido').reduce((s, l) => s + l.valor, 0);
      const despesasPagas = todosLancamentosMes.filter(l => l.tipo === 'DESPESA' && l.status === 'pago').reduce((s, l) => s + l.valor, 0);
      const despesasPendentes = todosLancamentosMes.filter(l => l.tipo === 'DESPESA' && l.status === 'pendente').reduce((s, l) => s + l.valor, 0);
      
      const custosTotaisDoMes = despesasPagas + custosFixosPlanejados;

      setReceitasMensais(receitas);
      setCustosTotaisMes(custosTotaisDoMes);
      setDespesasPendentesMensais(despesasPendentes);
      setLucroMensal(receitas - custosTotaisDoMes);
      const totalDespesasLancadas = despesasPagas + despesasPendentes;
      setPercentualDespesasPagas(totalDespesasLancadas > 0 ? (despesasPagas / totalDespesasLancadas) * 100 : 0);

      // Process vendas & os
      const osSnapSize = osSnap ? osSnap.size : 0;
      setTotalVendasMes(vendasSnap.size + osSnapSize);

      // Process metas & Ponto de Equilíbrio
      let margemContribDecimal = 0;
      if (metaSnap.exists()) {
        const meta = metaSnap.data() as MetaMensal;
        const metaFaturamentoVal = meta.metaFaturamento || 0;
        margemContribDecimal = (meta.margemContribuicaoMediaPercentual || 0) / 100;
        setMetaFaturamento(metaFaturamentoVal);
        setProgressoMetaFaturamento(metaFaturamentoVal > 0 ? (receitas / metaFaturamentoVal) * 100 : 0);
      } else {
        setMetaFaturamento(null);
        setProgressoMetaFaturamento(0);
      }
      
      if (custosFixosPlanejados > 0 && margemContribDecimal > 0) {
        setPontoEquilibrio(custosFixosPlanejados / margemContribDecimal);
      } else {
        setPontoEquilibrio("Defina Custos Fixos e Margem de Contribuição na Análise de Metas.");
      }

      // Process chart data (6 months history)
      const evolucao: Record<string, { revenue: number; expenses: number }> = {};
      for (let i = 5; i >= 0; i--) {
          const d = subMonths(today, i);
          evolucao[format(d, 'MMM/yy', { locale: ptBR })] = { revenue: 0, expenses: 0 };
      }
      todosLancamentosHistoricos.forEach(l => {
          const key = format(l.data, 'MMM/yy', { locale: ptBR });
          if (!evolucao[key]) return; 
          if (l.tipo === 'RECEITA' && l.status === 'recebido') evolucao[key].revenue += l.valor;
          if (l.tipo === 'DESPESA' && l.status === 'pago') evolucao[key].expenses += l.valor;
      });
      // Adicionar custos fixos planejados apenas ao mês atual no gráfico
      const currentMonthKey = format(today, 'MMM/yy', { locale: ptBR });
      if (evolucao[currentMonthKey]) {
        evolucao[currentMonthKey].expenses += custosFixosPlanejados;
      }
      setChartDataMonthly(Object.entries(evolucao).map(([month, data]) => ({ month, ...data })));

      // Process pie chart (current month expenses, including planned fixed costs)
      const categorias: Record<string, number> = {};
      todosLancamentosMes.filter(l => l.tipo === 'DESPESA' && l.status === 'pago').forEach(l => {
          const categoriaNorm = l.categoria || "Despesas Diversas";
          categorias[categoriaNorm] = (categorias[categoriaNorm] || 0) + l.valor;
      });
      // Adicionar os custos fixos planejados ao gráfico de pizza, usando sua própria categoria
      if (custosFixosPlanejados > 0) {
        const categoriaCustosFixos = 'Custos Fixos Planejados';
        categorias[categoriaCustosFixos] = (categorias[categoriaCustosFixos] || 0) + custosFixosPlanejados;
      }

      setPieDataExpenses(Object.entries(categorias).map(([name, value], i) => ({ name, value, fill: chartColors[i % chartColors.length] })).sort((a,b) => b.value - a.value));

      // Process agendamentos
      setAgendamentosHoje(agendamentosSnap.size);
      
      // Process upcoming lancamentos
      const upcomingLancamentos = todosLancamentosHistoricos.filter(l => l.data >= startToday && l.data <= in3Days);
      
      const pagarHoje = upcomingLancamentos.filter(l => 
        l.tipo === 'DESPESA' &&
        l.status === 'pendente' &&
        isToday(l.data)
      ).length;

      const receberHoje = upcomingLancamentos.filter(l => 
        l.tipo === 'RECEITA' &&
        l.status === 'pendente' &&
        isToday(l.data)
      ).length;
      
      setContasPagarHoje(pagarHoje);
      setContasReceberHoje(receberHoje);

    } catch (error) {
      if (!(error instanceof Error && (error as FirestoreError).code === 'failed-precondition')) {
        toast({ title: "Erro ao buscar dados do Painel de Controle", description: (error as Error).message, variant: "destructive" });
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [activeUserId, toast]);

  useEffect(() => {
    if (!authLoading && activeUserId) {
      fetchData();
    } else if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, activeUserId, fetchData, user, router]);

  if (authLoading || (!user && !activeUserId)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Carregando dados do Painel de Controle...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Mensal (Estimado)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${lucroMensal >= 0 ? 'text-[hsl(var(--chart-1))]' : 'text-destructive'}`}>
                {lucroMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">Receitas Pagas - (Despesas Pagas + Fixos)</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receitas (Pagas Mês)</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{receitasMensais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground">Total recebido este mês.</p>
            </CardContent>
          </Card>
          
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Custos Totais (Mês)</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">{custosTotaisMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <p className="text-xs text-muted-foreground mt-1">Despesas Pagas + Custos Fixos Planejados</p>
              {despesasPendentesMensais > 0 && (
                <p className="text-xs text-amber-600 mt-1">{despesasPendentesMensais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="font-normal text-muted-foreground">(Pendentes)</span></p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalVendasMes}</div>
              <p className="text-xs text-muted-foreground">Vendas + OS no mês atual.</p>
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meta de Faturamento</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{progressoMetaFaturamento.toFixed(0)}%</div>
              <p className="text-xs text-muted-foreground">
                {metaFaturamento !== null ? `${receitasMensais.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} de ${metaFaturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : "Meta não definida"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline">Receitas vs. Custos Totais (Últimos 6 meses)</CardTitle>
              <CardDescription>Custos Totais = Despesas pagas + Custos Fixos Planejados (apenas no mês atual).</CardDescription>
            </CardHeader>
            <CardContent>
              {chartDataMonthly.length > 0 ? (
                <ChartContainer config={chartConfigMonthly} className="h-[300px] w-full">
                  <RechartsBarChart accessibilityLayer data={chartDataMonthly}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={10} tickFormatter={(value) => `R$${Number(value)/1000}k`} />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <RechartsLegend content={<ChartLegendContent />} />
                    <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} name="Receitas" />
                    <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} name="Custos Totais" />
                  </RechartsBarChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-10 flex flex-col items-center justify-center h-[300px] bg-card rounded-md">
                  <PackageSearch className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    "Sem dados suficientes para exibir o gráfico de evolução mensal."
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="space-y-6">
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><CalendarClock className="h-5 w-5 text-primary" />Avisos e Destaques</CardTitle>
                <CardDescription>Resumo de atividades e pendências.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/financeiro" className="block p-3 rounded-md border bg-card hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-[hsl(var(--chart-4))]" />
                        <span className="text-sm font-medium">Agendamentos Hoje:</span>
                        </div>
                        <Badge variant="secondary">{agendamentosHoje}</Badge>
                    </div>
                </Link>
                <Link href="/financeiro" className="block p-3 rounded-md border bg-card hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <FileWarning className="h-5 w-5 text-[hsl(var(--chart-3))]" />
                        <span className="text-sm font-medium">Contas a Pagar Hoje:</span>
                        </div>
                        <Badge variant={contasPagarHoje > 0 ? "destructive" : "secondary"}>{contasPagarHoje}</Badge>
                    </div>
                </Link>
                 <Link href="/financeiro" className="block p-3 rounded-md border bg-card hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <BadgeCheck className="h-5 w-5 text-[hsl(var(--chart-1))]" />
                        <span className="text-sm font-medium">Contas a Receber Hoje:</span>
                        </div>
                        <Badge variant={contasReceberHoje > 0 ? "default" : "secondary"}>{contasReceberHoje}</Badge>
                    </div>
                </Link>
              </CardContent>
            </Card>
            <Card className="shadow-lg rounded-lg">
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary"/>Dica Rápida</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Sua receita este mês está <strong className="text-primary">{progressoMetaFaturamento.toFixed(0)}%</strong> em relação à meta!
                  Continue assim. Para definir ou ajustar suas metas e obter um diagnóstico financeiro, acesse a Análise de Metas.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/analise-metas">
                    Ir para Análise de Metas
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline">Distribuição de Custos (Pagos + Fixos)</CardTitle>
              <CardDescription>Despesas pagas no mês + Custos Fixos Planejados.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {pieDataExpenses.length > 0 ? (
                <ChartContainer config={pieChartConfig} className="h-[350px] w-full max-w-[450px]">
                  <RechartsPieChart>
                    <RechartsTooltip content={<ChartTooltipContent hideLabel />} />
                    <Pie
                      data={pieDataExpenses}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                          <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="0.75rem">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        );
                      }}
                    >
                      {pieDataExpenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <RechartsLegend 
                      content={<ChartLegendContent nameKey="name" className="flex flex-wrap justify-center gap-x-4 gap-y-1" />}
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                  </RechartsPieChart>
                </ChartContainer>
              ) : (
                 <div className="text-center py-10 flex flex-col items-center justify-center h-[350px] bg-card rounded-md">
                  <PackageSearch className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                     "Nenhuma despesa ou custo fixo encontrado para exibir a distribuição."
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-lg rounded-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center gap-1">
                Ponto de Equilíbrio Estimado
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 p-0"><Info className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs bg-popover text-popover-foreground border shadow-md rounded-md p-2">
                    <p>O Ponto de Equilíbrio é a receita que sua empresa precisa gerar para cobrir todos os seus custos fixos, considerando sua margem de contribuição média.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
               <CardDescription>Receita mensal necessária para cobrir os custos fixos.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                {typeof pontoEquilibrio === 'number' ? (
                  <p className="text-lg">Seu ponto de equilíbrio estimado é de <strong className="text-primary">{pontoEquilibrio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong> em receitas mensais.</p>
                ) : (
                  <p className="text-lg text-muted-foreground">{pontoEquilibrio}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">Para maior precisão, revise seus custos fixos e margem de contribuição na página de <Link href="/analise-metas" className="underline text-primary hover:text-primary/80">Análise de Metas</Link>.</p>
              </div>
              <div className="h-[200px] w-full">
                {breakEvenChartData.length > 0 && typeof pontoEquilibrio === 'number' && custosFixosReaisConfigurados !== null ? (
                   <ChartContainer config={{}} className="h-full w-full">
                    <RechartsBarChart data={breakEvenChartData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(value) => `R$${Number(value) / 1000}k`} />
                      <YAxis type="category" dataKey="name" width={120} interval={0} />
                      <RechartsTooltip
                          formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), "Valor"]}
                          cursor={{fill: 'hsl(var(--muted))'}}
                      />
                      <RechartsLegend verticalAlign="bottom" align="center" wrapperStyle={{paddingTop: '10px'}} />
                      <Bar dataKey="valor" name="Valor" radius={[0, 4, 4, 0]}>
                          {breakEvenChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                      </Bar>
                      {custosFixosReaisConfigurados > 0 && (
                          <ReferenceLine
                              x={custosFixosReaisConfigurados}
                              stroke="hsl(var(--destructive))"
                              strokeDasharray="3 3"
                              strokeWidth={2}
                          >
                              <RechartsPrimitive.Label 
                                value={`Custos Fixos: ${custosFixosReaisConfigurados.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                                position="insideTopLeft"
                                fill="hsl(var(--destructive))" 
                                fontSize={10}
                                angle={-90}
                                dy={10}
                                dx={10}
                              />
                          </ReferenceLine>
                      )}
                    </RechartsBarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-full w-full bg-muted/30 rounded-md flex items-center justify-center text-muted-foreground p-4 text-center">
                    {pontoEquilibrio}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
