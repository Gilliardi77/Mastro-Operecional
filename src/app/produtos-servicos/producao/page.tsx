
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ListFilter, Search, Loader2, Settings2, Eye, MessageSquare, Mail, ListOrdered } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
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
} from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ProductionOrderStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

interface ItemDaOSOriginal {
  produtoServicoId: string | null;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  // valorTotal: number; // Removido para simplificação
  tipo: 'Produto' | 'Serviço' | 'Manual';
}

interface OrdemServicoOriginalFirestore {
  itens: ItemDaOSOriginal[];
  status: ProductionOrderStatus;
  // Outros campos da OS original que podem ser úteis...
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
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingOrderDetails, setEditingOrderDetails] = useState<EditingOrderState | null>(null);

  const bypassAuth = true;

  const [statusFilters, setStatusFilters] = useState<Record<ProductionOrderStatus, boolean>>({
    "Pendente": true,
    "Em Andamento": true,
    "Concluído": true,
    "Cancelado": true,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchProductionOrders = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setProductionOrders([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const collectionRef = collection(db, "ordensDeProducao");
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
          dataAgendamento: data.dataAgendamento.toDate(),
          criadoEm: data.criadoEm.toDate(),
          atualizadoEm: data.atualizadoEm.toDate(),
        } as ProductionOrder;
      });
      setProductionOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Erro ao buscar ordens de produção:", error);
      toast({ title: "Erro ao buscar ordens", variant: "destructive", description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

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

  const updateOriginalOSStatus = async (osId: string, newStatus: ProductionOrderStatus) => {
    try {
      const osRef = doc(db, "ordensServico", osId);
      await updateDoc(osRef, { status: newStatus, atualizadoEm: Timestamp.now() });
      console.log(`Status da OS ${osId} atualizado para ${newStatus} no documento 'ordensServico'.`);
    } catch (error) {
      console.error(`Erro ao atualizar status da OS ${osId} em 'ordensServico':`, error);
      toast({
        title: `Erro ao Sincronizar Status da OS Original`,
        description: `Não foi possível atualizar o status da OS #${osId.substring(0,6)}... para ${newStatus}.`,
        variant: "destructive",
      });
    }
  };


  const handleQuickStatusUpdate = async (order: ProductionOrder, newStatus: ProductionOrderStatus, newProgress: number) => {
    if (!user && !bypassAuth) return;
    setIsSubmitting(true);
    try {
      const prodOrderRef = doc(db, "ordensDeProducao", order.id);
      await updateDoc(prodOrderRef, {
        status: newStatus,
        progresso: newProgress,
        atualizadoEm: Timestamp.now()
      });

      await updateOriginalOSStatus(order.agendamentoId, newStatus);

      if (newStatus === "Concluído") {
        const osOriginalRef = doc(db, "ordensServico", order.agendamentoId); 
        const osOriginalSnap = await getDoc(osOriginalRef);

        if (osOriginalSnap.exists()) {
          const osData = osOriginalSnap.data() as OrdemServicoOriginalFirestore;
          if (osData.itens && osData.itens.length > 0) {
            for (const itemOS of osData.itens) {
              if (itemOS.tipo === 'Produto' && itemOS.produtoServicoId) {
                const produtoCatalogoRef = doc(db, "produtosServicos", itemOS.produtoServicoId);
                try {
                  await runTransaction(db, async (transaction) => {
                    const produtoDoc = await transaction.get(produtoCatalogoRef);
                    if (!produtoDoc.exists()) {
                      console.warn(`Produto ${itemOS.nome} (ID: ${itemOS.produtoServicoId}) da OS ${order.agendamentoId} não encontrado no catálogo para baixa de estoque.`);
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
                  console.error(`Erro ao baixar estoque para ${itemOS.nome} (OS: ${order.agendamentoId}):`, stockError);
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
          console.warn(`Ordem de Serviço original (ID: ${order.agendamentoId}) não encontrada para baixa de estoque.`);
        }
      }

      toast({ title: "Status Atualizado!", description: `Ordem de produção #${order.id.substring(0,6)}... atualizada para ${newStatus}.` });
      await fetchProductionOrders();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro ao Atualizar Status", variant: "destructive", description: `Detalhe: ${error.message || 'Erro desconhecido.'}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleSaveProductionDetails = async () => {
    if (!viewingOrder || !editingOrderDetails || (!user && !bypassAuth)) return;
    setIsSubmitting(true);
    try {
        const docRef = doc(db, "ordensDeProducao", viewingOrder.id);
        const newStatus = getStatusFromProgress(editingOrderDetails.progresso);
        
        await updateDoc(docRef, {
            progresso: editingOrderDetails.progresso,
            status: newStatus,
            observacoesProducao: editingOrderDetails.observacoesProducao,
            atualizadoEm: Timestamp.now(),
        });

        await updateOriginalOSStatus(viewingOrder.agendamentoId, newStatus);
        
        if (newStatus === "Concluído" && viewingOrder.status !== "Concluído") {
            const osOriginalRef = doc(db, "ordensServico", viewingOrder.agendamentoId);
            const osOriginalSnap = await getDoc(osOriginalRef);

            if (osOriginalSnap.exists()) {
                const osData = osOriginalSnap.data() as OrdemServicoOriginalFirestore;
                if (osData.itens && osData.itens.length > 0) {
                    for (const itemOS of osData.itens) {
                        if (itemOS.tipo === 'Produto' && itemOS.produtoServicoId) {
                            const produtoCatalogoRef = doc(db, "produtosServicos", itemOS.produtoServicoId);
                             try {
                                await runTransaction(db, async (transaction) => {
                                    const produtoDoc = await transaction.get(produtoCatalogoRef);
                                    if (!produtoDoc.exists()) {
                                        console.warn(`Produto ${itemOS.nome} (ID: ${itemOS.produtoServicoId}) da OS ${viewingOrder.agendamentoId} não encontrado.`);
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
                                console.error(`Erro ao baixar estoque para ${itemOS.nome} (OS: ${viewingOrder.agendamentoId}):`, stockError);
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
                console.warn(`Ordem de Serviço original (ID: ${viewingOrder.agendamentoId}) não encontrada para baixa de estoque ao salvar detalhes.`);
            }
        }
        
        toast({ title: "Detalhes da Produção Salvos!", description: "As alterações foram salvas." });
        await fetchProductionOrders();
        setIsViewModalOpen(false);
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
    </div>
  );
}
