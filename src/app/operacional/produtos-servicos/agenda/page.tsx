
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIconLucide, ListFilter, Edit2, CheckCircle, Settings2, Eye, Loader2, Link as LinkIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as DialogPrimitiveDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod"; 
import { format, parse, setHours, setMinutes, setSeconds, setMilliseconds, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from "next/navigation";

import { getAllClientsByUserId } from '@/services/clientService';
import type { Client } from '@/schemas/clientSchema';
import { getAllProductServicesByUserId } from '@/services/productServiceService';
import type { ProductService } from '@/schemas/productServiceSchema';
import { 
  createAppointment, 
  getAllAppointmentsByUserId, 
  updateAppointment,
} from '@/services/appointmentService';
import { 
  AppointmentFormSchema, 
  type Appointment, 
  type AppointmentStatus, 
  type AppointmentFormValues,
  type AppointmentCreateData,
  type AppointmentUpdateData
} from '@/schemas/appointmentSchema';
import { createOrdemServico, PaymentStatusEnum, type OrdemServicoCreateData } from '@/services/ordemServicoService';
import { createOrdemProducao, type OrdemProducaoCreateData, type OrdemProducaoStatus } from '@/services/ordemProducaoSchema';
import { createLancamentoFinanceiro, type LancamentoFinanceiroCreateData } from '@/services/lancamentoFinanceiroService';


type ProductionOrderStatusAgenda = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

const paymentMethods = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "pix", label: "PIX" },
    { value: "cartao_credito", label: "Cartão de Crédito" },
    { value: "cartao_debito", label: "Cartão de Débito" },
    { value: "boleto", label: "Boleto" },
    { value: "transferencia_bancaria", label: "Transferência Bancária" },
    { value: "outro", label: "Outro" },
];


export default function AgendaPage() {
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fetchedClients, setFetchedClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  
  const [fetchedServices, setFetchedServices] = useState<ProductService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);

  const [datesWithAppointments, setDatesWithAppointments] = useState<Date[]>([]);


  const [statusFilters, setStatusFilters] = useState<Record<AppointmentStatus, boolean>>({
    "Pendente": true,
    "Em Andamento": true,
    "Concluído": true,
    "Cancelado": true,
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(AppointmentFormSchema),
    defaultValues: {
      clienteId: undefined,
      clienteNomeInput: "",
      servicoId: undefined,
      servicoNomeInput: "",
      data: new Date(),
      hora: "09:00",
      observacoes: "",
      status: "Pendente",
      geraOrdemProducao: false,
      valorServico: undefined,
      valorAdiantado: undefined,
      formaPagamentoAdiantamento: undefined,
    },
  });
  
  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/agenda');
    }
  }, [user, isAuthenticating, router]);

  const fetchInitialData = useCallback(async () => {
    if (!user?.uid) {
      setIsLoading(false);
      setIsLoadingClients(false);
      setIsLoadingServices(false);
      return;
    }
    
    setIsLoading(true);
    setIsLoadingClients(true);
    setIsLoadingServices(true);

    try {
      const [appointmentsData, clientsData, servicesData] = await Promise.all([
        getAllAppointmentsByUserId(user.uid, 'dataHora', 'asc'),
        getAllClientsByUserId(user.uid),
        getAllProductServicesByUserId(user.uid)
      ]);

      setAppointments(appointmentsData);
      if (appointmentsData.length > 0) {
        const uniqueDates = Array.from(
          new Set(appointmentsData.map(app => startOfDay(app.dataHora).toISOString()))
        ).map(dateStr => new Date(dateStr));
        setDatesWithAppointments(uniqueDates);
      } else {
        setDatesWithAppointments([]);
      }

      setFetchedClients(clientsData);
      setFetchedServices(servicesData);

    } catch (error: any) {
        console.error("[AgendaPage] Erro ao buscar dados iniciais:", error);
        toast({ 
            title: `Erro ao carregar dados da agenda`, 
            description: error.message || "Não foi possível carregar os dados necessários.", 
            variant: "destructive" 
        });
    } finally {
        setIsLoading(false);
        setIsLoadingClients(false);
        setIsLoadingServices(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!isAuthenticating && user) {
        fetchInitialData();
    }
  }, [fetchInitialData, user, isAuthenticating]);

  useEffect(() => {
    if (editingAppointment) {
      const data = new Date(editingAppointment.dataHora); 
      let clienteIdForm = editingAppointment.clienteId;
      let clienteNomeInputForm = "";
      if (editingAppointment.clienteId.startsWith("manual_cliente_")) {
        clienteIdForm = undefined; 
        clienteNomeInputForm = editingAppointment.clienteNome;
      }

      let servicoIdForm = editingAppointment.servicoId;
      let servicoNomeInputForm = "";
      if (editingAppointment.servicoId.startsWith("manual_servico_")) {
        servicoIdForm = undefined; 
        servicoNomeInputForm = editingAppointment.servicoNome;
      }

      form.reset({
        id: editingAppointment.id,
        clienteId: clienteIdForm,
        clienteNomeInput: clienteNomeInputForm,
        servicoId: servicoIdForm,
        servicoNomeInput: servicoNomeInputForm,
        data: data,
        hora: format(data, "HH:mm"),
        observacoes: editingAppointment.observacoes || "",
        status: editingAppointment.status,
        geraOrdemProducao: editingAppointment.geraOrdemProducao || false,
        valorServico: editingAppointment.valorServico ?? undefined,
        valorAdiantado: editingAppointment.valorAdiantado ?? undefined,
        formaPagamentoAdiantamento: editingAppointment.formaPagamentoAdiantamento ?? undefined,
      });
    } else {
      form.reset({
        id: undefined,
        clienteId: undefined,
        clienteNomeInput: "",
        servicoId: undefined,
        servicoNomeInput: "",
        data: selectedCalendarDate || new Date(),
        hora: "09:00",
        observacoes: "",
        status: "Pendente",
        geraOrdemProducao: false,
        valorServico: undefined,
        valorAdiantado: undefined,
        formaPagamentoAdiantamento: undefined,
      });
    }
  }, [editingAppointment, isAppointmentModalOpen, form, selectedCalendarDate]);


  const handleStatusFilterChange = (status: AppointmentStatus, checked: boolean) => {
    setStatusFilters(prev => ({ ...prev, [status]: checked }));
  };

  const getStatusColorClasses = (status: AppointmentStatus): string => {
    switch (status) {
      case "Pendente": return "border-blue-500 bg-blue-50 text-blue-700";
      case "Em Andamento": return "border-yellow-500 bg-yellow-50 text-yellow-700";
      case "Concluído": return "border-green-500 bg-green-50 text-green-700";
      case "Cancelado": return "border-red-500 bg-red-50 text-red-700";
      default: return "border-gray-500 bg-gray-50 text-gray-700";
    }
  };

  const getStatusDotColor = (status: AppointmentStatus): string => {
    switch (status) {
      case "Pendente": return "bg-blue-500";
      case "Em Andamento": return "bg-yellow-500";
      case "Concluído": return "bg-green-500";
      case "Cancelado": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const dateMatch = selectedCalendarDate ? format(appointment.dataHora, 'yyyy-MM-dd') === format(selectedCalendarDate, 'yyyy-MM-dd') : true;
      const statusMatch = statusFilters[appointment.status];
      return dateMatch && statusMatch;
    }).sort((a, b) => a.dataHora.getTime() - b.dataHora.getTime());
  }, [appointments, selectedCalendarDate, statusFilters]);

  const handleOpenModal = (appointmentToEdit: Appointment | null = null) => {
    setEditingAppointment(appointmentToEdit);
    setIsAppointmentModalOpen(true);
  };

  const handleOpenViewModal = (appointmentToView: Appointment) => {
    setViewingAppointment(appointmentToView);
    setIsViewModalOpen(true);
  };

  const handleSaveAppointment = async (values: AppointmentFormValues) => {
    if (!user) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userIdToSave = user.uid;

    let finalClienteId = "";
    let finalClienteNome = "";
    if (values.clienteId && values.clienteId.trim() !== "" && values.clienteId !== "__placeholder_cliente__") {
        const selectedClientObj = fetchedClients.find(c => c.id === values.clienteId);
        if (selectedClientObj) {
            finalClienteId = selectedClientObj.id;
            finalClienteNome = selectedClientObj.nome;
        } else {
            if (values.clienteNomeInput && values.clienteNomeInput.trim() !== "") {
                finalClienteId = `manual_cliente_${Date.now()}`;
                finalClienteNome = values.clienteNomeInput.trim();
            } else { 
                 toast({ title: "Erro de Cliente", description: "Cliente selecionado não encontrado e nenhum nome manual fornecido.", variant: "destructive"});
                 setIsSubmitting(false);
                 return;
            }
        }
    } else if (values.clienteNomeInput && values.clienteNomeInput.trim() !== "") {
        finalClienteId = `manual_cliente_${Date.now()}`;
        finalClienteNome = values.clienteNomeInput.trim();
    } else { 
        toast({ title: "Erro de Validação do Cliente", description: "É necessário selecionar um cliente ou informar o nome manualmente.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    let finalServicoId = "";
    let finalServicoNome = "";
    if (values.servicoId && values.servicoId.trim() !== "" && values.servicoId !== "__placeholder_servico__") {
        const selectedServiceObj = fetchedServices.find(s => s.id === values.servicoId);
         if (selectedServiceObj) {
            finalServicoId = selectedServiceObj.id;
            finalServicoNome = selectedServiceObj.nome;
        } else {
            if (values.servicoNomeInput && values.servicoNomeInput.trim() !== "") {
                finalServicoId = `manual_servico_${Date.now()}`;
                finalServicoNome = values.servicoNomeInput.trim();
            } else {
                 toast({ title: "Erro de Serviço", description: "Serviço selecionado inválido e nenhum nome manual fornecido.", variant: "destructive"});
                 setIsSubmitting(false);
                 return;
            }
        }
    } else if (values.servicoNomeInput && values.servicoNomeInput.trim() !== "") {
        finalServicoId = `manual_servico_${Date.now()}`;
        finalServicoNome = values.servicoNomeInput.trim();
    } else {
        toast({ title: "Erro de Validação do Serviço", description: "É necessário selecionar um serviço/produto ou informar o nome manualmente.", variant: "destructive"});
        setIsSubmitting(false);
        return;
    }

    const [hours, minutesValue] = values.hora.split(':').map(Number);
    const dataHoraCombined = setMilliseconds(setSeconds(setMinutes(setHours(values.data, hours), minutesValue),0),0);

    const appointmentCoreData = {
      clienteId: finalClienteId,
      clienteNome: finalClienteNome,
      servicoId: finalServicoId,
      servicoNome: finalServicoNome,
      dataHora: dataHoraCombined, 
      observacoes: values.observacoes || "",
      status: values.status,
      geraOrdemProducao: values.geraOrdemProducao,
      valorServico: values.valorServico,
      valorAdiantado: values.valorAdiantado,
      formaPagamentoAdiantamento: values.formaPagamentoAdiantamento,
    };

    try {
      let savedAppointment: Appointment;
      if (editingAppointment && values.id) {
        const updateData: AppointmentUpdateData = appointmentCoreData;
        savedAppointment = await updateAppointment(values.id, updateData);
        toast({ title: "Agendamento Atualizado!", description: `Agendamento para ${finalServicoNome} atualizado.` });
      } else {
        const createData: AppointmentCreateData = appointmentCoreData;
        savedAppointment = await createAppointment(userIdToSave, createData);
        toast({ title: "Agendamento Criado!", description: `Novo agendamento para ${finalServicoNome} criado.` });
      }

      if (values.geraOrdemProducao && !savedAppointment.ordemServicoId && savedAppointment.id && userIdToSave) {
        toast({ title: "Processando Ordem de Serviço...", description: "Aguarde um momento." });

        const valorTotalFinal = values.valorServico || 0;
        const adiantamento = values.valorAdiantado || 0;

        let statusPagamentoFinal: PaymentStatusEnum = PaymentStatusEnum.Enum.Pendente;
        if (adiantamento > 0) {
            statusPagamentoFinal = adiantamento >= valorTotalFinal ? PaymentStatusEnum.Enum['Pago Total'] : PaymentStatusEnum.Enum['Pago Parcial'];
        }

        const osDataToCreate: OrdemServicoCreateData = {
            clienteId: finalClienteId,
            clienteNome: finalClienteNome,
            itens: [{
                nome: finalServicoNome,
                quantidade: 1,
                valorUnitario: valorTotalFinal,
                tipo: 'Manual',
            }],
            valorTotal: valorTotalFinal,
            valorAdiantado: adiantamento,
            dataEntrega: dataHoraCombined,
            observacoes: `OS gerada a partir do agendamento #${savedAppointment.id.substring(0, 6)}... ${values.observacoes || ''}`.trim(),
            statusPagamento: statusPagamentoFinal,
            valorPagoTotal: adiantamento,
            dataPrimeiroPagamento: adiantamento > 0 ? new Date() : null,
            formaPrimeiroPagamento: adiantamento > 0 ? values.formaPagamentoAdiantamento : null,
        };

        const osDoc = await createOrdemServico(userIdToSave, osDataToCreate);
        toast({ title: "Ordem de Serviço Criada", description: `OS #${osDoc.numeroOS.substring(0,6)}... foi gerada.` });

        await updateAppointment(savedAppointment.id, { ordemServicoId: osDoc.id });

        const opDataToCreate: OrdemProducaoCreateData = {
            agendamentoId: osDoc.id,
            clienteId: osDoc.clienteId,
            clienteNome: osDoc.clienteNome,
            servicoNome: finalServicoNome,
            dataAgendamento: dataHoraCombined,
            status: "Pendente" as OrdemProducaoStatus,
            progresso: 0,
            observacoesAgendamento: values.observacoes || "",
        };
        await createOrdemProducao(userIdToSave, opDataToCreate);
        toast({ title: "Ordem de Produção Iniciada", description: "Uma O.P. foi criada e vinculada à nova O.S." });

        if (adiantamento > 0 && values.formaPagamentoAdiantamento) {
            const lancamentoAdiantamentoData: LancamentoFinanceiroCreateData = {
                titulo: `Adiantamento Agendamento/OS #${osDoc.numeroOS.substring(0,6)}`,
                valor: adiantamento,
                tipo: 'receita',
                data: new Date(),
                categoria: "Adiantamento Agendamento",
                status: 'recebido',
                referenciaOSId: osDoc.id,
                formaPagamento: values.formaPagamentoAdiantamento,
            };
            await createLancamentoFinanceiro(userIdToSave, lancamentoAdiantamentoData);
            toast({ title: "Adiantamento Registrado", description: `Lançamento financeiro de R$ ${adiantamento.toFixed(2)} criado.` });
        }
      }

      await fetchInitialData();
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
      form.reset();
    } catch (error: any) {
      console.error("Erro ao salvar agendamento:", error);
      toast({ title: "Erro ao Salvar", description: `Não foi possível salvar o agendamento. Detalhe: ${error.message || 'Erro desconhecido.'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsCompleted = async (appointment: Appointment) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const updateData: AppointmentUpdateData = { status: "Concluído" };
      await updateAppointment(appointment.id, updateData);
      toast({ title: "Status Atualizado", description: "Agendamento marcado como concluído." });
      await fetchInitialData();
    } catch (error: any) {
      console.error("Erro ao marcar como concluído:", error);
      toast({ title: "Erro ao Atualizar Status", variant: "destructive", description: `Detalhe: ${error.message || 'Erro desconhecido.'}` });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToProduction = (appointmentId: string) => {
    const app = appointments.find(a => a.id === appointmentId);
    if (app && app.geraOrdemProducao && app.ordemServicoId) {
      router.push(`/produtos-servicos/producao?agendamentoId=${app.ordemServicoId}`); 
    } else {
      toast({ title: "Ação Indisponível", description: `Este agendamento não gerou uma ordem de produção ou o link está quebrado.`, variant: "default" });
    }
  };

  if (isAuthenticating || !user) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados da agenda...</p></div>;
  }

  const { geraOrdemProducao, valorAdiantado } = form.watch();
  const opJaGerada = !!editingAppointment?.ordemServicoId;


  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
            <CardDescription>Selecione uma data para ver os agendamentos.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={setSelectedCalendarDate}
              className="rounded-md border"
              initialFocus
              locale={ptBR}
              modifiers={{ hasAppointment: datesWithAppointments }}
              modifiersClassNames={{
                hasAppointment: 'day-with-appointment',
              }}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle className="text-base">Filtros Adicionais</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="filtro-cliente-agenda">Cliente</Label>
              <Select disabled><SelectTrigger id="filtro-cliente-agenda"><SelectValue placeholder="Todos os Clientes" /></SelectTrigger></Select>
              <p className="text-xs text-muted-foreground mt-1">Filtro por cliente (Em desenvolvimento).</p>
            </div>
            <div>
              <Label htmlFor="filtro-servico-agenda">Serviço</Label>
              <Select disabled><SelectTrigger id="filtro-servico-agenda"><SelectValue placeholder="Todos os Serviços" /></SelectTrigger></Select>
              <p className="text-xs text-muted-foreground mt-1">Filtro por serviço (Em desenvolvimento).</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Agenda de Serviços</CardTitle>
                <CardDescription>
                  {selectedCalendarDate ? `Agendamentos para ${format(selectedCalendarDate, "dd/MM/yyyy", { locale: ptBR })}` : "Todos os agendamentos"}
                </CardDescription>
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
                    {(Object.keys(statusFilters) as AppointmentStatus[]).map(status => (
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
                <Button onClick={() => handleOpenModal()}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Novo Agendamento
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.length === 0 && !isLoading && <p className="text-muted-foreground text-center py-4">Nenhum agendamento para a data selecionada ou filtros aplicados.</p>}
              {filteredAppointments.map((appointment) => (
                <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 flex-grow">
                      <div className={`h-3 w-3 rounded-full ${getStatusDotColor(appointment.status)} shrink-0 mt-1 sm:mt-0`}></div>
                      <div className="flex-grow">
                        <p className="font-semibold">{appointment.servicoNome}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.clienteNome} - {format(appointment.dataHora, "HH:mm")}
                        </p>
                         {appointment.observacoes && <p className="text-xs text-muted-foreground italic mt-1 truncate max-w-xs sm:max-w-sm md:max-w-md" title={appointment.observacoes}>Obs: {appointment.observacoes}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end sm:items-center gap-2 mt-2 sm:mt-0 shrink-0 self-start sm:self-center">
                        <div className="flex items-center gap-2">
                          {appointment.ordemServicoId && <LinkIcon className="h-4 w-4 text-muted-foreground" title="O.S. Gerada" />}
                          <Badge variant="outline" className={`${getStatusColorClasses(appointment.status)} text-xs`}>{appointment.status}</Badge>
                        </div>
                        <div className="flex gap-1 mt-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenViewModal(appointment)} title="Visualizar" disabled={isSubmitting}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenModal(appointment)} title="Editar" disabled={isSubmitting}><Edit2 className="h-4 w-4" /></Button>
                            {appointment.status !== "Concluído" && appointment.status !== "Cancelado" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleMarkAsCompleted(appointment)} title="Marcar como Concluído" disabled={isSubmitting}><CheckCircle className="h-4 w-4" /></Button>
                            )}
                            {appointment.geraOrdemProducao && (
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80" onClick={() => handleGoToProduction(appointment.id)} title="Ir para Produção" disabled={isSubmitting}><Settings2 className="h-4 w-4" /></Button>
                            )}
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredAppointments.length === 0 && !isLoading && (
                <div className="text-center py-8">
                  <CalendarIconLucide className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhum agendamento para {selectedCalendarDate ? ` ${format(selectedCalendarDate, "dd/MM/yyyy", { locale: ptBR })}` : "esta data"} com os filtros selecionados.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAppointmentModalOpen} onOpenChange={(isOpen) => {
          setIsAppointmentModalOpen(isOpen);
          if (!isOpen) {
            setEditingAppointment(null);
            form.reset();
          }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
            <DialogPrimitiveDescription>
              {editingAppointment ? "Atualize os detalhes do agendamento." : "Preencha os dados para um novo agendamento."}
            </DialogPrimitiveDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveAppointment)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente (Seleção)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClients}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione o cliente"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingClients && <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>}
                         <SelectItem value="__placeholder_cliente__" disabled={!!field.value}>-- Selecione ou digite abaixo --</SelectItem>
                        {fetchedClients.map(client => <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>)}
                        {!isLoadingClients && fetchedClients.length === 0 && <SelectItem value="no-clients" disabled>Nenhum cliente cadastrado</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="clienteNomeInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ou Nome do Cliente (Manual)</FormLabel>
                    <FormControl><Input placeholder="Digite o nome se não estiver na lista" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="servicoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço/Produto (Seleção)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingServices}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingServices ? "Carregando..." : "Selecione o serviço/produto"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingServices && <SelectItem value="loading_services" disabled>Carregando serviços...</SelectItem>}
                        <SelectItem value="__placeholder_servico__" disabled={!!field.value}>-- Selecione ou digite abaixo --</SelectItem>
                        {fetchedServices.map(service => <SelectItem key={service.id} value={service.id}>{service.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="servicoNomeInput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ou Nome do Serviço/Produto (Manual)</FormLabel>
                    <FormControl><Input placeholder="Digite o nome se não estiver na lista" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}>
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
                            disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hora"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hora</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {(["Pendente", "Em Andamento", "Concluído", "Cancelado"] as AppointmentStatus[]).map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes adicionais..." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="geraOrdemProducao"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-muted/30">
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={opJaGerada} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">Gerar Ordem de Serviço/Produção?</FormLabel>
                      <FormDescription className="text-xs">{opJaGerada ? "Uma O.S. já foi gerada para este agendamento." : "Se marcado, uma O.S./O.P. será criada."}</FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {(geraOrdemProducao || opJaGerada) && (
                <div className="space-y-4 pt-4 border-t">
                  <p className="text-sm font-medium text-primary">Detalhes Financeiros da Ordem de Serviço</p>
                  <FormField
                    control={form.control}
                    name="valorServico"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Total do Serviço (R$)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" placeholder="150,00" step="0.01" min="0" {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                            disabled={opJaGerada}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="valorAdiantado"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Adiantado (R$) (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number" placeholder="50,00" step="0.01" min="0" {...field}
                            value={field.value ?? ''}
                            onChange={e => field.onChange(parseFloat(e.target.value) || undefined)}
                            disabled={opJaGerada}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {(valorAdiantado ?? 0) > 0 && (
                    <FormField
                      control={form.control}
                      name="formaPagamentoAdiantamento"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Forma de Pagamento (Adiantamento)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={opJaGerada}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                            <SelectContent>
                              {paymentMethods.map(method => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}

              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingAppointment ? "Salvar Alterações" : "Criar Agendamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Detalhes do Agendamento</DialogTitle>
                {viewingAppointment && <DialogPrimitiveDescription>Para {viewingAppointment.clienteNome} - {viewingAppointment.servicoNome}</DialogPrimitiveDescription>}
            </DialogHeader>
            {viewingAppointment && (
                <div className="space-y-3 py-2 text-sm">
                    <p><strong>Cliente:</strong> {viewingAppointment.clienteNome}</p>
                    <p><strong>Serviço/Produto:</strong> {viewingAppointment.servicoNome}</p>
                    <p><strong>Data e Hora:</strong> {format(viewingAppointment.dataHora, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <div><strong>Status:</strong> <Badge variant="outline" className={getStatusColorClasses(viewingAppointment.status)}>{viewingAppointment.status}</Badge></div>
                    {viewingAppointment.observacoes && <p><strong>Observações:</strong> {viewingAppointment.observacoes}</p>}
                    <p><strong>Gerar O.S./O.P. Automática:</strong> {viewingAppointment.geraOrdemProducao ? "Sim" : "Não"}</p>
                    {viewingAppointment.ordemServicoId && <p><strong>O.S. Vinculada:</strong> <span className="font-mono text-xs">{viewingAppointment.ordemServicoId.substring(0,10)}...</span></p>}
                    {viewingAppointment.valorServico && <p><strong>Valor do Serviço:</strong> R$ {viewingAppointment.valorServico.toFixed(2)}</p>}
                    {viewingAppointment.valorAdiantado && <p><strong>Valor Adiantado:</strong> R$ {viewingAppointment.valorAdiantado.toFixed(2)} ({viewingAppointment.formaPagamentoAdiantamento})</p>}
                </div>
            )}
            <DialogFooter>
                 <Button variant="outline" onClick={() => { if(viewingAppointment) {handleOpenModal(viewingAppointment); setIsViewModalOpen(false);}  }} disabled={isSubmitting}>Editar</Button>
                <DialogClose asChild><Button type="button">Fechar</Button></DialogClose>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
