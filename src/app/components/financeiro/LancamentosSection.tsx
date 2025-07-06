
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PlusCircle,
  Trash2,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Filter,
  HandCoins,
  Edit3,
} from 'lucide-react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  getCountFromServer,
  Timestamp,
  type QueryConstraint,
  type DocumentData,
  endBefore,
  limitToLast,
  type DocumentSnapshot,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateDoc,
} from 'firebase/firestore';
import { format, startOfMonth, endOfMonth, subMonths, isValid, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { getActiveUserId } from '@/lib/authUtils';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { registerPartialPayment } from '@/app/financeiro/actions';

import { LancamentoFinanceiroCreateSchema, LancamentoFinanceiroUpdateSchema, LancamentoFinanceiroSchema } from '@/schemas/lancamentoFinanceiroSchema';
import type { LancamentoFinanceiro as LancamentoFinanceiroFirestore, LancamentoFinanceiroCreateData as LancamentoFormValues, LancamentoFinanceiroUpdateData } from '@/schemas/lancamentoFinanceiroSchema';


const ITEMS_PER_PAGE = 10;

const LancamentoTableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-5 w-20 rounded" /></TableCell>
    <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
    <TableCell className="text-right"><Skeleton className="h-5 w-24 ml-auto rounded" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
    <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
    <TableCell className="text-center">
      <div className="flex justify-center gap-1">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </TableCell>
  </TableRow>
);

const paymentFormSchema = z.object({
  valorPagamento: z.coerce.number().positive("O valor do pagamento deve ser maior que zero."),
  dataPagamento: z.date({ required_error: "A data do pagamento é obrigatória." }),
  formaPagamento: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});
type PaymentFormValues = z.infer<typeof paymentFormSchema>;


export default function LancamentosSection() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiroFirestore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  const [lancamentoToPay, setLancamentoToPay] = useState<LancamentoFinanceiroFirestore | null>(null);
  const [lancamentoToEdit, setLancamentoToEdit] = useState<LancamentoFinanceiroFirestore | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const lastVisible = useRef<DocumentSnapshot<DocumentData> | null>(null);
  const firstVisible = useRef<DocumentSnapshot<DocumentData> | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'RECEITA' | 'DESPESA'>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'recebido' | 'pendente' | 'liquidado'>('todos');

  const [totalReceitasDoMesCompleto, setTotalReceitasDoMesCompleto] = useState(0);
  const [totalDespesasDoMesCompleto, setTotalDespesasDoMesCompleto] = useState(0);
  const [saldoRealizadoDoMesCompleto, setSaldoRealizadoDoMesCompleto] = useState(0);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(true);

  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<LancamentoFinanceiroFirestore | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  const activeUserId = useMemo(() => getActiveUserId(user), [user]);

  const defaultFormValues: LancamentoFormValues = {
      titulo: '', valor: 0, tipo: 'RECEITA', data: new Date(),
      categoria: '', status: 'pendente', descricao: '',
      clienteFornecedor: '', formaPagamento: '', referenciaOSId: '',
      vendaId: '', valorOriginal: null,
  };

  const form = useForm<LancamentoFormValues | LancamentoFinanceiroUpdateData>({
    resolver: zodResolver(isEditModalOpen ? LancamentoFinanceiroUpdateSchema : LancamentoFinanceiroCreateSchema),
    defaultValues: defaultFormValues,
  });

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema)
  });

  const generateMonthOptions = () => {
    const options = [];
    let date = new Date();
    for (let i = 0; i < 12; i++) {
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy', { locale: ptBR }),
      });
      date = subMonths(date, 1);
    }
    return options;
  };
  const monthOptions = useMemo(generateMonthOptions, []);

  const fetchMonthlySummaries = useCallback(async () => {
    if (!activeUserId) {
      setTotalReceitasDoMesCompleto(0);
      setTotalDespesasDoMesCompleto(0);
      setSaldoRealizadoDoMesCompleto(0);
      setIsLoadingSummaries(false);
      return;
    }
    setIsLoadingSummaries(true);
    try {
      const dateString = currentMonth + '-01T00:00:00';
      const selectedMonthDate = new Date(dateString);
      const inicioMes = startOfMonth(selectedMonthDate);
      const fimMes = endOfMonth(selectedMonthDate);

      const qAll = query(
        collection(db, 'lancamentosFinanceiros'),
        where('userId', '==', activeUserId),
        where('data', '>=', Timestamp.fromDate(inicioMes)),
        where('data', '<=', Timestamp.fromDate(fimMes))
      );
      const allDocsSnapshot = await getDocs(qAll);
      const allLancamentosDoMes = allDocsSnapshot.docs.map(d => LancamentoFinanceiroSchema.parse({id: d.id, ...d.data()}));

      let tempTotalReceitas = 0;
      let tempTotalDespesas = 0;
      let tempSaldoRecebido = 0;
      let tempSaldoPago = 0;

      allLancamentosDoMes.forEach(l => {
        const tipoNormalizado = l.tipo.toUpperCase();
        const statusNormalizado = l.status.toLowerCase();
        
        if (tipoNormalizado === 'RECEITA') {
          tempTotalReceitas += l.valorOriginal || l.valor;
          if (statusNormalizado === 'recebido' || statusNormalizado === 'liquidado') {
             tempSaldoRecebido += statusNormalizado === 'liquidado' ? (l.valorOriginal || l.valor) : l.valor;
          }
        } else if (tipoNormalizado === 'DESPESA') {
          tempTotalDespesas += l.valorOriginal || l.valor;
          if (statusNormalizado === 'pago' || statusNormalizado === 'liquidado') {
            tempSaldoPago += statusNormalizado === 'liquidado' ? (l.valorOriginal || l.valor) : l.valor;
          }
        }
      });
      setTotalReceitasDoMesCompleto(tempTotalReceitas);
      setTotalDespesasDoMesCompleto(tempTotalDespesas);
      setSaldoRealizadoDoMesCompleto(tempSaldoRecebido - tempSaldoPago);
    } catch (e) {
      toast({ title: "Erro ao calcular resumos", description: (e as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingSummaries(false);
    }
  }, [activeUserId, currentMonth, toast]);

  const fetchLancamentos = useCallback(async (page = 1, direction: 'next' | 'prev' | 'current' = 'current') => {
    if (!activeUserId) {
        setLancamentos([]);
        setTotalItems(0);
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const { inicioPeriodo, fimPeriodo } = selectedDate 
        ? { inicioPeriodo: startOfDay(selectedDate), fimPeriodo: endOfDay(selectedDate) }
        : { inicioPeriodo: startOfMonth(new Date(currentMonth + '-02')), fimPeriodo: endOfMonth(new Date(currentMonth + '-02')) };

      const baseConstraints: QueryConstraint[] = [ where('userId', '==', activeUserId), where('data', '>=', Timestamp.fromDate(inicioPeriodo)), where('data', '<=', Timestamp.fromDate(fimPeriodo)) ];
      if (filtroStatus !== 'todos') baseConstraints.push(where('status', '==', filtroStatus));
      if (filtroTipo !== 'todos') baseConstraints.push(where('tipo', '==', filtroTipo));

      const qBaseCount = query(collection(db, 'lancamentosFinanceiros'), ...baseConstraints);
      const countSnapshot = await getCountFromServer(qBaseCount);
      setTotalItems(countSnapshot.data().count);

      const orderByData = orderBy('data', 'desc');
      let qData;

      if (direction === 'current') {
          lastVisible.current = null;
          firstVisible.current = null;
      }
      if (direction === 'next' && lastVisible.current) {
        qData = query(collection(db, 'lancamentosFinanceiros'), ...baseConstraints, orderByData, startAfter(lastVisible.current), limit(ITEMS_PER_PAGE));
      } else if (direction === 'prev' && firstVisible.current) {
        qData = query(collection(db, 'lancamentosFinanceiros'), ...baseConstraints, orderByData, endBefore(firstVisible.current), limitToLast(ITEMS_PER_PAGE));
      } else {
        qData = query(collection(db, 'lancamentosFinanceiros'), ...baseConstraints, orderByData, limit(ITEMS_PER_PAGE));
      }
      
      const documentSnapshots = await getDocs(qData);
      const fetchedLancamentos = documentSnapshots.docs.map(docSnap => LancamentoFinanceiroSchema.parse({ id: docSnap.id, ...docSnap.data() }));

      setLancamentos(fetchedLancamentos);

      if (documentSnapshots.docs.length > 0) {
        lastVisible.current = documentSnapshots.docs[documentSnapshots.docs.length - 1];
        firstVisible.current = documentSnapshots.docs[0];
      }
      setCurrentPage(page);

    } catch (e: any) {
      setError('Falha ao carregar lançamentos. Verifique os índices do Firestore.');
      if (e.message?.includes("indexes")) {
         toast({ title: 'Atenção: Índice do Firestore Necessário', description: 'Filtro requer um índice composto. Verifique o console para um link de criação.', variant: 'destructive', duration: 10000 });
      }
      setLancamentos([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId, currentMonth, filtroTipo, filtroStatus, selectedDate, toast]);

  useEffect(() => {
    if (activeUserId) {
      fetchLancamentos(1, 'current');
      if (!selectedDate) fetchMonthlySummaries();
      else {
        setTotalReceitasDoMesCompleto(0);
        setTotalDespesasDoMesCompleto(0);
        setSaldoRealizadoDoMesCompleto(0);
      }
    }
  }, [activeUserId, currentMonth, filtroTipo, filtroStatus, selectedDate, fetchLancamentos, fetchMonthlySummaries]);

  useEffect(() => {
    if (!authLoading && !activeUserId) {
      router.push('/login?redirect=/financeiro');
    }
  }, [authLoading, activeUserId, router]);

  const handleSaveLancamento: SubmitHandler<LancamentoFormValues> = async (data) => {
    if (!activeUserId) { toast({ title: 'Erro', description: 'Usuário não autenticado.', variant: 'destructive' }); return; }
    setIsSubmitting(true);
    
    const collectionRef = collection(db, 'lancamentosFinanceiros');
    
    try {
      if (lancamentoToEdit) { // Update logic
        const docRef = doc(db, 'lancamentosFinanceiros', lancamentoToEdit.id);
        const dataToUpdate = LancamentoFinanceiroUpdateSchema.parse(data);
        await updateDoc(docRef, { ...dataToUpdate, data: Timestamp.fromDate(data.data as Date), updatedAt: Timestamp.now() });
        toast({ title: 'Sucesso!', description: 'Lançamento atualizado.' });
      } else { // Create logic
        const dataToCreate = LancamentoFinanceiroCreateSchema.parse(data);
        const submissionData = { ...dataToCreate, userId: activeUserId, createdAt: Timestamp.now(), updatedAt: Timestamp.now() };
        await addDoc(collectionRef, { ...submissionData, data: Timestamp.fromDate(data.data as Date) });
        toast({ title: 'Sucesso!', description: 'Lançamento adicionado.' });
      }
      
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setLancamentoToEdit(null);
      fetchLancamentos(1, 'current');
      fetchMonthlySummaries();
    } catch (e: any) {
      toast({ title: 'Erro ao Salvar', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenAddModal = () => {
    form.reset(defaultFormValues);
    setLancamentoToEdit(null);
    setIsAddModalOpen(true);
  };
  
  const handleOpenEditModal = (lancamento: LancamentoFinanceiroFirestore) => {
    setLancamentoToEdit(lancamento);
    form.reset({
      ...lancamento,
      data: lancamento.data.toDate(),
    });
    setIsEditModalOpen(true);
  };
  
  const handleOpenPaymentModal = (lancamento: LancamentoFinanceiroFirestore) => {
    setLancamentoToPay(lancamento);
    paymentForm.reset({ valorPagamento: lancamento.valor, dataPagamento: new Date() });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit: SubmitHandler<PaymentFormValues> = async (data) => {
    if (!user || !lancamentoToPay) return;
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      await registerPartialPayment(idToken, { lancamentoId: lancamentoToPay.id, ...data });
      toast({ title: 'Sucesso!', description: 'Pagamento registrado com sucesso.' });
      setIsPaymentModalOpen(false);
      fetchLancamentos(1, 'current');
      fetchMonthlySummaries();
    } catch (error) {
      toast({ title: 'Erro ao Registrar Pagamento', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (lancamentoId: string) => {
    if (!activeUserId) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'lancamentosFinanceiros', lancamentoId));
      toast({ title: 'Sucesso!', description: 'Lançamento excluído.' });
      fetchLancamentos(1, 'current');
      fetchMonthlySummaries();
    } catch (e: any) {
      toast({ title: 'Erro ao Excluir', description: e.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleOpenDeleteDialog = (lancamento: LancamentoFinanceiroFirestore) => {
    setItemToDelete(lancamento);
    setDeletePassword('');
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !user.email || !itemToDelete) return;

    setIsVerifyingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);
      
      toast({ title: 'Senha verificada!', description: 'Excluindo lançamento...' });
      await handleDelete(itemToDelete.id);
      setIsDeleteDialogOpen(false);

    } catch (error) {
      console.error("Password verification failed:", error);
      toast({ title: 'Senha Incorreta', description: 'A senha fornecida está incorreta. A exclusão foi cancelada.', variant: 'destructive' });
    } finally {
      setIsVerifyingPassword(false);
      setDeletePassword('');
    }
  };

  const filteredLancamentos = useMemo(() => {
    if (!searchTerm) return lancamentos;
    return lancamentos.filter(l => l.titulo?.toLowerCase().includes(searchTerm) || l.categoria?.toLowerCase().includes(searchTerm));
  }, [lancamentos, searchTerm]);

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-[300px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const ModalForm = (
    <Dialog open={isAddModalOpen || isEditModalOpen} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setIsAddModalOpen(false);
        setIsEditModalOpen(false);
        setLancamentoToEdit(null);
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lancamentoToEdit ? 'Editar' : 'Adicionar'} Lançamento</DialogTitle>
          <DialogDescription>Preencha os detalhes do lançamento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSaveLancamento)} className="space-y-4 pt-4">
            <FormField control={form.control} name="titulo" render={({ field }) => (<FormItem><FormLabel>Título</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="valor" render={({ field }) => (<FormItem><FormLabel>Valor (R$)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)}/>
              <FormField control={form.control} name="data" render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel className="mb-1">Data</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value instanceof Timestamp ? field.value.toDate() : field.value, 'PPP', {locale: ptBR}) : "Escolha a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value instanceof Timestamp ? field.value.toDate() : field.value} onSelect={field.onChange} toDate={new Date()} locale={ptBR} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem><FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent><SelectItem value="RECEITA">Receita</SelectItem><SelectItem value="DESPESA">Despesa</SelectItem></SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="recebido">Recebido</SelectItem>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}/>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Salvar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );

  return (
    <Card className="mt-6 shadow-md rounded-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-headline">Lançamentos e Contas</CardTitle>
            <CardDescription>Gerencie suas receitas, despesas e contas a pagar/receber.</CardDescription>
          </div>
          <Button onClick={handleOpenAddModal} variant="default" className="w-full sm:w-auto" disabled={!activeUserId || isSubmitting}>
            <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Lançamento
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter Section */}
        <div className="mb-6 p-4 border rounded-md bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="lg:col-span-1">
              <Label htmlFor="search-lancamento" className="text-xs">Buscar</Label>
              <Input id="search-lancamento" type="search" placeholder="Título, categoria..." value={searchTerm} onChange={e => setSearchTerm(e.target.value.toLowerCase())} className="pl-8 h-10" disabled={isLoading} />
            </div>
            <div>
              <Label htmlFor="filtro-mes" className="text-xs">Mês</Label>
              <Select value={currentMonth} onValueChange={v => { setCurrentMonth(v); setSelectedDate(undefined); }} disabled={isLoading}><SelectTrigger id="filtro-mes"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>
            </div>
            <div>
              <Label htmlFor="filtro-dia" className="text-xs">Dia</Label>
              <Popover><PopoverTrigger asChild><Button id="filtro-dia" variant="outline" className={cn("w-full justify-start text-left font-normal h-10",!selectedDate && "text-muted-foreground")} disabled={isLoading}><CalendarDays className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Filtro por dia</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus locale={ptBR} /><div className="p-2 border-t text-center"><Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)}>Limpar</Button></div></PopoverContent></Popover>
            </div>
            <div>
              <Label htmlFor="filtro-tipo" className="text-xs">Tipo</Label>
              <Select value={filtroTipo} onValueChange={(v) => setFiltroTipo(v as any)} disabled={isLoading}><SelectTrigger id="filtro-tipo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="RECEITA">Receitas</SelectItem><SelectItem value="DESPESA">Despesas</SelectItem></SelectContent></Select>
            </div>
            <div>
              <Label htmlFor="filtro-status" className="text-xs">Status</Label>
              <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as any)} disabled={isLoading}><SelectTrigger id="filtro-status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="recebido">Recebido</SelectItem><SelectItem value="pago">Pago</SelectItem><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="liquidado">Liquidado</SelectItem></SelectContent></Select>
            </div>
          </div>
        </div>

        {/* Summaries Section */}
        {isLoadingSummaries && activeUserId && !selectedDate ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>
        ) : !selectedDate && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-green-50 dark:bg-green-900/30"><CardHeader className="pb-2"><CardDescription className="text-sm text-green-700 dark:text-green-300 flex items-center gap-1"><TrendingUp size={16}/>Total Previsto (Receitas)</CardDescription><CardTitle className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalReceitasDoMesCompleto)}</CardTitle></CardHeader></Card>
            <Card className="bg-red-50 dark:bg-red-900/30"><CardHeader className="pb-2"><CardDescription className="text-sm text-red-700 dark:text-red-300 flex items-center gap-1"><TrendingDown size={16}/>Total Previsto (Despesas)</CardDescription><CardTitle className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(totalDespesasDoMesCompleto)}</CardTitle></CardHeader></Card>
            <Card className="bg-blue-50 dark:bg-blue-900/30"><CardHeader className="pb-2"><CardDescription className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-1"><DollarSign size={16}/>Saldo Realizado</CardDescription><CardTitle className={`text-2xl font-bold ${saldoRealizadoDoMesCompleto >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(saldoRealizadoDoMesCompleto)}</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground">Recebidos - Pagos</p></CardContent></Card>
          </div>
        )}

        {/* Table Section */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead><TableHead>Título</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Categoria</TableHead><TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredLancamentos.length === 0 ? Array.from({ length: 5 }).map((_, i) => <LancamentoTableRowSkeleton key={i} />)
              : !isLoading && filteredLancamentos.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />Nenhum lançamento encontrado.</TableCell></TableRow>
              ) : (
                filteredLancamentos.map(l => (
                  <TableRow key={l.id}>
                    <TableCell>{l.data && isValid(l.data.toDate()) ? format(l.data.toDate(), 'dd/MM/yy') : 'Inválida'}</TableCell>
                    <TableCell className="font-medium max-w-xs truncate">{l.titulo}</TableCell>
                    <TableCell className={`text-right font-semibold ${l.tipo === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>
                      {l.status === 'pendente' && l.valorOriginal ? (<div className="flex flex-col items-end -my-2"><span title="Valor restante">{formatCurrency(l.valor)}</span><span className="text-xs text-muted-foreground font-normal" title="Valor original">de {formatCurrency(l.valorOriginal)}</span></div>) : formatCurrency(l.valor)}
                    </TableCell>
                    <TableCell><Badge variant={l.tipo === 'RECEITA' ? 'default' : 'destructive'} className={l.tipo === 'RECEITA' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>{l.tipo}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={l.status === 'pago' || l.status === 'recebido' ? 'default' : (l.status === 'pendente' ? 'outline' : 'secondary')}
                        className={cn(l.status === 'pago' || l.status === 'recebido' && 'bg-emerald-500 text-white', l.status === 'pendente' && 'border-amber-500 text-amber-600', l.status === 'liquidado' && 'bg-blue-100 text-blue-800')}>
                        {l.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{l.categoria}</TableCell>
                    <TableCell className="text-center space-x-1">
                      {l.tipo === 'DESPESA' && l.status === 'pendente' && <Button variant="outline" size="sm" className="h-8" onClick={() => handleOpenPaymentModal(l)} disabled={isSubmitting}><HandCoins className="h-4 w-4 mr-1"/>Pagar</Button>}
                      <Button variant="ghost" size="icon" className="hover:text-destructive" disabled={isSubmitting} onClick={() => handleOpenDeleteDialog(l)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            <TableCaption>Exibindo {filteredLancamentos.length} de {totalItems} lançamentos. {totalPages > 1 && `Página ${currentPage} de ${totalPages}.`}</TableCaption>
          </Table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <Button onClick={() => fetchLancamentos(currentPage - 1, 'prev')} disabled={currentPage === 1 || isLoading} variant="outline" size="sm"><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</Button>
            <span className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</span>
            <Button onClick={() => fetchLancamentos(currentPage + 1, 'next')} disabled={currentPage === totalPages || isLoading} variant="outline" size="sm">Próxima <ChevronRight className="h-4 w-4 ml-1" /></Button>
          </div>
        )}
      </CardContent>

      {ModalForm}
      
      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
            <DialogDescription>
              Pagando <span className="font-bold">{lancamentoToPay?.titulo}</span>. Valor pendente: <span className="font-bold text-red-600">{formatCurrency(lancamentoToPay?.valor || 0)}</span>.
            </DialogDescription>
          </DialogHeader>
          <Form {...paymentForm}>
            <form onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)} className="space-y-4 pt-4">
              <FormField control={paymentForm.control} name="valorPagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor a Pagar (R$)</FormLabel>
                  <FormControl><Input type="number" {...field} max={lancamentoToPay?.valor} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paymentForm.control} name="dataPagamento" render={({ field }) => (
                <FormItem className="flex flex-col pt-2">
                  <FormLabel className="mb-1">Data do Pagamento</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP', {locale: ptBR}) : "Escolha a data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} toDate={new Date()} locale={ptBR} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paymentForm.control} name="formaPagamento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Forma de Pagamento</FormLabel>
                  <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar Pagamento</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                    Para excluir o lançamento <span className="font-semibold text-foreground">"{itemToDelete?.titulo}"</span>, digite sua senha de login. Esta ação é irreversível.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2 space-y-2">
                <Label htmlFor="delete-password">Senha</Label>
                <Input 
                    id="delete-password" 
                    type="password" 
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isVerifyingPassword} onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleConfirmDelete} 
                    disabled={!deletePassword || isVerifyingPassword} 
                    className="bg-destructive hover:bg-destructive/90"
                >
                    {isVerifyingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
}
