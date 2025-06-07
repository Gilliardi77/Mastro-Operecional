
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ListFilter, Search, Loader2, Settings2, Eye, MessageSquare, Mail } from "lucide-react";
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
  runTransaction, // Adicionado para transações
  DocumentSnapshot, // Adicionado para tipo
  getDoc, // Adicionado para buscar a OS original
} from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ProductionOrderStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

// Interface para os itens dentro da Ordem de Serviço original
interface ItemDaOSOriginal {
  produtoServicoId: string | null;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  tipo: 'Produto' | 'Serviço' | 'Manual';
}

// Interface para o documento da Ordem de Serviço original
interface OrdemServicoOriginalFirestore {
  itens: ItemDaOSOriginal[];
  // Outros campos da OS original que podem ser úteis...
}


interface ProductionOrderFirestore {
  id: string;
  agendamentoId: string; // Este é o ID da Ordem de Serviço original
  clienteId?: string;
  clienteNome: string;
  servicoId?: string; // Pode ser removido ou adaptado se servicoNome for suficiente
  servicoNome: string; // Descrição geral da OS (ex: primeiro item + "e outros")
  dataAgendamento: Timestamp;
  status: ProductionOrderStatus;
  progresso?: number; // 0-100
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
  return "Pendente"; // Fallback
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
    // ... (lógica de fetch mantida, apenas certifique-se que agendamentoId é o ID da OS)
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
      toast({ title: "Erro ao buscar ordens", variant: "destructive" });
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
    const agendamentoIdFromParams = searchParams.get('agendamentoId'); // Este é o ID da OS
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

      // Se o novo status for "Concluído", tentar baixar estoque
      if (newStatus === "Concluído") {
        const osOriginalRef = doc(db, "ordensServico", order.agendamentoId); // agendamentoId é o ID da OS
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
                      return; // Pula este item se não encontrado
                    }
                    const produtoData = produtoDoc.data() as any; // Idealmente, tipo mais forte aqui
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

      toast({ title: "Status Atualizado!", description: `Ordem de produção atualizada para ${newStatus}.` });
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
        
        // Salvar detalhes da produção
        await updateDoc(docRef, {
            progresso: editingOrderDetails.progresso,
            status: newStatus,
            observacoesProducao: editingOrderDetails.observacoesProducao,
            atualizadoEm: Timestamp.now(),
        });

        // Se o novo status for "Concluído" E o status anterior não era "Concluído", tentar baixar estoque
        if (newStatus === "Concluído" && viewingOrder.status !== "Concluído") {
            const osOriginalRef = doc(db, "ordensServico", viewingOrder.agendamentoId);
            const osOriginalSnap = await getDoc(osOriginalRef);

            if (osOriginalSnap.exists()) {
                const osData = osOriginalSnap.data() as OrdemServicoOriginalFirestore;
                if (osData.itens && osData.itens.length > 0) {
                    for (const itemOS of osData.itens) {
                        if (itemOS.tipo === 'Produto' && itemOS.produtoServicoId) {
                            const produtoCatalogoRef = doc(db, "produtosServicos", itemOS.produtoServicoId);
                            // ... (lógica de transação para baixar estoque, igual a handleQuickStatusUpdate)
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

  const handleSendWhatsAppStatus = () => { /* ... mantido ... */ };
  const handleSendEmailStatus = () => { /* ... mantido ... */ };

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

  if (isAuthLoading) { /* ... */ }
  if (!bypassAuth && !user) { /* ... */ }
  if (isLoading && (user || bypassAuth)) { /* ... */ }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          {/* ... Header mantido ... */}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.length === 0 && !isLoading && <p className="text-muted-foreground text-center py-4">Nenhuma ordem de produção encontrada.</p>}
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  {/* ... Card Header de cada ordem mantido ... */}
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

      <Dialog open={isViewModalOpen} onOpenChange={(isOpen) => { /* ... mantido ... */ }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            {/* ... Dialog Header mantido ... */}
          </DialogHeader>
          {viewingOrder && editingOrderDetails && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              {/* ... Conteúdo do Dialog mantido ... */}
            </div>
          )}
          <DialogFooter className="mt-4">
             {/* ... Botões do Dialog Footer mantidos ... */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

