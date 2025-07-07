
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ListFilter, Search, Loader2, Settings2, Eye, CreditCard, CalendarIcon as CalendarIconLucide, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogPrimitiveDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  runTransaction,
  getDoc,
  type Firestore
} from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

import {
  getOrdemServicoById,
  updateOrdemServico,
} from '@/services/ordemServicoService';
import { createLancamentoFinanceiro } from '@/services/lancamentoFinanceiroService';
import { getUserProfile, type UserProfileData } from '@/services/userProfileService';

import {
  type ItemOS,
  type OrdemServicoStatus,
  PagamentoOsSchema,
  type PagamentoOsFormValues,
  OrdemServicoStatusEnum,
  PaymentStatusEnum,
  type OrdemServico as OrdemServicoOriginal
} from '@/schemas/ordemServicoSchema';


type ProductionOrderStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

interface OrdemServicoComItensEId extends OrdemServicoOriginal {
  id: string;
  itens: ItemOS[];
}

interface ProductionOrderFirestore {
  id: string;
  agendamentoId: string;
  clienteId?: string;
  clienteNome: string;
  servicoNome: string;
  dataAgendamento: Timestamp;
  status: ProductionOrderStatus;
  progresso?: number;
  observacoesAgendamento?: string;
  observacoesProducao?: string;
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface ProductionOrder extends Omit<ProductionOrderFirestore, 'dataAgendamento' | 'criadoEm' | 'atualizadoEm'> {
  dataAgendamento: Date;
  criadoEm: Date;
  atualizadoEm: Date;
}

interface EditingOrderState {
  progresso: number;
  observacoesProducao: string;
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto Bancário" },
  { value: "transferencia_bancaria", label: "Transferência Bancária" },
  { value: "outro", label: "Outro" },
];

const getStatusVariant = (status: ProductionOrderStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Concluído": return "default";
    case "Em Andamento": return "secondary";
    case "Pendente": return "outline";
    case "Cancelado": return "destructive";
    default: return "outline";
  }
};

const getStatusFromProgress = (progress: number): ProductionOrderStatus => {
  if (progress === 0) return "Pendente";
  if (progress === 100) return "Concluído";
  if (progress > 0 && progress < 100) return "Em Andamento";
  return "Pendente";
};


export default function ProducaoPage() {
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  const [editingOrderDetails, setEditingOrderDetails] = useState<EditingOrderState | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [isFinalPaymentModalOpen, setIsFinalPaymentModalOpen] = useState(false);
  const [orderForFinalPayment, setOrderForFinalPayment] = useState<ProductionOrder | null>(null);
  const [osForFinalPayment, setOsForFinalPayment] = useState<OrdemServicoOriginal | null>(null);

  const [statusFilters, setStatusFilters] = useState<Record<ProductionOrderStatus, boolean>>({
    "Pendente": true,
    "Em Andamento": true,
    "Concluído": true,
    "Cancelado": true,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [osForPrinting, setOsForPrinting] = useState<OrdemServicoOriginal | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoadingPrintData, setIsLoadingPrintData] = useState(false);


  const finalPaymentForm = useForm<PagamentoOsFormValues>({
    resolver: zodResolver(PagamentoOsSchema),
    defaultValues: {
      valorPago: 0,
      formaPagamento: paymentMethods[0].value,
      dataPagamento: new Date(),
      observacoesPagamento: "",
    },
  });

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/producao');
    }
  }, [user, isAuthenticating, router]);

  const safeToDate = (timestampField: any, fieldName: string, defaultDateVal: Date): Date => {
    if (timestampField && typeof timestampField.toDate === 'function') {
      return timestampField.toDate();
    }
    const defaultValToUse = fieldName === 'dataAgendamento' ? new Date(0) : defaultDateVal;
    console.warn(`[ProducaoPage] Campo Timestamp '${fieldName}' ausente ou inválido para OP ID ${viewingOrder?.id || 'desconhecido'}. Usando data padrão: ${defaultValToUse.toISOString()}`);
    return defaultValToUse;
  };

  const fetchProductionOrders = useCallback(async () => {
    if (!user?.uid) {
      setProductionOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para buscar OPs.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const collectionRef = collection(dbInstance, "ordensDeProducao");
      const q = query(
        collectionRef,
        where("userId", "==", user.uid),
        orderBy("dataAgendamento", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOrders = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ProductionOrderFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          progresso: data.progresso ?? 0,
          observacoesProducao: data.observacoesProducao ?? '',
          dataAgendamento: safeToDate(data.dataAgendamento, `dataAgendamento - OP ID ${docSnap.id}`, new Date(0)),
          criadoEm: safeToDate(data.criadoEm, `criadoEm - OP ID ${docSnap.id}`, new Date()),
          atualizadoEm: safeToDate(data.atualizadoEm, `atualizadoEm - OP ID ${docSnap.id}`, new Date()),
        } as ProductionOrder;
      });
      setProductionOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Erro ao buscar ordens de produção:", error);
      toast({ title: "Erro ao buscar ordens", variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, viewingOrder?.id]);

  useEffect(() => {
    if (!isAuthenticating && user) {
        fetchProductionOrders();
        getUserProfile(user.uid).then(setUserProfile).catch(err => {
            console.error("Failed to fetch user profile for printing:", err);
            toast({ title: "Erro ao buscar dados da empresa", description: "Não foi possível carregar os dados da sua empresa para a impressão.", variant: "destructive" });
        });
    }
  }, [fetchProductionOrders, user, isAuthenticating, toast]);


  useEffect(() => {
    const agendamentoIdFromParams = searchParams.get('agendamentoId');
    if (agendamentoIdFromParams) {
      setSearchTerm(agendamentoIdFromParams);
    }
  }, [searchParams]);

  const handleStatusFilterChange = (status: ProductionOrderStatus, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [status]: checked }));
  };

  const handleViewDetails = (order: ProductionOrder) => {
    setViewingOrder(order);
    setEditingOrderDetails({
        progresso: order.progresso ?? 0,
        observacoesProducao: order.observacoesProducao ?? '',
    });
    setIsViewModalOpen(true);
  }

  const updateOriginalOSStatusViaService = async (osId: string, newStatus: OrdemServicoStatus) => {
    try {
      await updateOrdemServico(osId, { status: newStatus });
    } catch (error: any) {
      const errorMessage = (error as Error).message || 'Erro desconhecido';
      if (errorMessage.includes("Missing or insufficient permissions")) {
        console.warn(`[Permissão Negada] Falha ao atualizar status da OS Original ${osId} para ${newStatus}. Usuário atual: ${user?.uid}. Verifique se você é o proprietário desta OS ou se ela existe.`, error);
        toast({
          title: `Permissão Negada (OS Original)`,
          description: `Não foi possível atualizar o status da OS #${osId.substring(0,6)}... para "${newStatus}". Verifique se você é o proprietário desta OS ou se ela existe.`,
          variant: "destructive",
          duration: 7000,
        });
      } else {
        console.error(`Erro ao atualizar status da OS ${osId} via serviço:`, error);
        toast({
          title: `Erro ao Sincronizar Status da OS Original`,
          description: `Não foi possível atualizar o status da OS #${osId.substring(0,6)}... para ${newStatus}. Detalhe: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }
  };

  const performStockDeduction = async (osId: string) => {
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) return;

    const osOriginalRef = doc(dbInstance, "ordensServico", osId);
    const osOriginalSnap = await getDoc(osOriginalRef);

    if (osOriginalSnap.exists()) {
        const osData = { id: osOriginalSnap.id, ...osOriginalSnap.data() } as OrdemServicoComItensEId;
        if (osData.itens && osData.itens.length > 0) {
            for (const itemOS of osData.itens) {
                if (itemOS.tipo === 'Produto' && itemOS.produtoServicoId) {
                    const produtoCatalogoRef = doc(dbInstance, "produtosServicos", itemOS.produtoServicoId);
                    try {
                        await runTransaction(dbInstance, async (transaction) => {
                            const produtoDoc = await transaction.get(produtoCatalogoRef);
                            if (!produtoDoc.exists()) {
                                console.warn(`Produto ${itemOS.nome} (ID: ${itemOS.produtoServicoId}) da OS ${osId} não encontrado no catálogo para baixa de estoque.`);
                                return;
                            }
                            const produtoData = produtoDoc.data() as any;
                            const estoqueAtual = produtoData.quantidadeEstoque ?? 0;
                            const novoEstoque = estoqueAtual - itemOS.quantidade;
                            transaction.update(produtoCatalogoRef, {
                                quantidadeEstoque: novoEstoque,
                                atualizadoEm: Timestamp.now()
                            });
                        });
                        toast({ title: `Estoque Baixado: ${itemOS.nome}`, description: `${itemOS.quantidade} unidade(s) deduzida(s).` });
                    } catch (stockError: any) {
                        console.error(`Erro ao baixar estoque para ${itemOS.nome} (OS: ${osId}):`, stockError);
                        toast({
                            title: `Erro de Estoque: ${itemOS.nome}`,
                            description: `Não foi possível atualizar o estoque: ${stockError.message}. Verifique manualmente.`,
                            variant: "destructive",
                        });
                    }
                }
            }
        }
    } else {
        console.warn(`Ordem de Serviço original (ID: ${osId}) não encontrada para baixa de estoque.`);
    }
};


  const completeProductionAndOS = async (productionOrder: ProductionOrder) => {
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
        toast({ title: "Erro de Firebase", description: "DB não disponível.", variant: "destructive" });
        return;
    }
    const prodOrderRef = doc(dbInstance, "ordensDeProducao", productionOrder.id);
    await updateDoc(prodOrderRef, {
        status: "Concluído",
        progresso: 100,
        atualizadoEm: Timestamp.now()
    });
    await updateOriginalOSStatusViaService(productionOrder.agendamentoId, OrdemServicoStatusEnum.Enum.Concluído);
    await performStockDeduction(productionOrder.agendamentoId);
    toast({ title: "Produção Concluída!", description: `Ordem de produção e OS #${productionOrder.agendamentoId.substring(0,6)}... concluídas.` });
    await fetchProductionOrders();
};


const handleOpenFinalPaymentModal = async (order: ProductionOrder) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const osData = await getOrdemServicoById(order.agendamentoId);
        if (!osData) {
            toast({ title: "Erro", description: "Ordem de Serviço original não encontrada.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        setOsForFinalPayment(osData);
        setOrderForFinalPayment(order);

        const valorPendente = osData.valorTotal - (osData.valorPagoTotal || 0);
        if (valorPendente <= 0) {
            await completeProductionAndOS(order);
        } else {
            finalPaymentForm.reset({
                valorPago: parseFloat(valorPendente.toFixed(2)),
                formaPagamento: paymentMethods[0].value,
                dataPagamento: new Date(),
                observacoesPagamento: `Pagamento final da OS #${osData.numeroOS.substring(0,6)}`,
            });
            setIsFinalPaymentModalOpen(true);
        }
    } catch (error: any) {
        toast({ title: "Erro ao buscar OS", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
};


  const handleFinalPaymentSubmit = async (paymentData: PagamentoOsFormValues) => {
    if (!orderForFinalPayment || !osForFinalPayment || !user) return;
    setIsSubmitting(true);
    const userIdToSave = user.uid;

    try {
        await createLancamentoFinanceiro(userIdToSave, {
            titulo: `Pagamento Final OS #${osForFinalPayment.numeroOS.substring(0,6)}`,
            valor: paymentData.valorPago,
            tipo: 'receita',
            data: paymentData.dataPagamento,
            categoria: "Receita de OS (Final)",
            status: 'recebido',
            referenciaOSId: osForFinalPayment.id,
            formaPagamento: paymentData.formaPagamento,
            descricao: paymentData.observacoesPagamento || "",
        });

        const valorTotalPagoAtualizado = (osForFinalPayment.valorPagoTotal || 0) + paymentData.valorPago;
        await updateOrdemServico(osForFinalPayment.id, {
            valorPagoTotal: valorTotalPagoAtualizado,
            statusPagamento: PaymentStatusEnum.Enum['Pago Total'],
            dataUltimoPagamento: paymentData.dataPagamento,
            formaUltimoPagamento: paymentData.formaPagamento,
            observacoesPagamento: paymentData.observacoesPagamento,
        });

        await completeProductionAndOS(orderForFinalPayment);

        setIsFinalPaymentModalOpen(false);
        setOrderForFinalPayment(null);
        setOsForFinalPayment(null);

    } catch (error: any) {
        toast({ title: "Erro ao Processar Pagamento Final", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };


const processCompletion = async (order: ProductionOrder, newProgress?: number) => {
    const progressToUse = newProgress !== undefined ? newProgress : (order.progresso ?? 0);
    if (progressToUse === 100 || getStatusFromProgress(progressToUse) === "Concluído") {
        await handleOpenFinalPaymentModal(order);
    } else {
        const { db: dbInstance } = getFirebaseInstances();
        if (!dbInstance) {
            toast({ title: "Erro de Firebase", description: "DB não disponível.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        const newStatus = getStatusFromProgress(progressToUse);
        const prodOrderRef = doc(dbInstance, "ordensDeProducao", order.id);
        await updateDoc(prodOrderRef, {
            status: newStatus,
            progresso: progressToUse,
            atualizadoEm: Timestamp.now()
        });
        await updateOriginalOSStatusViaService(order.agendamentoId, newStatus as OrdemServicoStatus);
        toast({ title: "Status Atualizado!", description: `Ordem de produção #${order.id.substring(0,6)}... atualizada para ${newStatus}.` });
        await fetchProductionOrders();
    }
};

const handleQuickStatusUpdate = async (order: ProductionOrder, newStatus: ProductionOrderStatus, newProgress: number) => {
    if (!user) return;
    setIsSubmitting(true);
    if (newStatus === "Concluído") {
        await handleOpenFinalPaymentModal(order);
    } else {
        const { db: dbInstance } = getFirebaseInstances();
        if (!dbInstance) {
          toast({ title: "Erro de Firebase", description: "DB não disponível para atualizar OP.", variant: "destructive" });
          setIsSubmitting(false);
          return;
        }
        try {
            const prodOrderRef = doc(dbInstance, "ordensDeProducao", order.id);
            await updateDoc(prodOrderRef, {
                status: newStatus,
                progresso: newProgress,
                atualizadoEm: Timestamp.now()
            });
            await updateOriginalOSStatusViaService(order.agendamentoId, newStatus as OrdemServicoStatus);
            toast({ title: "Status Atualizado!", description: `Ordem de produção #${order.id.substring(0,6)}... atualizada para ${newStatus}.` });
            await fetchProductionOrders();
        } catch (error: any) {
            console.error("Erro ao atualizar status (sem ser concluído):", error);
            toast({ title: "Erro ao Atualizar Status", variant: "destructive", description: `Detalhe: ${error.message || 'Erro desconhecido.'}` });
        }
    }
    setIsSubmitting(false);
};


  const handleSaveProductionDetails = async () => {
    if (!viewingOrder || !editingOrderDetails || !user) return;
    setIsSubmitting(true);

    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para salvar detalhes da OP.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
        const newStatus = getStatusFromProgress(editingOrderDetails.progresso);

        if (newStatus === "Concluído" && viewingOrder.status !== "Concluído") {
            setIsViewModalOpen(false);
            await handleOpenFinalPaymentModal(viewingOrder);
        } else {
            const docRef = doc(dbInstance, "ordensDeProducao", viewingOrder.id);
            await updateDoc(docRef, {
                progresso: editingOrderDetails.progresso,
                status: newStatus,
                observacoesProducao: editingOrderDetails.observacoesProducao,
                atualizadoEm: Timestamp.now(),
            });
            await updateOriginalOSStatusViaService(viewingOrder.agendamentoId, newStatus as OrdemServicoStatus);
            toast({ title: "Detalhes da Produção Salvos!", description: "As alterações foram salvas." });
            await fetchProductionOrders();
            setIsViewModalOpen(false);
        }
    } catch (error: any) {
        console.error("Erro ao salvar detalhes da produção:", error);
        toast({ title: "Erro ao Salvar Detalhes", variant: "destructive", description: `Detalhe: ${error.message || 'Erro desconhecido.'}`});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenPrintModal = async (osId: string) => {
    if (!osId) {
        toast({ title: "Erro", description: "ID da Ordem de Serviço não encontrado.", variant: "destructive" });
        return;
    }
    setIsLoadingPrintData(true);
    setIsPrintModalOpen(true);
    try {
        const osData = await getOrdemServicoById(osId);
        if (!osData) {
            throw new Error("Ordem de Serviço não encontrada.");
        }
        setOsForPrinting(osData);
    } catch (error: any) {
        toast({ title: "Erro ao buscar OS para impressão", description: error.message, variant: "destructive" });
        setIsPrintModalOpen(false);
    } finally {
        setIsLoadingPrintData(false);
    }
  };


  const filteredOrders = useMemo(() => {
    return productionOrders.filter(order => {
      const statusMatch = statusFilters[order.status];
      const searchTermLower = searchTerm.toLowerCase();
      const searchTermMatch =
        order.servicoNome.toLowerCase().includes(searchTermLower) ||
        order.clienteNome.toLowerCase().includes(searchTermLower) ||
        (order.observacoesAgendamento && order.observacoesAgendamento.toLowerCase().includes(searchTermLower)) ||
        (order.observacoesProducao && order.observacoesProducao.toLowerCase().includes(searchTermLower)) ||
        order.id.toLowerCase().includes(searchTermLower) ||
        (order.agendamentoId && order.agendamentoId.toLowerCase().includes(searchTermLower));
      return statusMatch && searchTermMatch;
    });
  }, [productionOrders, statusFilters, searchTerm]);

  if (isAuthenticating || !user) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (isLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando ordens de produção...</p></div>;
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-6 w-6 text-primary" />Controle de Produção</CardTitle>
              <CardDescription>Acompanhe e gerencie o progresso das ordens de serviço em produção.</CardDescription>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-grow md:flex-grow-0">
                    <ListFilter className="mr-2 h-4 w-4" /> Filtrar Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status Visíveis</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(statusFilters) as ProductionOrderStatus[]).map(status => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={statusFilters[status]}
                      onCheckedChange={(checked) => typeof checked === 'boolean' && handleStatusFilterChange(status, checked)}
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Buscar por cliente, serviço, OS ID, observação..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.length === 0 && !isLoading && <p className="text-muted-foreground text-center py-4">Nenhuma ordem de produção encontrada para os filtros aplicados.</p>}
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-primary cursor-pointer hover:underline" onClick={() => setSearchTerm(order.agendamentoId)}>OS: #{order.agendamentoId.substring(0,8)}...</span>
                            <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                        </CardTitle>
                        <CardDescription>
                            Cliente: {order.clienteNome} <br />
                            Serviço: {order.servicoNome} <br />
                            Data Prevista: {format(order.dataAgendamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </CardDescription>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 sm:mt-0 sm:text-right">
                        Progresso: {order.progresso ?? 0}% <br />
                        Produção ID: #{order.id.substring(0,8)}...
                    </div>
                  </div>
                  {(order.progresso ?? 0) > 0 && (order.progresso ?? 0) < 100 && (
                    <Progress value={order.progresso ?? 0} className="w-full h-2 mt-2" />
                  )}
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(order)} disabled={isSubmitting}>
                      <Eye className="mr-2 h-4 w-4" /> Gerenciar Detalhes
                  </Button>
                  {order.status === "Pendente" && (
                    <Button size="sm" variant="outline" onClick={() => handleQuickStatusUpdate(order, "Em Andamento", 5)} disabled={isSubmitting} className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700">
                      <Settings2 className="mr-2 h-4 w-4" /> Iniciar Produção
                    </Button>
                  )}
                  {order.status === "Em Andamento" && (
                    <Button size="sm" onClick={() => handleQuickStatusUpdate(order, "Concluído", 100)} disabled={isSubmitting} className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700" variant="outline">
                      <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Concluído
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isViewModalOpen} onOpenChange={(isOpen) => {
          setIsViewModalOpen(isOpen);
          if (!isOpen) { setViewingOrder(null); setEditingOrderDetails(null); }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerenciar Ordem de Produção</DialogTitle>
            {viewingOrder && <DialogPrimitiveDescription>OS: #{viewingOrder.agendamentoId.substring(0,8)}... para {viewingOrder.clienteNome}</DialogPrimitiveDescription>}
          </DialogHeader>
          {viewingOrder && editingOrderDetails && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <h4 className="font-semibold text-sm mb-1">Serviço/Produto Principal:</h4>
                <p className="text-sm text-muted-foreground">{viewingOrder.servicoNome}</p>
              </div>
              {viewingOrder.observacoesAgendamento && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Observações da OS:</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">{viewingOrder.observacoesAgendamento}</p>
                </div>
              )}
              <div>
                <Label htmlFor="progressoSlider" className="text-sm font-semibold">Progresso Atual: {editingOrderDetails.progresso}%</Label>
                <Slider
                  id="progressoSlider"
                  min={0} max={100} step={5}
                  value={[editingOrderDetails.progresso]}
                  onValueChange={(value) => setEditingOrderDetails(prev => ({...prev!, progresso: value[0]}))}
                  className="my-2"
                />
                <Badge variant={getStatusVariant(getStatusFromProgress(editingOrderDetails.progresso))}>
                  Status: {getStatusFromProgress(editingOrderDetails.progresso)}
                </Badge>
              </div>
              <div>
                <Label htmlFor="observacoesProducao" className="text-sm font-semibold">Observações da Produção (Interno)</Label>
                <Textarea
                  id="observacoesProducao"
                  placeholder="Detalhes sobre o andamento, problemas, próximos passos..."
                  value={editingOrderDetails.observacoesProducao}
                  onChange={(e) => setEditingOrderDetails(prev => ({...prev!, observacoesProducao: e.target.value}))}
                  rows={4}
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 sm:justify-between sm:items-center">
            <Button variant="outline" onClick={() => viewingOrder && handleOpenPrintModal(viewingOrder.agendamentoId)} disabled={isSubmitting || !viewingOrder}>
              <Printer className="mr-2 h-4 w-4" /> Ver / Imprimir OS
            </Button>
            <div className="flex gap-2 justify-end mt-2 sm:mt-0">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Fechar</Button></DialogClose>
                <Button onClick={handleSaveProductionDetails} disabled={isSubmitting || !editingOrderDetails}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Salvar Alterações
                </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-3xl print:max-w-full print:shadow-none print:border-0">
            <DialogHeader className="print:hidden">
                <DialogTitle>Visualizar Ordem de Serviço</DialogTitle>
                <DialogPrimitiveDescription>
                    Use esta tela para imprimir ou compartilhar a OS com o cliente.
                </DialogPrimitiveDescription>
            </DialogHeader>
            {isLoadingPrintData ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados da OS...</p></div>
            ) : osForPrinting ? (
            <div id="printable-os" className="space-y-6 p-2 print:p-0">
                 <div className="flex justify-between items-start pb-4 border-b">
                      <div>
                          <h2 className="text-2xl font-bold text-primary">{userProfile?.companyName || 'Sua Empresa Aqui'}</h2>
                          <p className="text-xs text-muted-foreground">{userProfile?.businessType || 'Ramo de Atividade'}</p>
                          <p className="text-xs text-muted-foreground">
                              {userProfile?.companyEmail || 'seuemail@empresa.com'}
                              {userProfile?.companyPhone && ` | ${userProfile.companyPhone}`}
                          </p>
                      </div>
                      <div className="text-right">
                          <h3 className="text-lg font-bold">ORDEM DE SERVIÇO</h3>
                          <p className="text-sm">Nº: <span className="font-mono">{osForPrinting.numeroOS.substring(0, 8)}...</span></p>
                          <p className="text-sm">Data: <span className="font-mono">{format(osForPrinting.createdAt || new Date(), "dd/MM/yyyy")}</span></p>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <h4 className="font-semibold text-muted-foreground">CLIENTE:</h4>
                          <p className="font-bold">{osForPrinting.clienteNome}</p>
                      </div>
                      <div className="text-right">
                          <h4 className="font-semibold text-muted-foreground">DATA DE ENTREGA PREVISTA:</h4>
                          <p className="font-bold">{format(osForPrinting.dataEntrega || new Date(), "dd/MM/yyyy")}</p>
                      </div>
                  </div>
                  
                  <div className="border rounded-lg">
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead className="w-[60%]">Descrição do Item/Serviço</TableHead>
                                  <TableHead className="text-center">Qtd.</TableHead>
                                  <TableHead className="text-right">Preço Unit.</TableHead>
                                  <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {osForPrinting.itens.map((item, index) => (
                                  <TableRow key={index}>
                                      <TableCell className="font-medium">{item.nome}</TableCell>
                                      <TableCell className="text-center">{item.quantidade}</TableCell>
                                      <TableCell className="text-right">R$ {item.valorUnitario.toFixed(2)}</TableCell>
                                      <TableCell className="text-right">R$ {(item.quantidade * item.valorUnitario).toFixed(2)}</TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
                  
                  <div className="flex justify-end">
                      <div className="w-full max-w-sm space-y-2">
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Subtotal</span>
                              <span className="font-medium">R$ {osForPrinting.valorTotal.toFixed(2)}</span>
                          </div>
                          {osForPrinting.valorAdiantado > 0 && (
                          <div className="flex justify-between">
                              <span className="text-muted-foreground">Adiantamento</span>
                              <span className="font-medium">- R$ {osForPrinting.valorAdiantado.toFixed(2)}</span>
                          </div>
                          )}
                          <Separator />
                          <div className="flex justify-between text-lg font-bold">
                              <span>Valor a Pagar</span>
                              <span>R$ {(osForPrinting.valorTotal - (osForPrinting.valorAdiantado || 0)).toFixed(2)}</span>
                          </div>
                      </div>
                  </div>
                  
                  {osForPrinting.observacoes && (
                  <div className="pt-4 border-t">
                      <h4 className="font-semibold text-muted-foreground">Observações:</h4>
                      <p className="text-sm whitespace-pre-wrap">{osForPrinting.observacoes}</p>
                  </div>
                  )}
            </div>
            ) : (
                <p>Ordem de Serviço não encontrada.</p>
            )}
            <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Fechar</Button>
                <Button onClick={() => window.print()} disabled={isLoadingPrintData || !osForPrinting}><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Pagamento Final */}
      <Dialog open={isFinalPaymentModalOpen} onOpenChange={(isOpen) => {
          if (!isOpen) {
              setIsFinalPaymentModalOpen(false);
              setOrderForFinalPayment(null);
              setOsForFinalPayment(null);
              finalPaymentForm.reset();
          }
      }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Registrar Pagamento Final da OS</DialogTitle>
                {osForFinalPayment && <DialogPrimitiveDescription>
                    OS: #{osForFinalPayment.numeroOS.substring(0,8)}... | Cliente: {osForFinalPayment.clienteNome} <br/>
                    Valor Total: R$ {osForFinalPayment.valorTotal.toFixed(2)} | Já Pago: R$ {(osForFinalPayment.valorPagoTotal || 0).toFixed(2)}
                </DialogPrimitiveDescription>}
            </DialogHeader>
            {osForFinalPayment && (
                <Form {...finalPaymentForm}>
                    <form onSubmit={finalPaymentForm.handleSubmit(handleFinalPaymentSubmit)} className="space-y-4 py-2">
                        <FormField control={finalPaymentForm.control} name="valorPago" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Valor a Registrar (R$)</FormLabel>
                                <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" min="0.01" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={finalPaymentForm.control} name="formaPagamento" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Forma de Pagamento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione a forma" /></SelectTrigger></FormControl>
                                    <SelectContent>{paymentMethods.map(method => (<SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>))}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={finalPaymentForm.control} name="dataPagamento" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Data do Pagamento</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                                                <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            required
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={finalPaymentForm.control} name="observacoesPagamento" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Observações (Opcional)</FormLabel>
                                <FormControl><Textarea placeholder="Detalhes do pagamento..." {...field} rows={2} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsFinalPaymentModalOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Pagamento e Concluir
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
