
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar as CalendarIconLucide, ListFilter, Edit2, CheckCircle, Settings2, Eye, Loader2 } from "lucide-react";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parse, setHours, setMinutes, setSeconds, setMilliseconds } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase"; // Assuming firebase.ts will be created
import { useAuth } from "@/hooks/use-auth"; // Assuming use-auth.ts will be created
import { useRouter } from "next/navigation";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  DocumentReference,
} from "firebase/firestore";

type AppointmentStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";
type ProductionOrderStatusAgenda = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

interface Cliente {
  id: string;
  nome: string;
}

interface Servico {
  id: string;
  nome: string;
}

interface AppointmentFirestore {
  id: string;
  clienteId: string;
  clienteNome: string;
  servicoId: string;
  servicoNome: string;
  dataHora: Timestamp;
  observacoes?: string;
  status: AppointmentStatus;
  geraOrdemProducao?: boolean;
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Appointment extends Omit<AppointmentFirestore, 'dataHora' | 'criadoEm' | 'atualizadoEm'> {
  dataHora: Date;
  criadoEm?: Date;
  atualizadoEm?: Date;
}

const appointmentSchema = z.object({
  clienteId: z.string().min(1, "Cliente é obrigatório."),
  servicoId: z.string().min(1, "Serviço é obrigatório."),
  data: z.date({ required_error: "Data é obrigatória." }),
  hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Hora inválida (HH:MM)."),
  observacoes: z.string().optional(),
  status: z.enum(["Pendente", "Em Andamento", "Concluído", "Cancelado"], { required_error: "Status inicial é obrigatório." }),
  geraOrdemProducao: z.boolean().optional().default(false),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

// Sample services, clients will be fetched from Firestore
const sampleServices: Servico[] = [
  { id: "s1", nome: "Corte de Cabelo" },
  { id: "s2", nome: "Manutenção de Motor" },
  { id: "s3", nome: "Pintura Residencial" },
];


export default function AgendaPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(new Date());
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchedClients, setFetchedClients] = useState<Cliente[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);

  const bypassAuthInStudioEnv = process.env.NEXT_PUBLIC_BYPASS_AUTH_IN_STUDIO;
  const bypassAuth = bypassAuthInStudioEnv === 'true';

  const [statusFilters, setStatusFilters] = useState<Record<AppointmentStatus, boolean>>({
    "Pendente": true,
    "Em Andamento": true,
    "Concluído": true,
    "Cancelado": true,
  });

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      clienteId: "",
      servicoId: "",
      data: new Date(),
      hora: "09:00",
      observacoes: "",
      status: "Pendente",
      geraOrdemProducao: false,
    },
  });

  const fetchClients = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setFetchedClients([]);
      setIsLoadingClients(false);
      return;
    }
    setIsLoadingClients(true);
    try {
      const q = query(collection(db, "clientes"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const querySnapshot = await getDocs(q);
      const clientsData = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        nome: docSnap.data().nome as string,
      }));
      setFetchedClients(clientsData);
    } catch (error) {
      console.error("Erro ao buscar clientes para agenda:", error);
      toast({ title: "Erro ao buscar clientes", variant: "destructive" });
    } finally {
      setIsLoadingClients(false);
    }
  }, [user, bypassAuth, toast]);


  const fetchAppointments = useCallback(async () => {
    if (!user && !bypassAuth) {
      setAppointments([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userIdToQuery = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
      if (!userIdToQuery) {
         setAppointments([]);
         setIsLoading(false);
         return;
      }
      const q = query(
        collection(db, "agendamentos"),
        where("userId", "==", userIdToQuery),
        orderBy("dataHora", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedAppointments = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<AppointmentFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          dataHora: data.dataHora.toDate(),
          criadoEm: data.criadoEm?.toDate(),
          atualizadoEm: data.atualizadoEm?.toDate(),
        } as Appointment;
      });
      setAppointments(fetchedAppointments);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast({ title: "Erro ao buscar agendamentos", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    if (user || bypassAuth) {
        fetchAppointments();
        fetchClients();
    }
  }, [fetchAppointments, fetchClients, user, bypassAuth]);

  useEffect(() => {
    if (editingAppointment) {
      const data = new Date(editingAppointment.dataHora);
      form.reset({
        clienteId: editingAppointment.clienteId,
        servicoId: editingAppointment.servicoId,
        data: data,
        hora: format(data, "HH:mm"),
        observacoes: editingAppointment.observacoes || "",
        status: editingAppointment.status,
        geraOrdemProducao: editingAppointment.geraOrdemProducao || false,
      });
    } else {
      form.reset({
        clienteId: "",
        servicoId: "",
        data: selectedCalendarDate || new Date(),
        hora: "09:00",
        observacoes: "",
        status: "Pendente",
        geraOrdemProducao: false,
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
    if (!user && !bypassAuth) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
     if (!userIdToSave) {
        toast({ title: "Erro: ID do usuário não encontrado", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const [hours, minutesValue] = values.hora.split(':').map(Number);
    const dataHoraCombined = setMilliseconds(setSeconds(setMinutes(setHours(values.data, hours), minutesValue),0),0);

    const selectedClient = fetchedClients.find(c => c.id === values.clienteId);
    const selectedService = sampleServices.find(s => s.id === values.servicoId);

    if (!selectedClient || !selectedService) {
      toast({ title: "Erro", description: "Cliente ou serviço inválido.", variant: "destructive"});
      setIsSubmitting(false);
      return;
    }

    const appointmentData: Omit<AppointmentFirestore, 'id' | 'criadoEm'> = {
      clienteId: values.clienteId,
      clienteNome: selectedClient.nome,
      servicoId: values.servicoId,
      servicoNome: selectedService.nome,
      dataHora: Timestamp.fromDate(dataHoraCombined),
      observacoes: values.observacoes || "",
      status: values.status,
      geraOrdemProducao: values.geraOrdemProducao,
      userId: userIdToSave,
      atualizadoEm: Timestamp.now(),
    };

    try {
      let agendamentoId = editingAppointment?.id;
      if (editingAppointment) {
        const docRef = doc(db, "agendamentos", editingAppointment.id);
        await updateDoc(docRef, appointmentData);
        toast({ title: "Agendamento Atualizado!", description: `Agendamento para ${selectedService.nome} atualizado.` });
      } else {
        const docRefGenerated = await addDoc(collection(db, "agendamentos"), {
          ...appointmentData,
          criadoEm: Timestamp.now(),
        });
        agendamentoId = docRefGenerated.id;
        toast({ title: "Agendamento Criado!", description: `Novo agendamento para ${selectedService.nome} criado.` });
      }

      if (values.geraOrdemProducao && agendamentoId && userIdToSave) {
        const productionOrderData = {
          agendamentoId: agendamentoId,
          clienteId: values.clienteId,
          clienteNome: selectedClient.nome,
          servicoId: values.servicoId,
          servicoNome: selectedService.nome,
          dataAgendamento: Timestamp.fromDate(dataHoraCombined),
          status: "Pendente" as ProductionOrderStatusAgenda,
          progresso: 0,
          observacoesAgendamento: values.observacoes || "",
          userId: userIdToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        };
        await addDoc(collection(db, "ordensDeProducao"), productionOrderData);
        toast({ title: "Ordem de Produção Iniciada!", description: `Uma ordem de produção para ${selectedService.nome} foi criada.` });
      }

      await fetchAppointments();
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
      form.reset();
    } catch (error) {
      console.error("Erro ao salvar agendamento:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o agendamento.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsCompleted = async (id: string) => {
    if (!user && !bypassAuth) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, "agendamentos", id);
      await updateDoc(docRef, { status: "Concluído", atualizadoEm: Timestamp.now() });
      toast({ title: "Status Atualizado", description: "Agendamento marcado como concluído." });
      await fetchAppointments();
    } catch (error) {
      console.error("Erro ao marcar como concluído:", error);
      toast({ title: "Erro ao Atualizar Status", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToProduction = (appointmentId: string) => {
    const app = appointments.find(a => a.id === appointmentId);
    if (app && app.geraOrdemProducao) {
      router.push(`/producao?agendamentoId=${appointmentId}`); // Placeholder, route to be defined
    } else {
      toast({ title: "Ação Indisponível", description: `Este agendamento não gerou uma ordem de produção.`, variant: "default" });
    }
  };

  if (!bypassAuth && !user && (isLoading || isLoadingClients)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }
  if ((user || bypassAuth ) && (isLoading || isLoadingClients)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados da agenda...</p></div>;
  }
   if (!bypassAuth && !user && !isLoading && !isLoadingClients) {
     return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para acessar a agenda.</p>
          <Button onClick={() => auth.signOut().then(() => window.location.href = '/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }

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
              {filteredAppointments.length === 0 && !(isLoading || isLoadingClients) && <p className="text-muted-foreground text-center py-4">Nenhum agendamento para a data selecionada ou filtros aplicados.</p>}
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
                        <Badge variant="outline" className={`${getStatusColorClasses(appointment.status)} text-xs`}>{appointment.status}</Badge>
                        <div className="flex gap-1 mt-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenViewModal(appointment)} title="Visualizar" disabled={isSubmitting}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenModal(appointment)} title="Editar" disabled={isSubmitting}><Edit2 className="h-4 w-4" /></Button>
                            {appointment.status !== "Concluído" && appointment.status !== "Cancelado" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleMarkAsCompleted(appointment.id)} title="Marcar como Concluído" disabled={isSubmitting}><CheckCircle className="h-4 w-4" /></Button>
                            )}
                            {appointment.geraOrdemProducao && (
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary/80" onClick={() => handleGoToProduction(appointment.id)} title="Ir para Produção" disabled={isSubmitting}><Settings2 className="h-4 w-4" /></Button>
                            )}
                        </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredAppointments.length === 0 && !(isLoading || isLoadingClients) && (
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
            form.reset({
                clienteId: "", servicoId: "", data: selectedCalendarDate || new Date(), hora: "09:00",
                observacoes: "", status: "Pendente", geraOrdemProducao: false,
            });
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
                    <FormLabel>Cliente</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClients}>
                      <FormControl><SelectTrigger><SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione o cliente"} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {isLoadingClients && <SelectItem value="loading" disabled>Carregando clientes...</SelectItem>}
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
                name="servicoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço/Produto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o serviço/produto" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {sampleServices.map(service => <SelectItem key={service.id} value={service.id}>{service.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} />
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
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm">Gerar Ordem de Produção automaticamente?</FormLabel>
                      <p className="text-xs text-muted-foreground">Se marcado, uma O.S. será criada ou sugerida.</p>
                    </div>
                  </FormItem>
                )}
              />
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
                    <p><strong>Gerar O.S. Automática:</strong> {viewingAppointment.geraOrdemProducao ? "Sim" : "Não"}</p>
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
