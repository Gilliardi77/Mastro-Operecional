
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ListFilter, Search, Loader2, Settings2, Eye, MessageSquare, Mail, CreditCard, CalendarIcon as CalendarIconLucide } from "lucide-react"; 
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
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseInstances } from '@/lib/firebase';
import { useAuth } from '@/components/auth/auth-provider';
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

import { 
  type OrdemServico as OrdemServicoOriginal, 
  OrdemServicoStatusEnum, // Importado aqui
  updateOrdemServico,
  getOrdemServicoById,
  PagamentoOsSchema,
  type PagamentoOsFormValues,
  PaymentStatusEnum
} from '@/services/ordemServicoService'; 
import type { ItemOS } from '@/schemas/ordemServicoSchema'; 
import { createLancamentoFinanceiro } from '@/services/lancamentoFinanceiroService';


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
  { value: "transferencia", label: "Transferência Bancária" },
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
  const { user, isLoading: isAuthLoading } = useAuth();
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

  const bypassAuth = true;

  const [statusFilters, setStatusFilters] = useState<Record<ProductionOrderStatus, boolean>>({
    "Pendente": true,
    "Em Andamento": true,
    "Concluído": true,
    "Cancelado": true,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const finalPaymentForm = useForm<PagamentoOsFormValues>({
    resolver: zodResolver(PagamentoOsSchema),
    defaultValues: {
      valorPago: 0,
      formaPagamento: paymentMethods[0].value,
      dataPagamento: new Date(),
      observacoesPagamento: "",
    },
  });

  const safeToDate = (timestampField: any, fieldName: string, defaultDateVal: Date): Date => {
      if (timestampField && typeof timestampField.toDate === 'function') {
        return timestampField.toDate();
      }
      console.warn(`[ProducaoPage] Campo de timestamp '${fieldName}' ausente ou inválido na OP ID ${viewingOrder?.id || 'desconhecido'}. Usando data padrão: ${defaultDateVal.toISOString()}`);
      return defaultDateVal;
  };

  const fetchProductionOrders = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
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
        where("userId", "==", userIdToQuery),
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
  }, [user, toast, bypassAuth, viewingOrder?.id]); // Adicionado viewingOrder?.id para contexto no safeToDate

  useEffect(() => {
    if (user || bypassAuth) {
        fetchProductionOrders();
    }
  }, [fetchProductionOrders, user, bypassAuth]);

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

  const updateOriginalOSStatusViaService = async (osId: string, newStatus: OrdemServicoStatusEnum) => {
    try {
      await updateOrdemServico(osId, { status: newStatus }); 
      console.log(`Status da OS ${osId} atualizado para ${newStatus} via serviço.`);
    } catch (error: any) {
      const errorMessage = (error as Error).message || 'Erro desconhecido';
      if (errorMessage.includes("Missing or insufficient permissions")) {
        console.warn(`[Permissão Negada] Falha ao atualizar status da OS Original ${osId} para ${newStatus}. Usuário atual: ${user?.uid}. Verifique a propriedade 'userId' na OS ou se a OS existe.`, error);
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
    toast({ title: "Produção Concluída!", description: `Ordem de produção e OS #${productionOrder.id.substring(0,6)}... concluídas.` });
    await fetchProductionOrders();
};


const handleOpenFinalPaymentModal = async (order: ProductionOrder) => {
    if (!user && !bypassAuth) return;
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
    if (!orderForFinalPayment || !osForFinalPayment || (!user && !bypassAuth)) return;
    setIsSubmitting(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
    if (!userIdToSave) {
        toast({ title: "Erro de Autenticação", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

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
        await updateOriginalOSStatusViaService(order.agendamentoId, newStatus as OrdemServicoStatusEnum);
        toast({ title: "Status Atualizado!", description: `Ordem de produção #${order.id.substring(0,6)}... atualizada para ${newStatus}.` });
        await fetchProductionOrders();
    }
};

const handleQuickStatusUpdate = async (order: ProductionOrder, newStatus: ProductionOrderStatus, newProgress: number) => {
    if (!user && !bypassAuth) return;
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
            await updateOriginalOSStatusViaService(order.agendamentoId, newStatus as OrdemServicoStatusEnum);
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
    if (!viewingOrder || !editingOrderDetails || (!user && !bypassAuth)) return;
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
            await updateOriginalOSStatusViaService(viewingOrder.agendamentoId, newStatus as OrdemServicoStatusEnum);
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

  const handleSendWhatsAppStatus = () => { 
    if (!viewingOrder) return;
    toast({ title: "WhatsApp", description: `Simulando envio de status da OS #${viewingOrder.id.substring(0,6)} para ${viewingOrder.clienteNome}. (Funcionalidade em desenvolvimento)` });
  };
  const handleSendEmailStatus = () => { 
    if (!viewingOrder) return;
    toast({ title: "E-mail", description: `Simulando envio de e-mail de status da OS #${viewingOrder.id.substring(0,6)} para ${viewingOrder.clienteNome}. (Funcionalidade em desenvolvimento)` });
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

  if (isAuthLoading && !bypassAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }

  if (!user && !bypassAuth) {
     return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para acessar o controle de produção.</p>
          <Button onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading && (user || bypassAuth)) {
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
               <div>
                <h4 className="font-semibold text-sm mb-2">Comunicação com Cliente (Opcional):</h4>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleSendWhatsAppStatus} disabled={isSubmitting}><MessageSquare className="mr-1.5 h-4 w-4"/> Enviar Status (WhatsApp)</Button>
                    <Button variant="outline" size="sm" onClick={handleSendEmailStatus} disabled={isSubmitting}><Mail className="mr-1.5 h-4 w-4"/> Enviar Status (E-mail)</Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Fechar</Button></DialogClose>
            <Button onClick={handleSaveProductionDetails} disabled={isSubmitting || !editingOrderDetails}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
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
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} /></PopoverContent>
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
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirmar Pagamento e Concluir
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
