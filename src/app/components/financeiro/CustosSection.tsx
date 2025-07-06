
// src/components/financeiro/PlanejamentoCustosSection.tsx
// Renomeado de CustosSection.tsx
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy, doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PiggyBank, ListFilter, Loader2, Save, AlertTriangle, Edit3, Trash2, PlusCircle, TrendingUp, TrendingDown, DollarSign, Info, Settings2, CalculatorIcon, ReceiptText, FileText, CalendarCheck2
} from 'lucide-react';
import { getActiveUserId, BYPASS_USER_PLACEHOLDER_ID } from '@/lib/authUtils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as FormDescUI } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import {
  type CustoFixoConfiguradoClient,
  CustoFixoConfiguradoCreateSchema,
  type CustoFixoConfiguradoCreateData,
  type CustoFixoConfiguradoUpdateData,
} from '@/schemas/custoFixoConfiguradoSchema';
import {
  createCustoFixo,
  getAllCustosFixosConfigurados,
  updateCustoFixo,
  hardDeleteCustoFixo,
} from '@/services/custoFixoConfiguradoService';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from '@/components/ui/table';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { LancamentoFinanceiro } from '@/schemas/lancamentoFinanceiroSchema';

interface PlanejamentoCustosResumo {
  totalCustosFixosPlanejados: number;
  totalCustosVariaveisPrevistos: number; // Soma de DESPESAS (pagas e pendentes) do mês
  custoTotalPrevisto: number;
  custoDiarioPrevisto: number;
  metaMinimaReceitaPrevista: number;
}

const custoFixoFormSchema = CustoFixoConfiguradoCreateSchema.extend({
  ativo: z.boolean().optional()
});
type CustoFixoFormValues = z.infer<typeof custoFixoFormSchema>;

export default function PlanejamentoCustosSection() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCustoFixo, setCurrentCustoFixo] = useState<CustoFixoConfiguradoClient | null>(null);

  const [custosFixosLista, setCustosFixosLista] = useState<CustoFixoConfiguradoClient[]>([]);
  const [isLoadingCustosFixos, setIsLoadingCustosFixos] = useState(true);
  const [isLoadingResumo, setIsLoadingResumo] = useState(true);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [resumoPlanejamento, setResumoPlanejamento] = useState<PlanejamentoCustosResumo | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [lancamentosDespesaMes, setLancamentosDespesaMes] = useState<LancamentoFinanceiro[]>([]);
  const [isLoadingLancamentosDespesa, setIsLoadingLancamentosDespesa] = useState(true);
  const [diasParaCalculo, setDiasParaCalculo] = useState<number>(22);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const isBypassAuthActive = process.env.NEXT_PUBLIC_BYPASS_AUTH_IN_STUDIO === 'true';
  const activeUserId = useMemo(() => getActiveUserId(user, isBypassAuthActive), [user, isBypassAuthActive]);

  const defaultFormValues: CustoFixoFormValues = {
    nome: '',
    valorMensal: 0,
    categoria: '',
    observacoes: '',
    ativo: true,
  };

  const form = useForm<CustoFixoFormValues>({
    resolver: zodResolver(custoFixoFormSchema),
    defaultValues: defaultFormValues,
  });

  const carregarCustosFixosConfigurados = useCallback(async () => {
    if (!activeUserId || activeUserId === BYPASS_USER_PLACEHOLDER_ID || !user) {
      setCustosFixosLista([]);
      setIsLoadingCustosFixos(false);
      return;
    }
    setIsLoadingCustosFixos(true);
    try {
      const idToken = await user.getIdToken();
      if (!idToken) throw new Error("ID Token não disponível.");
      const dados: CustoFixoConfiguradoClient[] = await getAllCustosFixosConfigurados(idToken, showInactive);
      setCustosFixosLista(dados);
    } catch (error) {
      console.error("Erro ao carregar custos fixos configurados:", error);
      toast({ title: 'Erro ao buscar custos fixos', description: (error as Error).message, variant: 'destructive' });
      setCustosFixosLista([]);
    } finally {
      setIsLoadingCustosFixos(false);
    }
  }, [activeUserId, user, showInactive, toast]);

  const fetchLancamentosDespesaDoMes = useCallback(async () => {
    if (!activeUserId) {
      setLancamentosDespesaMes([]);
      setIsLoadingLancamentosDespesa(false);
      return;
    }
    setIsLoadingLancamentosDespesa(true);
    try {
      const dateRange = currentMonth.split('-');
      const selectedMonthDate = new Date(parseInt(dateRange[0]), parseInt(dateRange[1]) -1, 1);
      const inicioMes = startOfMonth(selectedMonthDate);
      const fimMes = endOfMonth(selectedMonthDate);
      
      const q = query(
        collection(db, 'lancamentosFinanceiros'),
        where('userId', '==', activeUserId),
        where('tipo', '==', 'DESPESA'), 
        where('data', '>=', Timestamp.fromDate(inicioMes)),
        where('data', '<=', Timestamp.fromDate(fimMes))
      );
      const snapshot = await getDocs(q);
      const dados = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as LancamentoFinanceiro));
      setLancamentosDespesaMes(dados);
    } catch (error) {
      console.error("Erro ao buscar lançamentos de despesa do mês:", error);
      toast({ title: 'Erro ao buscar despesas previstas', variant: 'destructive', description: (error as Error).message });
      setLancamentosDespesaMes([]);
    } finally {
      setIsLoadingLancamentosDespesa(false);
    }
  }, [activeUserId, toast, currentMonth]);

  const calcularResumoPlanejamento = useCallback(() => {
    if (isLoadingCustosFixos || isLoadingLancamentosDespesa || !activeUserId) {
      setResumoPlanejamento(null);
      setIsLoadingResumo(false);
      return;
    }
    setIsLoadingResumo(true);

    const totalCustosFixosPlanejados = custosFixosLista
      .filter(c => c.ativo)
      .reduce((sum, custo) => sum + custo.valorMensal, 0);

    const totalCustosVariaveisPrevistos = lancamentosDespesaMes
      .reduce((sum, lancamento) => sum + lancamento.valor, 0);
    
    const custoTotalPrevisto = totalCustosFixosPlanejados + totalCustosVariaveisPrevistos;
    const custoDiarioPrevisto = diasParaCalculo > 0 ? custoTotalPrevisto / diasParaCalculo : 0;
    const metaMinimaReceitaPrevista = custoTotalPrevisto;

    setResumoPlanejamento({
      totalCustosFixosPlanejados,
      totalCustosVariaveisPrevistos,
      custoTotalPrevisto,
      custoDiarioPrevisto,
      metaMinimaReceitaPrevista,
    });
    setIsLoadingResumo(false);
  }, [custosFixosLista, lancamentosDespesaMes, diasParaCalculo, activeUserId, isLoadingCustosFixos, isLoadingLancamentosDespesa]);

  useEffect(() => {
    if (!authLoading && activeUserId) {
      carregarCustosFixosConfigurados();
      fetchLancamentosDespesaDoMes();
    } else if (!authLoading && !activeUserId) {
      setIsLoadingCustosFixos(false);
      setIsLoadingLancamentosDespesa(false);
      setIsLoadingResumo(false);
      setCustosFixosLista([]);
      setLancamentosDespesaMes([]);
      setResumoPlanejamento(null);
    }
  }, [authLoading, activeUserId, carregarCustosFixosConfigurados, fetchLancamentosDespesaDoMes]);

  useEffect(() => {
    if (activeUserId) {
        calcularResumoPlanejamento();
    }
  }, [custosFixosLista, lancamentosDespesaMes, diasParaCalculo, calcularResumoPlanejamento, activeUserId]);

  useEffect(() => {
    if (activeUserId) {
        carregarCustosFixosConfigurados();
        fetchLancamentosDespesaDoMes(); 
    }
  }, [showInactive, activeUserId, carregarCustosFixosConfigurados, currentMonth, fetchLancamentosDespesaDoMes]);

  const handleOpenModal = (custo: CustoFixoConfiguradoClient | null = null) => {
    setCurrentCustoFixo(custo);
    if (custo) {
      form.reset({
        nome: custo.nome,
        valorMensal: custo.valorMensal,
        categoria: custo.categoria || '',
        observacoes: custo.observacoes || '',
        ativo: custo.ativo,
      });
    } else {
      form.reset(defaultFormValues);
    }
    setIsModalOpen(true);
  };

  const onSubmitForm = async (values: CustoFixoFormValues) => {
    if (activeUserId === BYPASS_USER_PLACEHOLDER_ID || !user) {
        toast({ title: 'Ação não permitida', description: 'Criação/edição de custos desabilitada ou usuário não autenticado.', variant: 'default' });
        setIsModalOpen(false);
        return;
    }
    setIsSubmittingForm(true);
    const dataPayload: CustoFixoConfiguradoCreateData | CustoFixoConfiguradoUpdateData = {
        nome: values.nome,
        valorMensal: values.valorMensal,
        categoria: values.categoria || null,
        observacoes: values.observacoes || null,
    };
    if (currentCustoFixo) {
        (dataPayload as CustoFixoConfiguradoUpdateData).ativo = values.ativo ?? currentCustoFixo.ativo;
    }

    try {
      const idToken = await user.getIdToken();
      if (!idToken) throw new Error("ID Token não disponível.");
      if (currentCustoFixo) {
        await updateCustoFixo(idToken, currentCustoFixo.id, dataPayload as CustoFixoConfiguradoUpdateData);
        toast({ title: 'Custo Fixo Planejado Atualizado!' });
      } else {
        await createCustoFixo(idToken, dataPayload as CustoFixoConfiguradoCreateData);
        toast({ title: 'Custo Fixo Planejado Adicionado!' });
      }
      setIsModalOpen(false);
      form.reset(defaultFormValues);
      await carregarCustosFixosConfigurados();
    } catch (error) {
      console.error("Erro ao salvar custo fixo:", error);
      toast({ title: 'Erro ao salvar', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteCustoFixoConfigurado = async (id: string) => {
    if (activeUserId === BYPASS_USER_PLACEHOLDER_ID || !user) {
        toast({ title: 'Ação não permitida', description: 'Exclusão de custos desabilitada ou usuário não autenticado.', variant: 'default' });
        return;
    }
    const confirmado = confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE este custo fixo configurado? Esta ação não pode ser desfeita.`);
    if (confirmado) {
      setIsSubmittingForm(true); // Usar o estado geral de submissão para desabilitar botões
      try {
        const idToken = await user.getIdToken();
        if (!idToken) throw new Error("ID Token não disponível.");
        await hardDeleteCustoFixo(idToken, id); 
        toast({ title: `Custo Fixo Excluído Permanentemente.` });
        await carregarCustosFixosConfigurados();
      } catch (error) {
        toast({ title: `Erro ao excluir`, description: (error as Error).message, variant: 'destructive' });
      } finally {
        setIsSubmittingForm(false);
      }
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (authLoading && !isBypassAuthActive) {
    return (
        <Card className="mt-6 shadow-md rounded-lg p-6 flex justify-center items-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Verificando autenticação...</p>
        </Card>
    );
  }

  if (!activeUserId && !isBypassAuthActive) {
    return (
      <Card className="mt-6 shadow-md rounded-lg p-6">
        <CardHeader><CardTitle className="text-xl font-headline flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Acesso Negado</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground">Você precisa estar logado para gerenciar custos.</p><Button onClick={() => { if (typeof window !== 'undefined') auth.signOut().then(() => { window.location.href = '/login?redirect=/financeiro'; }); }} className="mt-4">Fazer Login</Button></CardContent>
      </Card>
    );
  }

  const resumoCardsSkeleton = Array(5).fill(null);

  const resumoCardsData = [
    { title: "Custos Fixos Planejados (Mês)", valueGetter: (rs: PlanejamentoCustosResumo) => rs.totalCustosFixosPlanejados, icon: Settings2, description: "Soma dos seus custos fixos mensais planejados e ativos." },
    { title: "Custos Variáveis Previstos (Mês)", valueGetter: (rs: PlanejamentoCustosResumo) => rs.totalCustosVariaveisPrevistos, icon: ReceiptText, description: "Soma de todas as despesas (pagas e pendentes) lançadas para o mês." },
    { title: "Custo Total Previsto (Mês)", valueGetter: (rs: PlanejamentoCustosResumo) => rs.custoTotalPrevisto, icon: PiggyBank, description: "Soma dos custos fixos planejados e variáveis previstos." },
    { title: "Custo Diário Previsto", valueGetter: (rs: PlanejamentoCustosResumo) => rs.custoDiarioPrevisto, icon: CalculatorIcon, description: `Baseado no Custo Total Previsto e em ${diasParaCalculo} dia(s).` },
    { title: "Meta Mínima de Receita (Ponto Zero)", valueGetter: (rs: PlanejamentoCustosResumo) => rs.metaMinimaReceitaPrevista, icon: TrendingUp, description: "Receita mínima necessária no mês para cobrir todos os custos previstos." },
  ];

  return (
    <TooltipProvider>
    <div className="space-y-6 mt-6">
      <Card className="shadow-lg rounded-lg">
        <CardHeader>
          <CardTitle className="text-xl font-headline flex items-center gap-2"><CalendarCheck2 className="h-5 w-5 text-primary"/>Planejamento de Custo Fixo Mensal</CardTitle>
          <CardDescription>Configure seus custos fixos recorrentes e visualize a previsão total de gastos para o mês, combinando o planejado com as despesas variáveis já lançadas.</CardDescription>
        </CardHeader>
        <CardContent>
          {(isLoadingResumo || isLoadingLancamentosDespesa || isLoadingCustosFixos) && activeUserId ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumoCardsSkeleton.map((_, index) => (
                  <Card key={`skeleton-resumo-${index}`} className="shadow-sm">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-3/5 mb-1" />
                      <Skeleton className="h-8 w-3/4 mt-1" />
                    </CardHeader>
                    <CardContent><Skeleton className="h-3 w-4/5" /></CardContent>
                  </Card>
              ))}
            </div>
          ) : resumoPlanejamento ? (
            <div className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumoCardsData.map((cardInfo, index) => {
                    const IconComponent = cardInfo.icon;
                    const value = cardInfo.valueGetter(resumoPlanejamento);
                    return (
                        <Card key={`${cardInfo.title}-${index}`} className="shadow-sm">
                            <CardHeader className="pb-2">
                            <CardDescription className="text-sm text-muted-foreground flex items-center gap-1">
                                <IconComponent size={16} className="text-primary"/>{cardInfo.title}
                            </CardDescription>
                            <CardTitle className="text-2xl font-bold">{typeof value === 'number' ? formatCurrency(value) : value}</CardTitle>
                            </CardHeader>
                            <CardContent><p className="text-xs text-muted-foreground">{cardInfo.description}</p></CardContent>
                        </Card>
                    );
                })}
                </div>
                <div className="p-4 border rounded-md bg-muted/20">
                    <Label htmlFor="dias-calculo-custo" className="text-sm font-medium">Dias para Cálculo do Custo Diário Previsto:</Label>
                    <Input
                        id="dias-calculo-custo"
                        type="number"
                        value={diasParaCalculo}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setDiasParaCalculo(val > 0 ? val : 1);
                        }}
                        min="1"
                        className="mt-1 w-full sm:w-auto max-w-[120px]"
                        disabled={isLoadingResumo || !activeUserId}
                    />
                </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              {activeUserId ? "Não foi possível carregar o resumo do planejamento. Verifique se há lançamentos de despesa ou custos fixos configurados para o mês." : "Faça login para visualizar o planejamento."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md rounded-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
                <CardTitle className="text-xl font-headline flex items-center gap-2"><Settings2 className="h-5 w-5 text-primary"/>Gerenciar Custos Fixos Planejados</CardTitle>
                <CardDescription>Liste seus custos fixos recorrentes. Estes são usados no card "Custos Fixos Planejados" acima.</CardDescription>
            </div>
            <Button onClick={() => handleOpenModal()} variant="default" className="w-full sm:w-auto mt-2 sm:mt-0" disabled={!activeUserId || isSubmittingForm || (isBypassAuthActive && !user) }>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Custo Fixo
            </Button>
          </div>
           <div className="flex items-center space-x-2 mt-4">
            <Switch
                id="show-inactive-planejamento"
                checked={showInactive}
                onCheckedChange={setShowInactive}
                disabled={isLoadingCustosFixos || !activeUserId}
            />
            <Label htmlFor="show-inactive-planejamento" className="text-sm">Mostrar custos fixos inativos (planejamento)</Label>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingCustosFixos && activeUserId ? (
            <div className="flex justify-center items-center h-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2 text-muted-foreground">Carregando custos fixos...</p></div>
          ) : custosFixosLista.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">{activeUserId ? (showInactive ? "Nenhum custo fixo (ativo ou inativo) configurado." : "Nenhum custo fixo ativo configurado. Adicione um ou marque 'Mostrar custos inativos'.") : "Faça login para gerenciar seus custos."}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Custo Fixo</TableHead>
                    <TableHead className="text-right">Valor Mensal Planejado (R$)</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {custosFixosLista.map((custo) => (
                    <TableRow key={custo.id} className={!custo.ativo ? "opacity-60 bg-muted/20 hover:bg-muted/30" : "hover:bg-muted/50"}>
                      <TableCell className="font-medium max-w-xs truncate" title={custo.nome}>{custo.nome}</TableCell>
                      <TableCell className="text-right">{formatCurrency(custo.valorMensal)}</TableCell>
                      <TableCell className="truncate max-w-[150px]" title={custo.categoria || ''}>{custo.categoria || '-'}</TableCell>
                       <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${custo.ativo ? 'bg-green-100 text-green-700 dark:bg-green-700/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-700/30 dark:text-red-300'}`}>
                            {custo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                       </TableCell>
                      <TableCell className="text-center space-x-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenModal(custo)} className="hover:text-blue-600 disabled:text-muted-foreground" disabled={!activeUserId || isSubmittingForm || (isBypassAuthActive && !user)}>
                                <Edit3 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Editar Custo Fixo</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCustoFixoConfigurado(custo.id)} className="hover:text-destructive disabled:text-muted-foreground" disabled={!activeUserId || isSubmittingForm || (isBypassAuthActive && !user) }>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Excluir Custo Fixo (Permanente)</p></TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>Exibindo {custosFixosLista.length} custo(s) fixo(s) configurado(s) {showInactive ? "(incluindo inativos)" : "(apenas ativos)"}.</TableCaption>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(open) => {
        if (!open) {
          setCurrentCustoFixo(null);
          form.reset(defaultFormValues);
        }
        setIsModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentCustoFixo ? 'Editar' : 'Adicionar'} Custo Fixo Planejado</DialogTitle>
            <DialogDesc>
              {currentCustoFixo ? 'Modifique os detalhes do custo fixo.' : 'Preencha os dados para um novo custo fixo recorrente.'}
            </DialogDesc>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome do Custo *</FormLabel><FormControl><Input placeholder="Ex: Aluguel do Escritório" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="valorMensal" render={({ field }) => (
                <FormItem><FormLabel>Valor Mensal Planejado (R$) *</FormLabel><FormControl><Input type="number" placeholder="2000.00" {...field} step="0.01"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="categoria" render={({ field }) => (
                <FormItem><FormLabel>Categoria (Opcional)</FormLabel><FormControl><Input placeholder="Ex: Infraestrutura, Software, Marketing" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais sobre este custo..." {...field} value={field.value || ''} rows={3}/></FormControl><FormMessage /></FormItem>
              )} />
              {currentCustoFixo && (
                 <FormField
                    control={form.control}
                    name="ativo"
                    render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mt-2">
                        <div className="space-y-0.5">
                        <FormLabel>Custo Ativo</FormLabel>
                        <FormDescUI>
                            {field.value ? "Este custo está ativo." : "Este custo está inativo."}
                        </FormDescUI>
                        </div>
                        <FormControl>
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSubmittingForm}
                        />
                        </FormControl>
                    </FormItem>
                    )}
                />
              )}
              <DialogFooter className="sticky bottom-0 bg-background py-4 border-t">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmittingForm}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmittingForm}>
                  {isSubmittingForm ? <Loader2 className="animate-spin h-4 w-4 mr-2"/> : <Save className="h-4 w-4 mr-2"/>}
                  {currentCustoFixo ? 'Salvar Alterações' : 'Adicionar Custo'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
