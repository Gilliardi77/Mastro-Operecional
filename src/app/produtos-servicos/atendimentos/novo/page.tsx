
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileText, MessageSquare, Mail, Loader2, UserPlus } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation"; // Adicionado useRouter
import React, { useState, useEffect, useCallback } from "react";
import { collection, addDoc, Timestamp, query, where, getDocs, orderBy, serverTimestamp, doc, updateDoc } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from '@/components/auth/auth-provider';

type ProductionOrderStatusOSPage = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

const ordemServicoFormSchema = z.object({
  clienteId: z.string().optional(),
  clienteNome: z.string().optional(),
  descricao: z.string().min(10, { message: "A descrição deve ter pelo menos 10 caracteres." }),
  valorTotal: z.coerce.number().positive({ message: "O valor total deve ser positivo." }),
  valorAdiantado: z.coerce.number().nonnegative({ message: "O valor adiantado não pode ser negativo." }).optional().default(0),
  dataEntrega: z.date({ required_error: "A data de entrega é obrigatória." }),
  observacoes: z.string().optional(),
});

type OrdemServicoFormValues = z.infer<typeof ordemServicoFormSchema>;

const newClientSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Formato de e-mail inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
});
type NewClientFormValues = z.infer<typeof newClientSchema>;

interface Cliente {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
}

interface LastSavedOsDataType extends OrdemServicoFormValues {
  numeroOS?: string;
  clienteNomeFinal?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
}

const formatPhoneNumberForWhatsApp = (phone: string | undefined): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
     // digits = digits.substring(2); // Potentially remove this if numbers are stored without country code sometimes
  }
  if (!digits.startsWith('55') && (digits.length === 10 || digits.length === 11)) {
    return `55${digits}`;
  }
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }
  return digits.length >= 10 ? digits : null;
};

export default function OrdemServicoPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter(); // Instanciado useRouter
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastSavedOsData, setLastSavedOsData] = useState<LastSavedOsDataType | null>(null);
  const searchParams = useSearchParams();

  const [clients, setClients] = useState<Cliente[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);

  const bypassAuthInStudioEnv = process.env.NEXT_PUBLIC_BYPASS_AUTH_IN_STUDIO;
  const bypassAuth = bypassAuthInStudioEnv === 'true';

  const osForm = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: {
      clienteId: "avulso",
      clienteNome: "Cliente Avulso",
      descricao: "",
      valorTotal: 0,
      valorAdiantado: 0,
      observacoes: "",
      dataEntrega: undefined,
    },
  });

  const newClientForm = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: { nome: "", email: "", telefone: "", endereco: "" },
  });

  const fetchClients = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setClients([]);
      setIsLoadingClients(false);
      return;
    }
    setIsLoadingClients(true);
    try {
      const q = query(collection(db, "clientes"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedClients = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nome: data.nome as string,
          telefone: data.telefone as string | undefined,
          email: data.email as string | undefined
        };
      });
      setClients(fetchedClients);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: "Erro ao buscar clientes", variant: "destructive", description: "Não foi possível carregar a lista de clientes." });
    } finally {
      setIsLoadingClients(false);
    }
  }, [user, bypassAuth, toast]);

  useEffect(() => {
    if (user || bypassAuth) {
        fetchClients();
    }
  }, [fetchClients, user, bypassAuth]);

  useEffect(() => {
    const clienteIdParam = searchParams.get('clienteId');
    const descricaoParam = searchParams.get('descricao');
    const valorTotalParam = searchParams.get('valorTotal');
    const clienteNomeParam = searchParams.get('clienteNome');

    let prefillData: Partial<OrdemServicoFormValues> = {};

    if (clienteIdParam) {
      prefillData.clienteId = clienteIdParam;
      const clientExists = clients.some(c => c.id === clienteIdParam);
      if (clientExists && clienteNomeParam) {
        prefillData.clienteNome = clienteNomeParam;
      } else if (clienteIdParam === "avulso") {
        prefillData.clienteNome = clienteNomeParam || "Cliente Avulso";
      } else if (clienteIdParam !== "avulso" && !clientExists) {
         prefillData.clienteNome = clienteNomeParam || "Cliente Avulso"; // Default if param name is also missing
      }
    } else {
        prefillData.clienteId = "avulso";
        prefillData.clienteNome = clienteNomeParam || "Cliente Avulso";
    }


    if (descricaoParam) prefillData.descricao = descricaoParam;
    if (valorTotalParam) {
      const valor = parseFloat(valorTotalParam);
      if (!isNaN(valor)) prefillData.valorTotal = valor;
    }

    if (Object.keys(prefillData).length > 0) {
      osForm.reset(currentValues => ({
        ...currentValues,
        ...prefillData,
        dataEntrega: currentValues.dataEntrega || undefined
      }));
    }
    setLastSavedOsData(null);
  }, [searchParams, osForm, clients]);

  useEffect(() => {
    const clienteId = osForm.getValues('clienteId');
    if (clienteId && clienteId !== 'avulso' && clients.length > 0) {
      const client = clients.find(c => c.id === clienteId);
      if (client && osForm.getValues('clienteNome') !== client.nome) {
        osForm.setValue('clienteNome', client.nome);
      }
    } else if (clienteId === 'avulso') {
        const nomeParam = searchParams.get('clienteNome');
        const nomeForm = osForm.getValues('clienteNome');
        if (nomeParam && nomeParam !== nomeForm) {
             osForm.setValue('clienteNome', nomeParam);
        } else if (!nomeForm && !nomeParam) { // if both are empty, set default
             osForm.setValue('clienteNome', "Cliente Avulso");
        }
    }
  }, [osForm, clients, searchParams, osForm.watch('clienteId')]);


  async function onOsSubmit(data: OrdemServicoFormValues) {
    setIsSaving(true);
    setLastSavedOsData(null);

    let userIdToSave = user ? user.uid : null;
    if (bypassAuth && !user) userIdToSave = "bypass_user_placeholder";

    if (!userIdToSave) {
      toast({ title: "Erro de Autenticação", description: "Login necessário para salvar.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const now = Timestamp.now();
    const selectedClient = data.clienteId && data.clienteId !== "avulso" ? clients.find(c => c.id === data.clienteId) : null;
    const nomeClienteFinal = selectedClient ? selectedClient.nome : (data.clienteNome || "Cliente Avulso");
    const telefoneClienteFinal = selectedClient?.telefone;
    const emailClienteFinal = selectedClient?.email;


    const osDataToSave = {
      clienteId: data.clienteId && data.clienteId !== "avulso" ? data.clienteId : null,
      clienteNome: nomeClienteFinal,
      descricao: data.descricao,
      valorTotal: data.valorTotal,
      valorAdiantado: data.valorAdiantado || 0,
      dataEntrega: Timestamp.fromDate(data.dataEntrega),
      observacoes: data.observacoes || "",
      status: "Pendente" as ProductionOrderStatusOSPage,
      criadoPor: userIdToSave,
      criadoEm: now,
      atualizadoEm: now,
      numeroOS: ""
    };

    let osDocRefId: string | null = null;

    try {
      const docRef = await addDoc(collection(db, "ordensServico"), osDataToSave);
      osDocRefId = docRef.id;

      await updateDoc(doc(db, "ordensServico", osDocRefId), {
        numeroOS: osDocRefId
      });

      const valorAdiantado = data.valorAdiantado || 0;
      if (valorAdiantado > 0) {
        const adiantamentoData = {
          userId: userIdToSave,
          titulo: `Adiantamento OS #${osDocRefId.substring(0,6)} - ${nomeClienteFinal}`,
          valor: valorAdiantado,
          tipo: 'receita' as 'receita' | 'despesa',
          data: Timestamp.now(),
          categoria: "Adiantamento de Cliente",
          status: 'recebido' as 'pago' | 'recebido' | 'pendente',
          descricao: `Valor recebido como adiantamento para a OS #${osDocRefId.substring(0,6)}.`,
          ordemServicoId: osDocRefId,
          criadoEm: now,
          atualizadoEm: now,
        };
        await addDoc(collection(db, "lancamentosFinanceiros"), adiantamentoData);
        toast({ title: "Adiantamento Registrado!", description: `R$ ${valorAdiantado.toFixed(2)} lançado como receita recebida.`});
      }

      const valorAReceber = data.valorTotal - valorAdiantado;
      if (valorAReceber > 0) {
        const saldoData = {
          userId: userIdToSave,
          titulo: `Saldo OS #${osDocRefId.substring(0,6)} - ${nomeClienteFinal}`,
          valor: valorAReceber,
          tipo: 'receita' as 'receita' | 'despesa',
          data: Timestamp.fromDate(data.dataEntrega),
          categoria: "Venda de Serviço (Saldo)",
          status: 'pendente' as 'pago' | 'recebido' | 'pendente',
          descricao: `Valor pendente referente ao saldo da OS #${osDocRefId.substring(0,6)}.`,
          ordemServicoId: osDocRefId,
          criadoEm: now,
          atualizadoEm: now,
        };
        await addDoc(collection(db, "lancamentosFinanceiros"), saldoData);
         toast({ title: "Saldo Pendente Registrado!", description: `R$ ${valorAReceber.toFixed(2)} lançado como conta a receber.`});
      }

      toast({
        title: "Ordem de Serviço Salva!",
        description: `OS #${osDocRefId.substring(0,6)}... (${nomeClienteFinal}) salva com sucesso.`,
      });

      try {
        const productionOrderData = {
          agendamentoId: osDocRefId, 
          clienteId: osDataToSave.clienteId,
          clienteNome: osDataToSave.clienteNome,
          servicoNome: osDataToSave.descricao, 
          servicoId: null, 
          dataAgendamento: osDataToSave.dataEntrega, 
          status: "Pendente" as ProductionOrderStatusOSPage, 
          progresso: 0,
          observacoesAgendamento: osDataToSave.observacoes, 
          userId: userIdToSave,
          criadoEm: Timestamp.now(),
          atualizadoEm: Timestamp.now(),
        };
        await addDoc(collection(db, "ordensDeProducao"), productionOrderData);
        toast({
          title: "Entrada de Produção Criada!",
          description: `OS #${osDocRefId ? osDocRefId.substring(0,6) : 'N/A'} enviada para controle de produção.`,
        });
      } catch (prodError: any) {
         console.error("Erro ao criar entrada de produção: ", prodError);
         toast({
          title: "Erro ao Criar Entrada de Produção",
          description: `A OS #${osDocRefId ? osDocRefId.substring(0,6) : 'N/A'} foi salva, mas houve um erro ao criar a entrada de produção. Detalhe: ${prodError.message || 'Erro desconhecido.'}`,
          variant: "destructive",
        });
      }

      setLastSavedOsData({
        ...data,
        numeroOS: osDocRefId,
        clienteNomeFinal: nomeClienteFinal,
        clienteTelefone: telefoneClienteFinal,
        clienteEmail: emailClienteFinal,
      });
      osForm.reset({ clienteId: "avulso", clienteNome: "Cliente Avulso", descricao: "", valorTotal: 0, valorAdiantado: 0, observacoes: "", dataEntrega: undefined });

    } catch (e: any) {
      console.error("Erro ao salvar OS ou lançamentos financeiros: ", e);
      toast({
        title: "Erro ao Salvar Ordem de Serviço",
        description: `Não foi possível salvar a OS ou seus lançamentos financeiros. Detalhe: ${e.message || 'Erro desconhecido.'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function onSaveNewClient(data: NewClientFormValues) {
    setIsSavingNewClient(true);
    const userIdToSave = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToSave) {
      toast({ title: "Erro de Autenticação", description: "Login necessário.", variant: "destructive" });
      setIsSavingNewClient(false);
      return;
    }
    try {
      const clientData = {
        nome: data.nome,
        email: data.email || "",
        telefone: data.telefone || "",
        endereco: data.endereco || "",
        userId: userIdToSave,
        temDebitos: false,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, "clientes"), clientData);
      toast({ title: "Cliente Adicionado!", description: `${data.nome} foi adicionado.` });

      const newClient: Cliente = { id: docRef.id, nome: data.nome, telefone: data.telefone, email: data.email };
      setClients(prev => [...prev, newClient].sort((a, b) => a.nome.localeCompare(b.nome)));
      osForm.setValue('clienteId', docRef.id);
      osForm.setValue('clienteNome', data.nome);

      setIsNewClientModalOpen(false);
      newClientForm.reset();
    } catch (error) {
      console.error("Erro ao salvar novo cliente:", error);
      toast({ title: "Erro ao Salvar Cliente", variant: "destructive", description: "Não foi possível adicionar o novo cliente." });
    } finally {
      setIsSavingNewClient(false);
    }
  }

  const handleEnviarWhatsApp = () => {
    const valuesToUse = lastSavedOsData || osForm.getValues();
    const osFormState = osForm.formState;

    if (!valuesToUse.descricao || !valuesToUse.valorTotal || !valuesToUse.dataEntrega || (!osFormState.isValid && !lastSavedOsData)) {
      toast({ title: "Dados Incompletos", description: "Salve uma OS ou preencha dados válidos para enviar.", variant: "destructive" });
      return;
    }

    let nomeClienteParaMsg = lastSavedOsData?.clienteNomeFinal || valuesToUse.clienteNome || "Cliente não especificado";
    let telefoneClienteParaMsg = lastSavedOsData?.clienteTelefone;

    if (!telefoneClienteParaMsg && valuesToUse.clienteId && valuesToUse.clienteId !== "avulso") {
      const client = clients.find(c => c.id === valuesToUse.clienteId);
      if (client) {
        nomeClienteParaMsg = client.nome;
        telefoneClienteParaMsg = client.telefone;
      }
    } else if (valuesToUse.clienteId === "avulso" && valuesToUse.clienteNome) {
        nomeClienteParaMsg = valuesToUse.clienteNome;
    }

    const dataEntregaFormatada = format(new Date(valuesToUse.dataEntrega), "dd/MM/yyyy", { locale: ptBR });
    const message = `
*Detalhes da Ordem de Serviço${lastSavedOsData?.numeroOS ? ` #${lastSavedOsData.numeroOS.substring(0,6)}...` : ''}*

*Cliente:* ${nomeClienteParaMsg}
*Descrição:* ${valuesToUse.descricao}
*Valor Total:* R$ ${valuesToUse.valorTotal.toFixed(2)}
*Valor Adiantado:* R$ ${(valuesToUse.valorAdiantado || 0).toFixed(2)}
*Data de Entrega Prevista:* ${dataEntregaFormatada}
${valuesToUse.observacoes ? `*Observações:* ${valuesToUse.observacoes}` : ""}

---
Enviado por: Meu Negócio App
    `.trim().replace(/^\s+/gm, "");

    const formattedPhone = formatPhoneNumberForWhatsApp(telefoneClienteParaMsg);
    const whatsappUrl = formattedPhone ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleEnviarEmail = async () => {
    const valuesToUse = lastSavedOsData || osForm.getValues();
    const osFormState = osForm.formState;

    if (!valuesToUse.descricao || !valuesToUse.valorTotal || !valuesToUse.dataEntrega || (!osFormState.isValid && !lastSavedOsData)) {
      toast({ title: "Dados Incompletos", description: "Salve uma OS ou preencha dados válidos para enviar.", variant: "destructive" });
      return;
    }

    let nomeClienteParaEmail = lastSavedOsData?.clienteNomeFinal || valuesToUse.clienteNome || "Cliente não especificado";
    let emailClienteParaEmail = lastSavedOsData?.clienteEmail;

    if (!emailClienteParaEmail && valuesToUse.clienteId && valuesToUse.clienteId !== "avulso") {
        const client = clients.find(c => c.id === valuesToUse.clienteId);
        if (client) {
            nomeClienteParaEmail = client.nome;
            emailClienteParaEmail = client.email;
        }
    } else if (valuesToUse.clienteId === "avulso" && valuesToUse.clienteNome) {
        nomeClienteParaEmail = valuesToUse.clienteNome;
    }

    const recipientEmail = emailClienteParaEmail || "cliente@example.com";
    if (recipientEmail === "cliente@example.com" && !emailClienteParaEmail) {
        toast({ title: "E-mail do Cliente Não Encontrado", description: "O cliente selecionado não possui e-mail cadastrado ou é um cliente avulso sem e-mail. O e-mail será direcionado para um endereço de exemplo.", variant: "default"});
    }

    const emailSubject = `Detalhes da OS${lastSavedOsData?.numeroOS ? ` #${lastSavedOsData.numeroOS.substring(0,6)}...` : ''}: ${valuesToUse.descricao.substring(0, 30)}...`;
    const emailHtmlBody = `
<html>
  <body style="font-family: sans-serif; line-height: 1.6;">
    <h2>Detalhes da Ordem de Serviço${lastSavedOsData?.numeroOS ? ` #${lastSavedOsData.numeroOS.substring(0,6)}...` : ''}</h2>
    <p><strong>Cliente:</strong> ${nomeClienteParaEmail}</p>
    <p><strong>Descrição:</strong> ${valuesToUse.descricao}</p>
    <p><strong>Valor Total:</strong> R$ ${valuesToUse.valorTotal.toFixed(2)}</p>
    <p><strong>Valor Adiantado:</strong> R$ ${(valuesToUse.valorAdiantado || 0).toFixed(2)}</p>
    <p><strong>Data de Entrega Prevista:</strong> ${format(new Date(valuesToUse.dataEntrega), "dd/MM/yyyy", { locale: ptBR })}</p>
    ${valuesToUse.observacoes ? `<p><strong>Observações:</strong> ${valuesToUse.observacoes}</p>` : ""}
    <hr/>
    <p>Atenciosamente,<br/>Equipe Meu Negócio App</p>
  </body>
</html>
    `.trim();

    setIsSendingEmail(true);
    try {
      const functionUrl = "https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/sendOrderEmail"; 
      if (functionUrl.includes("YOUR_REGION-YOUR_PROJECT_ID")) {
        console.warn("URL da função de e-mail é placeholder. O e-mail não será enviado de verdade.");
        toast({ title: "Envio de E-mail (Simulado)", description: "A URL da função de envio de e-mail não está configurada. Verifique os logs do console para o conteúdo do e-mail.", variant: "default" });
        console.log("Simulando envio de e-mail:", { to: recipientEmail, subject: emailSubject, htmlBody: emailHtmlBody });
        setIsSendingEmail(false);
        return;
      }
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipientEmail, subject: emailSubject, htmlBody: emailHtmlBody, orderDetails: { /* ... */ } }),
      });

      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({error: "Falha ao decodificar erro da função."}));
        throw new Error(errorResult.error || `Falha na chamada da função: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        toast({ title: "E-mail Enviado!", description: "A Ordem de Serviço foi enviada por e-mail." });
      } else {
        throw new Error(result.error || "Falha ao enviar e-mail via função.");
      }
    } catch (error: any) {
      console.error("Erro ao chamar função de e-mail:", error);
      toast({ title: "Erro ao Enviar E-mail", description: `${error.message || 'Ocorreu um problema ao tentar enviar o e-mail.'}`, variant: "destructive" });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const canSendActions = (!!lastSavedOsData && !!lastSavedOsData.dataEntrega) || (osForm.formState.isValid && (osForm.formState.isDirty || Object.keys(osForm.formState.touchedFields).length > 0) && !!osForm.getValues('dataEntrega'));

  if (isAuthLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }

  if (!bypassAuth && !user) { 
    return (
      <Card><CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent><p>Você precisa estar logado para criar Ordens de Serviço.</p><Button onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button></CardContent>
      </Card>
    );
  }
  
  if (isLoadingClients && (user || bypassAuth)) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados...</p></div>;
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2"><FileText className="h-6 w-6 text-primary" />
            <div><CardTitle>Nova Ordem de Serviço</CardTitle><DialogPrimitiveDescription>Preencha os dados para criar uma nova OS. O ID da OS é gerado automaticamente ao salvar.</DialogPrimitiveDescription></div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...osForm}>
            <form onSubmit={osForm.handleSubmit(onOsSubmit)} className="space-y-6">
              <FormField
                control={osForm.control}
                name="clienteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <div className="flex gap-2 items-center">
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const selectedClientObj = clients.find(c => c.id === value);
                          osForm.setValue('clienteNome', selectedClientObj ? selectedClientObj.nome : (value === "avulso" ? (osForm.getValues('clienteNome') || "Cliente Avulso") : ""));
                        }}
                        value={field.value || "avulso"}
                      >
                        <FormControl>
                          <SelectTrigger disabled={isLoadingClients || isSaving} className="flex-grow">
                            <SelectValue placeholder={isLoadingClients ? "Carregando clientes..." : "Selecione o cliente"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="avulso">Cliente Avulso / Não Especificado</SelectItem>
                          {clients.map(client => (<SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>))}
                          {!isLoadingClients && clients.length === 0 && <SelectItem value="" disabled>Nenhum cliente cadastrado</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" onClick={() => setIsNewClientModalOpen(true)} className="shrink-0" disabled={isSaving}><UserPlus className="mr-2 h-4 w-4" /> Novo Cliente</Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
               {osForm.watch('clienteId') === 'avulso' && (
                <FormField
                  control={osForm.control}
                  name="clienteNome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do Cliente Avulso (Opcional)</FormLabel>
                      <FormControl><Input placeholder="Nome para cliente avulso" {...field} disabled={isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField control={osForm.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descrição do Serviço/Produto</FormLabel><FormControl><Textarea placeholder="Detalhe o serviço a ser realizado ou o produto a ser entregue." rows={4} {...field} disabled={isSaving} /></FormControl><FormMessage /></FormItem>)} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField control={osForm.control} name="valorTotal" render={({ field }) => (<FormItem><FormLabel>Valor Total (R$)</FormLabel><FormControl><Input type="number" placeholder="0,00" {...field} step="0.01" min="0" disabled={isSaving}/></FormControl><FormMessage /></FormItem>)} />
                <FormField control={osForm.control} name="valorAdiantado" render={({ field }) => (<FormItem><FormLabel>Valor Adiantado (R$) (Opcional)</FormLabel><FormControl><Input type="number" placeholder="0,00" {...field} step="0.01" min="0" disabled={isSaving}/></FormControl><FormMessage /></FormItem>)} />
              </div>
              <FormField control={osForm.control} name="dataEntrega" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data de Entrega Prevista</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isSaving}>
                      {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} initialFocus locale={ptBR} /></PopoverContent>
                  </Popover><FormMessage /></FormItem>)} />
              <FormField control={osForm.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais, instruções específicas, etc." rows={3} {...field} disabled={isSaving} /></FormControl><FormMessage /></FormItem>)} />
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button type="submit" disabled={isSaving || isSendingEmail} className="w-full sm:w-auto">{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Salvando...</> : "Salvar Ordem de Serviço"}</Button>
                <Button type="button" variant="outline" onClick={handleEnviarWhatsApp} disabled={!canSendActions || isSaving || isSendingEmail} className="w-full sm:w-auto"><MessageSquare className="mr-2 h-4 w-4" /> Enviar por WhatsApp</Button>
                <Button type="button" variant="outline" onClick={handleEnviarEmail} disabled={!canSendActions || isSaving || isSendingEmail} className="w-full sm:w-auto">{isSendingEmail ? <><Mail className="mr-2 h-4 w-4 animate-pulse" /> Enviando...</> : <><Mail className="mr-2 h-4 w-4" /> Enviar por E-mail</>}</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={isNewClientModalOpen} onOpenChange={(isOpen) => { setIsNewClientModalOpen(isOpen); if (!isOpen) newClientForm.reset(); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader><DialogTitle>Cadastrar Novo Cliente</DialogTitle><DialogPrimitiveDescription>Preencha os dados abaixo para adicionar um novo cliente.</DialogPrimitiveDescription></DialogHeader>
          <Form {...newClientForm}>
            <form onSubmit={newClientForm.handleSubmit(onSaveNewClient)} className="space-y-4 py-2">
              <FormField control={newClientForm.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={newClientForm.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Opcional)</FormLabel><FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={newClientForm.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone (Opcional)</FormLabel><FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={newClientForm.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço (Opcional)</FormLabel><FormControl><Textarea placeholder="Rua, Número, Bairro..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={isSavingNewClient}>Cancelar</Button></DialogClose><Button type="submit" disabled={isSavingNewClient}>{isSavingNewClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Cliente</Button></DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    
