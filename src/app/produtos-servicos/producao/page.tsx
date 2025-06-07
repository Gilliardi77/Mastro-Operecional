
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
import { useSearchParams, useRouter } from 'next/navigation'; // Adicionado useRouter
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type ProductionOrderStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

interface ProductionOrderFirestore {
  id: string;
  agendamentoId: string;
  clienteId?: string;
  clienteNome: string;
  servicoId?: string;
  servicoNome: string;
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
  const router = useRouter(); // Instanciado useRouter
  const searchParams = useSearchParams();
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<ProductionOrder | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  const [editingOrderDetails, setEditingOrderDetails] = useState<EditingOrderState | null>(null);


  const bypassAuth = true; // Forçar bypass para testes

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
      const q = query(
        collection(db, "ordensDeProducao"),
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
    } catch (error) {
      console.error("Erro ao buscar ordens de produção:", error);
      toast({ title: "Erro ao buscar ordens", description: "Não foi possível carregar os dados.", variant: "destructive" });
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

  const handleQuickStatusUpdate = async (orderId: string, newStatus: ProductionOrderStatus, newProgress: number) => {
    if (!user && !bypassAuth) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, "ordensDeProducao", orderId);
      await updateDoc(docRef, { 
        status: newStatus, 
        progresso: newProgress,
        atualizadoEm: Timestamp.now() 
      });
      toast({ title: "Status Atualizado!", description: `Ordem de produção atualizada para ${newStatus}.` });
      await fetchProductionOrders(); 
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({ title: "Erro ao Atualizar Status", variant: "destructive" });
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
        toast({ title: "Detalhes da Produção Salvos!", description: "As alterações foram salvas." });
        await fetchProductionOrders();
        setIsViewModalOpen(false);
    } catch (error) {
        console.error("Erro ao salvar detalhes da produção:", error);
        toast({ title: "Erro ao Salvar Detalhes", variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleSendWhatsAppStatus = () => {
    if (!viewingOrder || !editingOrderDetails) return;
    const currentStatus = getStatusFromProgress(editingOrderDetails.progresso);
    const message = `
Olá ${viewingOrder.clienteNome},
Atualização sobre sua ordem de produção:
Serviço/Produto: ${viewingOrder.servicoNome}
Status Atual: ${currentStatus} (Progresso: ${editingOrderDetails.progresso}%)
${editingOrderDetails.observacoesProducao ? `Observações: ${editingOrderDetails.observacoesProducao}` : ""}
Data Prevista: ${format(viewingOrder.dataAgendamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

Atenciosamente,
Meu Negócio App
    `.trim().replace(/^\s+/gm, "");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    toast({ title: "Mensagem Pronta para WhatsApp", description: "Confirme o contato e envie."});
  };

  const handleSendEmailStatus = () => {
    if (!viewingOrder || !editingOrderDetails) return;
    const currentStatus = getStatusFromProgress(editingOrderDetails.progresso);
    const subject = `Atualização da Ordem de Produção: ${viewingOrder.servicoNome}`;
    const body = `
Olá ${viewingOrder.clienteNome},

Aqui está uma atualização sobre o status da sua ordem de produção:

Serviço/Produto: ${viewingOrder.servicoNome}
Status Atual: ${currentStatus} (Progresso: ${editingOrderDetails.progresso}%)
${editingOrderDetails.observacoesProducao ? `Observações da Produção: ${editingOrderDetails.observacoesProducao}` : ""}
${viewingOrder.observacoesAgendamento ? `Observações do Agendamento/OS: ${viewingOrder.observacoesAgendamento}` : ""}
Data Prevista para Entrega/Conclusão: ${format(viewingOrder.dataAgendamento, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}

ID da Produção (para referência): ${viewingOrder.id}

Atenciosamente,
Equipe Meu Negócio App
    `.trim().replace(/^\s+/gm, "");

    console.log("Simulando envio de e-mail:", { to: "cliente@example.com", subject, body });
    toast({ title: "E-mail (Simulado) Pronto", description: "O conteúdo do e-mail foi gerado (ver console)." });
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
        (order.agendamentoId && order.agendamentoId.toLowerCase().includes(searchTermLower)) ||
        (order.servicoId && order.servicoId.toLowerCase().includes(searchTermLower));
      return statusMatch && searchTermMatch;
    });
  }, [productionOrders, statusFilters, searchTerm]);

  if (isAuthLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }
  
  if (!bypassAuth && !user) {
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
              <CardTitle>Controle de Produção</CardTitle>
              <CardDescription>Acompanhe o status e progresso dos serviços e produtos em fabricação ou execução.</CardDescription>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <ListFilter className="mr-2 h-4 w-4" /> Filtrar Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(Object.keys(statusFilters) as Array<ProductionOrderStatus>).map(status => (
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
          <div className="mt-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por serviço, cliente, ID..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.length === 0 && !isLoading && <p className="text-muted-foreground text-center py-4">Nenhuma ordem de produção encontrada com os filtros atuais.</p>}
            {filteredOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <CardTitle className="text-lg">{order.servicoNome}</CardTitle>
                      <CardDescription>
                        Cliente: {order.clienteNome} - Previsto/Agendado para: {format(order.dataAgendamento, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </CardDescription>
                       {order.observacoesAgendamento && <p className="text-xs text-muted-foreground mt-1 italic">Obs. Agend.: {order.observacoesAgendamento}</p>}
                       {order.observacoesProducao && <p className="text-xs text-muted-foreground mt-1 italic">Obs. Prod.: {order.observacoesProducao}</p>}
                       <p className="text-xs text-muted-foreground mt-1">Progresso: {order.progresso ?? 0}%</p>
                       <p className="text-xs text-muted-foreground mt-1">ID Produção: {order.id.substring(0,6)}... (Ref.: {order.agendamentoId ? order.agendamentoId.substring(0,6)+'...' : 'N/A'})</p>
                    </div>
                     <Badge variant={getStatusVariant(order.status)} className="mt-2 sm:mt-0 self-start sm:self-center">{order.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(order)}
                      disabled={isSubmitting}
                    >
                      <Eye className="mr-2 h-4 w-4" /> Gerenciar Detalhes
                    </Button>
                  {order.status === "Pendente" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickStatusUpdate(order.id, "Em Andamento", 5)}
                      disabled={isSubmitting}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Settings2 className="mr-2 h-4 w-4" /> Iniciar Produção
                    </Button>
                  )}
                  {order.status === "Em Andamento" && (
                    <Button
                      size="sm"
                      onClick={() => handleQuickStatusUpdate(order.id, "Concluído", 100)}
                      disabled={isSubmitting}
                      className="text-green-600 border-green-600 hover:bg-green-50 hover:text-green-700"
                      variant="outline"
                    >
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
        if (!isOpen) {
            setViewingOrder(null);
            setEditingOrderDetails(null);
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes e Gerenciamento da Produção</DialogTitle>
            {viewingOrder && (
                <DialogPrimitiveDescription>
                  Serviço: {viewingOrder.servicoNome} para {viewingOrder.clienteNome}
                </DialogPrimitiveDescription>
            )}
          </DialogHeader>
          {viewingOrder && editingOrderDetails && (
            <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <p className="text-sm"><strong>ID da Produção:</strong> {viewingOrder.id}</p>
              <p className="text-sm"><strong>ID de Referência (OS/Agenda):</strong> {viewingOrder.agendamentoId}</p>
              <p className="text-sm"><strong>Serviço/Produto:</strong> {viewingOrder.servicoNome}</p>
              <p className="text-sm"><strong>Cliente:</strong> {viewingOrder.clienteNome}</p>
              <p className="text-sm"><strong>Data Prevista/Agendada:</strong> {format(viewingOrder.dataAgendamento, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}</p>
              
              <div className="space-y-2">
                <Label htmlFor="progresso-producao">Progresso da Produção ({editingOrderDetails.progresso}%)</Label>
                <Slider
                  id="progresso-producao"
                  min={0}
                  max={100}
                  step={5}
                  value={[editingOrderDetails.progresso]}
                  onValueChange={(value) => setEditingOrderDetails(prev => prev ? {...prev, progresso: value[0]} : null)}
                  className="my-2"
                />
                 <div className="text-sm"><strong>Status Atual:</strong> <Badge variant={getStatusVariant(getStatusFromProgress(editingOrderDetails.progresso))}>{getStatusFromProgress(editingOrderDetails.progresso)}</Badge></div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes-producao">Observações da Produção</Label>
                <Textarea
                  id="observacoes-producao"
                  placeholder="Adicione notas sobre o andamento, materiais, etc..."
                  value={editingOrderDetails.observacoesProducao}
                  onChange={(e) => setEditingOrderDetails(prev => prev ? {...prev, observacoesProducao: e.target.value} : null)}
                  rows={3}
                />
              </div>
               {viewingOrder.observacoesAgendamento && (
                <p className="text-sm"><strong>Observações do Agendamento/OS:</strong> {viewingOrder.observacoesAgendamento}</p>
              )}
              <p className="text-sm"><strong>Criado em:</strong> {format(viewingOrder.criadoEm, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleSendWhatsAppStatus} disabled={isSubmitting || !viewingOrder}>
                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
             <Button type="button" variant="outline" onClick={handleSendEmailStatus} disabled={isSubmitting || !viewingOrder}>
                <Mail className="mr-2 h-4 w-4" /> E-mail
            </Button>
            <DialogClose asChild><Button type="button" variant="ghost" disabled={isSubmitting}>Cancelar</Button></DialogClose>
            <Button type="button" onClick={handleSaveProductionDetails} disabled={isSubmitting || !viewingOrder}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    