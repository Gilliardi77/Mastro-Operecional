
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListOrdered, Search, Loader2, Settings2, Eye, CreditCard, CalendarIcon as CalendarIconLucide } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Timestamp, collection, addDoc } from "firebase/firestore"; 
import { getFirebaseInstances } from '@/lib/firebase';

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from '@/lib/utils';

import { 
  getAllOrdensServicoByUserId, 
  updateOrdemServico,
} from '@/services/ordemServicoService';
import { 
  type OrdemServico, 
  type OrdemServicoStatus, 
  type PaymentStatus,
  PagamentoOsSchema, 
  type PagamentoOsFormValues 
} from '@/schemas/ordemServicoSchema';


const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "boleto", label: "Boleto Bancário" },
];

interface OrdemServicoListData extends OrdemServico {
  servicoDescricao: string; 
}


const getStatusVariant = (status: OrdemServicoStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Concluído": return "default";
    case "Em Andamento": return "secondary";
    case "Pendente": return "outline";
    case "Cancelado": return "destructive";
    default: return "outline";
  }
};

const getPaymentStatusVariant = (status?: PaymentStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Pago Total": return "default"; 
    case "Pago Parcial": return "secondary"; 
    case "Pendente": return "outline"; 
    default: return "outline";
  }
};

export default function OrdensServicoPage() {
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [ordensServico, setOrdensServico] = useState<OrdemServicoListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<OrdemServicoListData | null>(null);

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/ordens');
    }
  }, [user, isAuthenticating, router]);

  const paymentForm = useForm<PagamentoOsFormValues>({
    resolver: zodResolver(PagamentoOsSchema),
    defaultValues: {
      valorPago: 0,
      dataPagamento: new Date(),
      observacoesPagamento: "",
    },
  });

  const fetchOrdensServico = useCallback(async () => {
    if (!user?.uid) {
      setOrdensServico([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const fetchedOrdens = await getAllOrdensServicoByUserId(user.uid, 'createdAt', 'desc');
      
      const ordensParaLista = fetchedOrdens.map(order => {
        let servicoDescricao = "Serviço/Produto não especificado";
        if (order.itens && order.itens.length > 0) {
          servicoDescricao = order.itens[0].nome;
          if (order.itens.length > 1) {
            servicoDescricao += ` e mais ${order.itens.length - 1} item(ns)`;
          }
        } else if (order.observacoes) {
          servicoDescricao = order.observacoes.substring(0, 50) + (order.observacoes.length > 50 ? "..." : "");
        }
        return {
          ...order,
          servicoDescricao,
        };
      });
      setOrdensServico(ordensParaLista);
    } catch (error: any) {
      console.error("Erro ao buscar Ordens de Serviço:", error);
      toast({ title: "Erro ao buscar OS", description: `Não foi possível carregar os dados. ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchOrdensServico();
    }
  }, [fetchOrdensServico, user]);

  const filteredOrdens = useMemo(() => {
    return ordensServico.filter(order => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        order.clienteNome.toLowerCase().includes(searchTermLower) ||
        order.numeroOS.toLowerCase().includes(searchTermLower) ||
        order.servicoDescricao.toLowerCase().includes(searchTermLower)
      );
    });
  }, [ordensServico, searchTerm]);

  const handleOpenPaymentModal = (order: OrdemServicoListData) => {
    setSelectedOrderForPayment(order);
    const valorPendente = order.valorTotal - (order.valorPagoTotal || 0);
    paymentForm.reset({
      valorPago: valorPendente > 0 ? parseFloat(valorPendente.toFixed(2)) : 0, 
      formaPagamento: paymentMethods[0].value,
      dataPagamento: new Date(),
      observacoesPagamento: order.observacoesPagamento || "",
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePagamento = async (data: PagamentoOsFormValues) => {
    if (!selectedOrderForPayment || !user?.uid) {
      toast({ title: "Erro", description: "Nenhuma OS selecionada ou usuário não autenticado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    
    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para salvar pagamento.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    const valorTotalDaOS = selectedOrderForPayment.valorTotal;
    const valorJaPagoAnteriormente = selectedOrderForPayment.valorPagoTotal || 0;
    const valorAcumuladoPago = valorJaPagoAnteriormente + data.valorPago;

    let novoStatusPagamento: PaymentStatus = "Pendente";
    if (valorAcumuladoPago >= valorTotalDaOS) {
      novoStatusPagamento = "Pago Total";
    } else if (valorAcumuladoPago > 0) {
      novoStatusPagamento = "Pago Parcial";
    }

    try {
      await updateOrdemServico(selectedOrderForPayment.id, {
        valorPagoTotal: valorAcumuladoPago,
        statusPagamento: novoStatusPagamento,
        dataUltimoPagamento: data.dataPagamento, 
        formaUltimoPagamento: data.formaPagamento,
        observacoesPagamento: data.observacoesPagamento || "",
      });

      await addDoc(collection(dbInstance, "lancamentosFinanceiros"), {
        titulo: `Pagamento OS #${selectedOrderForPayment.numeroOS.substring(0,6)} - ${selectedOrderForPayment.clienteNome}`,
        valor: data.valorPago,
        tipo: 'receita',
        data: Timestamp.fromDate(data.dataPagamento),
        categoria: "Receita de OS",
        status: "recebido", 
        referenciaOSId: selectedOrderForPayment.id,
        userId: user.uid,
        createdAt: Timestamp.now(), 
        updatedAt: Timestamp.now(), 
      });

      toast({ title: "Pagamento Registrado!", description: "O pagamento foi registrado e um lançamento financeiro foi criado." });
      setIsPaymentModalOpen(false);
      fetchOrdensServico();
    } catch (error: any) {
      console.error("Erro ao salvar pagamento:", error);
      toast({ title: "Erro ao Salvar Pagamento", description: `Não foi possível salvar o pagamento. Detalhe: ${error.message || 'Erro desconhecido.'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticating || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><ListOrdered className="h-6 w-6 text-primary" />Ordens de Serviço</CardTitle>
              <CardDescription>Visualize, acompanhe e registre pagamentos das ordens de serviço.</CardDescription>
            </div>
            <Button onClick={() => router.push('/produtos-servicos/atendimentos/novo')}>
              Nova Ordem de Serviço
            </Button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Buscar por OS, cliente, descrição..."
                className="pl-10 w-full md:w-1/2 lg:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS #</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="hidden md:table-cell">Criação</TableHead>
                  <TableHead className="hidden md:table-cell">Entrega</TableHead>
                  <TableHead className="text-center">Status OS</TableHead>
                  <TableHead className="text-center">Status Pag.</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdens.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      {ordensServico.length === 0 ? "Nenhuma Ordem de Serviço cadastrada." : "Nenhuma OS encontrada para a busca."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredOrdens.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.numeroOS.substring(0,8)}...</TableCell>
                    <TableCell>{order.clienteNome}</TableCell>
                    <TableCell>{order.servicoDescricao}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(order.createdAt, "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(order.dataEntrega, "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getPaymentStatusVariant(order.statusPagamento)}>
                        {order.statusPagamento || "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">R$ {order.valorTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="icon" className="h-8 w-8 mr-1" onClick={() => handleOpenPaymentModal(order)}
                        disabled={order.status === "Cancelado" || order.statusPagamento === "Pago Total" || isSubmitting}
                        title="Registrar Pagamento">
                        <CreditCard className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 mr-1" onClick={() => router.push(`/produtos-servicos/producao?agendamentoId=${order.id}`)} title="Ir para Produção" disabled={isSubmitting}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({title: "Em Breve", description: "Visualização de detalhes da OS."})} title="Ver Detalhes (Em Breve)" disabled={isSubmitting}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isPaymentModalOpen} onOpenChange={(isOpen) => {
        setIsPaymentModalOpen(isOpen);
        if (!isOpen) setSelectedOrderForPayment(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento da OS</DialogTitle>
            {selectedOrderForPayment && (
              <DialogPrimitiveDescription>
                OS: #{selectedOrderForPayment.numeroOS.substring(0,8)}... | Cliente: {selectedOrderForPayment.clienteNome} <br />
                Valor Total OS: R$ {selectedOrderForPayment.valorTotal.toFixed(2)} | Já Pago: R$ {(selectedOrderForPayment.valorPagoTotal || 0).toFixed(2)}
              </DialogPrimitiveDescription>
            )}
          </DialogHeader>
          {selectedOrderForPayment && (
            <Form {...paymentForm}>
              <form onSubmit={paymentForm.handleSubmit(handleSavePagamento)} className="space-y-4 py-2">
                <FormField
                  control={paymentForm.control}
                  name="valorPago"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor a Registrar (R$)</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" min="0.01" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="formaPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecione a forma" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {paymentMethods.map(method => (
                            <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="dataPagamento"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data do Pagamento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                              <CalendarIconLucide className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={paymentForm.control}
                  name="observacoesPagamento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações (Opcional)</FormLabel>
                      <FormControl><Textarea placeholder="Detalhes adicionais sobre o pagamento..." {...field} rows={2} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Registrar Pagamento
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
