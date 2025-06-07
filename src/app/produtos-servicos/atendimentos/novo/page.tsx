
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type FieldPath, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileText, MessageSquare, Mail, Loader2, UserPlus, Trash2, PlusCircle } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
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
import { useAIGuide } from '@/contexts/AIGuideContext';

type ProductionOrderStatusOSPage = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

const MANUAL_ITEM_PLACEHOLDER_VALUE = "manual_placeholder";

const itemOSSchema = z.object({
  idTemp: z.string(),
  produtoServicoId: z.string().optional(),
  nome: z.string().min(1, "Nome do item é obrigatório."),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva.").default(1),
  valorUnitario: z.coerce.number().nonnegative("Valor unitário não pode ser negativo.").default(0),
  valorTotal: z.coerce.number().nonnegative().default(0),
  tipo: z.enum(['Produto', 'Serviço', 'Manual']).default('Manual'),
});
type ItemOSFormValues = z.infer<typeof itemOSSchema>;

const ordemServicoFormSchema = z.object({
  clienteId: z.string().optional(),
  clienteNome: z.string().optional(),
  itens: z.array(itemOSSchema).min(1, { message: "Adicione pelo menos um item à Ordem de Serviço." }),
  valorTotalOS: z.coerce.number().positive({ message: "O valor total da OS deve ser positivo." }).default(0),
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

interface CatalogoItem {
  id: string;
  nome: string;
  valorVenda: number;
  tipo: 'Produto' | 'Serviço';
  unidade?: string;
}

interface LastSavedOsDataType extends Omit<OrdemServicoFormValues, 'itens' | 'valorTotalOS'> {
  numeroOS?: string;
  clienteNomeFinal?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  itensSalvos: Array<Omit<ItemOSFormValues, 'idTemp'>>;
  valorTotalOSSalvo: number;
}

interface AIFillFormEventPayload {
  formName: string;
  fieldName: FieldPath<OrdemServicoFormValues> | `itens.${number}.${keyof ItemOSFormValues}`;
  value: any;
  actionLabel?: string;
  itemIndex?: number;
}

interface AIOpenNewClientModalOSEventPayload {
  suggestedClientName?: string;
  actionLabel?: string;
}

const formatPhoneNumberForWhatsApp = (phone: string | undefined): string | null => {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) {
    // Already has 55, likely correct
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
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastSavedOsData, setLastSavedOsData] = useState<LastSavedOsDataType | null>(null);
  const searchParams = useSearchParams();
  const { updateAICurrentPageContext } = useAIGuide();

  const [clients, setClients] = useState<Cliente[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [catalogoItens, setCatalogoItens] = useState<CatalogoItem[]>([]);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(false);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);

  const bypassAuth = true;

  const osForm = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(ordemServicoFormSchema),
    defaultValues: {
      clienteId: "avulso",
      clienteNome: "Cliente Avulso",
      itens: [],
      valorTotalOS: 0,
      valorAdiantado: 0,
      observacoes: "",
      dataEntrega: undefined,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: osForm.control,
    name: "itens",
  });

  const newClientForm = useForm<NewClientFormValues>({
    resolver: zodResolver(newClientSchema),
    defaultValues: { nome: "", email: "", telefone: "", endereco: "" },
  });

  useEffect(() => {
    updateAICurrentPageContext("Nova Ordem de Serviço");
  }, [updateAICurrentPageContext]);

  useEffect(() => {
    const subscription = osForm.watch((_, { name, type }) => {
      // Recalculate item total if quantity or unit price of an item changed
      if (name && name.startsWith("itens.") && (name.endsWith(".quantidade") || name.endsWith(".valorUnitario"))) {
        const parts = name.split('.');
        const index = parseInt(parts[1], 10);
        
        const item = osForm.getValues(`itens.${index}`); // Get the LATEST values from form state
        if (item && typeof item.quantidade === 'number' && typeof item.valorUnitario === 'number') {
          const newTotalItem = item.quantidade * item.valorUnitario;
          // Only update if it's actually different to avoid re-renders/potential loops
          if (item.valorTotal !== newTotalItem) { 
            osForm.setValue(`itens.${index}.valorTotal`, newTotalItem, { shouldValidate: false }); // Update specific item's total
          }
        }
      }

      // Always recalculate OS total based on all current item totals
      // This will run after an individual item's total might have been updated by the block above
      const currentItens = osForm.getValues("itens") || [];
      const totalOS = currentItens.reduce((sum, itemEntry) => sum + (itemEntry.valorTotal || 0), 0);
      
      if (osForm.getValues("valorTotalOS") !== totalOS) {
        osForm.setValue("valorTotalOS", totalOS, { shouldValidate: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [osForm]);


 useEffect(() => {
    const handleAiFormFill = (event: Event) => {
      const customEvent = event as CustomEvent<AIFillFormEventPayload>;
      const { detail } = customEvent;

      if (detail.formName === "ordemServicoForm") {
        const generalFieldNames: Array<FieldPath<OrdemServicoFormValues>> = [
          "clienteId", "clienteNome", "valorAdiantado", "dataEntrega", "observacoes"
        ];

        if (typeof detail.fieldName === 'string' && generalFieldNames.includes(detail.fieldName as FieldPath<OrdemServicoFormValues>)) {
          let valueToSet = detail.value;
          if (detail.fieldName === 'dataEntrega' && typeof valueToSet === 'string') {
            const parsedDate = new Date(valueToSet + 'T00:00:00'); 
            if (!isNaN(parsedDate.getTime())) valueToSet = parsedDate;
            else { toast({ title: "Erro de Data", description: "Formato de data inválido da IA.", variant: "destructive"}); return; }
          } else if (detail.fieldName === 'valorAdiantado' && typeof valueToSet !== 'number') {
            const numValue = parseFloat(valueToSet);
            if (!isNaN(numValue)) valueToSet = numValue;
            else { toast({ title: "Erro de Valor", description: "Valor de adiantamento inválido da IA.", variant: "destructive"}); return; }
          }
          osForm.setValue(detail.fieldName as FieldPath<OrdemServicoFormValues>, valueToSet, { shouldValidate: true, shouldDirty: true });
          toast({ title: "Campo Preenchido pela IA", description: `${detail.actionLabel || `Campo ${detail.fieldName} preenchido.`}` });
        } else if (typeof detail.fieldName === 'string' && detail.fieldName.startsWith("itens.") && detail.itemIndex !== undefined) {
            const fieldNameParts = detail.fieldName.split('.');
            const itemIndex = parseInt(fieldNameParts[1], 10);
            const itemFieldName = fieldNameParts[2] as keyof ItemOSFormValues;

            if (itemIndex >= 0 && itemIndex < fields.length && itemFieldName) {
                // Use handleItemChange for consistency if it's quantity or valorUnitario
                if (itemFieldName === 'quantidade' || itemFieldName === 'valorUnitario') {
                  handleItemChange(itemIndex, itemFieldName, detail.value);
                } else {
                  update(itemIndex, { ...fields[itemIndex], [itemFieldName]: detail.value });
                }
                toast({ title: "Item da OS Atualizado pela IA", description: `${detail.actionLabel || `Item ${itemIndex + 1}, campo ${itemFieldName} atualizado.`}` });
            } else {
                console.warn(`IA tentou preencher campo de item inválido: ${detail.fieldName}`);
                toast({ title: "Campo de Item Inválido", variant: "destructive" });
            }
        } else {
          console.warn(`IA tentou preencher campo inválido: ${detail.fieldName}`);
          toast({ title: "Campo Inválido", variant: "destructive"});
        }
      }
    };
    window.addEventListener('aiFillFormEvent', handleAiFormFill);
    return () => window.removeEventListener('aiFillFormEvent', handleAiFormFill);
 }, [osForm, toast, fields, update]);


  const fetchClientsAndCatalogo = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setClients([]);
      setCatalogoItens([]);
      setIsLoadingClients(false);
      setIsLoadingCatalogo(false);
      return;
    }
    setIsLoadingClients(true);
    setIsLoadingCatalogo(true);
    try {
      const clientsQuery = query(collection(db, "clientes"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const clientsSnapshot = await getDocs(clientsQuery);
      const fetchedClients = clientsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as Omit<Cliente, 'id'>) }));
      setClients(fetchedClients);

      const catalogoQuery = query(collection(db, "produtosServicos"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const catalogoSnapshot = await getDocs(catalogoQuery);
      const fetchedCatalogoItens = catalogoSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as Omit<CatalogoItem, 'id'>) }));
      setCatalogoItens(fetchedCatalogoItens);

    } catch (error: any) {
      console.error("Erro ao buscar clientes ou catálogo:", error);
      toast({ title: "Erro ao buscar dados", variant: "destructive", description: "Não foi possível carregar clientes ou catálogo." });
    } finally {
      setIsLoadingClients(false);
      setIsLoadingCatalogo(false);
    }
  }, [user, bypassAuth, toast]);

  useEffect(() => {
    if (user || bypassAuth) {
      fetchClientsAndCatalogo();
    }
  }, [fetchClientsAndCatalogo, user, bypassAuth]);

  useEffect(() => {
    const clienteIdParam = searchParams.get('clienteId');
    const descricaoParam = searchParams.get('descricao');
    const valorTotalParam = searchParams.get('valorTotal');
    const clienteNomeParam = searchParams.get('clienteNome');

    let prefillData: Partial<OrdemServicoFormValues> & { itens: ItemOSFormValues[] } = { itens: [] };

    if (clienteIdParam) {
      prefillData.clienteId = clienteIdParam;
      const clientExists = clients.some(c => c.id === clienteIdParam);
      if (clientExists && clienteNomeParam) {
        prefillData.clienteNome = clienteNomeParam;
      } else if (clienteIdParam === "avulso") {
        prefillData.clienteNome = clienteNomeParam || "Cliente Avulso";
      } else if (clienteIdParam !== "avulso" && !clientExists) {
         prefillData.clienteNome = clienteNomeParam || "Cliente Avulso"; 
      }
    } else {
        prefillData.clienteId = "avulso";
        prefillData.clienteNome = clienteNomeParam || "Cliente Avulso";
    }

    if (descricaoParam) {
      const valorItem = valorTotalParam ? parseFloat(valorTotalParam) : 0;
      prefillData.itens.push({
        idTemp: `item-${Date.now()}`,
        produtoServicoId: undefined, 
        nome: descricaoParam,
        quantidade: 1,
        valorUnitario: valorItem,
        valorTotal: valorItem,
        tipo: 'Manual',
      });
    }

    if (Object.keys(prefillData).length > 1 || prefillData.itens.length > 0) { 
      osForm.reset(currentValues => ({
        ...currentValues,
        ...prefillData,
        dataEntrega: currentValues.dataEntrega || undefined, 
        valorTotalOS: prefillData.itens.reduce((sum, item) => sum + item.valorTotal, 0) || 0,
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
        } else if (!nomeForm && !nomeParam) {
             osForm.setValue('clienteNome', "Cliente Avulso");
        }
    }
  }, [osForm, clients, searchParams, osForm.watch('clienteId')]);


  async function onOsSubmit(data: OrdemServicoFormValues) {
    setIsSaving(true);
    setLastSavedOsData(null);
    let userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);

    if (!userIdToSave) {
      toast({ title: "Erro de Autenticação", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const now = Timestamp.now();
    const selectedClient = data.clienteId && data.clienteId !== "avulso" ? clients.find(c => c.id === data.clienteId) : null;
    const nomeClienteFinal = selectedClient ? selectedClient.nome : (data.clienteNome || "Cliente Avulso");

    const itensParaSalvar = data.itens.map(item => ({
      produtoServicoId: (item.produtoServicoId && item.produtoServicoId !== MANUAL_ITEM_PLACEHOLDER_VALUE) ? item.produtoServicoId : null,
      nome: item.nome,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      valorTotal: item.valorTotal,
      tipo: item.tipo,
    }));

    const osDataToSave = {
      clienteId: data.clienteId && data.clienteId !== "avulso" ? data.clienteId : null,
      clienteNome: nomeClienteFinal,
      itens: itensParaSalvar,
      valorTotal: data.valorTotalOS,
      valorAdiantado: data.valorAdiantado || 0,
      dataEntrega: Timestamp.fromDate(data.dataEntrega),
      observacoes: data.observacoes || "",
      status: "Pendente" as ProductionOrderStatusOSPage,
      userId: userIdToSave,
      criadoEm: now,
      atualizadoEm: now,
      numeroOS: ""
    };

    let osDocRefId: string | null = null;

    try {
      const docRef = await addDoc(collection(db, "ordensServico"), osDataToSave);
      osDocRefId = docRef.id;
      await updateDoc(doc(db, "ordensServico", osDocRefId), { numeroOS: osDocRefId });

      const valorAdiantado = data.valorAdiantado || 0;
      if (valorAdiantado > 0) {
         // Lógica para registrar adiantamento no financeiro (futuro)
      }
      const valorAReceber = data.valorTotalOS - valorAdiantado;
      if (valorAReceber > 0) {
         // Lógica para registrar saldo pendente no financeiro (futuro)
      }

      const primeiroItemNome = data.itens[0]?.nome || "Serviço Detalhado na OS";
      const productionOrderData = {
        agendamentoId: osDocRefId, 
        clienteId: osDataToSave.clienteId,
        clienteNome: osDataToSave.clienteNome,
        servicoNome: primeiroItemNome + (data.itens.length > 1 ? " e outros" : ""),
        dataAgendamento: osDataToSave.dataEntrega,
        status: "Pendente" as ProductionOrderStatusOSPage,
        progresso: 0,
        observacoesAgendamento: osDataToSave.observacoes,
        userId: userIdToSave,
        criadoEm: now,
        atualizadoEm: now,
      };
      await addDoc(collection(db, "ordensDeProducao"), productionOrderData);
      
      toast({ title: "Ordem de Serviço Salva!", description: `OS #${osDocRefId.substring(0,6)}... salva e ordem de produção criada.` });
      setLastSavedOsData({
        ...data,
        numeroOS: osDocRefId,
        clienteNomeFinal: nomeClienteFinal,
        clienteTelefone: selectedClient?.telefone,
        clienteEmail: selectedClient?.email,
        itensSalvos: itensParaSalvar,
        valorTotalOSSalvo: data.valorTotalOS,
      });
      osForm.reset({ clienteId: "avulso", clienteNome: "Cliente Avulso", itens: [], valorTotalOS: 0, valorAdiantado: 0, observacoes: "", dataEntrega: undefined });

    } catch (e: any) {
      console.error("Erro ao salvar OS:", e);
      toast({ title: "Erro ao Salvar OS", variant: "destructive", description: e.message });
    } finally {
      setIsSaving(false);
    }
  }

  async function onSaveNewClient(data: NewClientFormValues) {
    if (!user && !bypassAuth) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSavingNewClient(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : "unknown_user");
    const now = Timestamp.now();

    const newClientData = {
      ...data,
      userId: userIdToSave,
      criadoEm: now,
      atualizadoEm: now,
      temDebitos: false, 
    };

    try {
      const docRef = await addDoc(collection(db, "clientes"), newClientData);
      const newClientForSelect = { id: docRef.id, nome: data.nome, email: data.email, telefone: data.telefone };
      setClients(prev => [...prev, newClientForSelect].sort((a,b) => a.nome.localeCompare(b.nome)));
      osForm.setValue('clienteId', docRef.id); 
      osForm.setValue('clienteNome', data.nome);
      toast({ title: "Novo Cliente Salvo!", description: `${data.nome} foi adicionado e selecionado.` });
      setIsNewClientModalOpen(false);
      newClientForm.reset();
    } catch (e: any) {
      console.error("Erro ao salvar novo cliente:", e);
      toast({ title: "Erro ao Salvar Cliente", variant: "destructive", description: e.message });
    } finally {
      setIsSavingNewClient(false);
    }
  }


  const handleAddItem = (itemCatalogo?: CatalogoItem) => {
    const newItem: ItemOSFormValues = itemCatalogo ? {
        idTemp: `item-${Date.now()}`,
        produtoServicoId: itemCatalogo.id,
        nome: itemCatalogo.nome,
        quantidade: 1,
        valorUnitario: itemCatalogo.valorVenda,
        valorTotal: itemCatalogo.valorVenda, 
        tipo: itemCatalogo.tipo,
    } : {
        idTemp: `item-${Date.now()}`,
        produtoServicoId: undefined,
        nome: "",
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        tipo: 'Manual',
    };
    append(newItem);
  };

  const handleItemChange = (index: number, field: keyof ItemOSFormValues, value: any) => {
    const currentItem = fields[index]; // From useFieldArray
    let numericValue = value;

    if (field === 'quantidade' || field === 'valorUnitario') {
      numericValue = parseFloat(String(value)) || 0; // Ensure string conversion for parseFloat
    }
    
    // Create a temporary object with the changed field
    // This object is what will be passed to `update`
    const itemStateToUpdate = { ...currentItem, [field]: numericValue };

    // Recalculate valorTotal for this item based on its own quantity and valorUnitario from the temp state
    if (field === 'quantidade' || field === 'valorUnitario') {
      const qtd = itemStateToUpdate.quantidade || 0;
      const vu = itemStateToUpdate.valorUnitario || 0;
      itemStateToUpdate.valorTotal = qtd * vu;
    }
    // For other fields, valorTotal remains as it was in currentItem unless explicitly set by this logic
    
    update(index, itemStateToUpdate); // Update the item in the form array, this will trigger the watch
  };

  const handleItemCatalogoSelect = (index: number, itemId: string) => {
    const currentItem = fields[index];
    if (itemId === MANUAL_ITEM_PLACEHOLDER_VALUE) {
        update(index, {
            ...currentItem,
            produtoServicoId: undefined,
            nome: "", 
            valorUnitario: 0,
            valorTotal: 0, 
            tipo: 'Manual',
        });
    } else {
        const selectedCatalogoItem = catalogoItens.find(c => c.id === itemId);
        if (selectedCatalogoItem) {
            const currentQty = currentItem.quantidade || 1;
            update(index, {
                ...currentItem,
                produtoServicoId: selectedCatalogoItem.id,
                nome: selectedCatalogoItem.nome,
                valorUnitario: selectedCatalogoItem.valorVenda,
                valorTotal: currentQty * selectedCatalogoItem.valorVenda, 
                tipo: selectedCatalogoItem.tipo,
            });
        }
    }
  };

  const handleEnviarWhatsApp = () => { 
    toast({ title: "WhatsApp", description: "Funcionalidade de envio por WhatsApp em desenvolvimento." });
  }
  const handleEnviarEmail = async () => {
    toast({ title: "E-mail", description: "Funcionalidade de envio por E-mail em desenvolvimento." });
  }

  const canSendActions = (!!lastSavedOsData && !!lastSavedOsData.dataEntrega) || (osForm.formState.isValid && (osForm.formState.isDirty || Object.keys(osForm.formState.touchedFields).length > 0) && !!osForm.getValues('dataEntrega'));

  if (isAuthLoading || isLoadingClients || isLoadingCatalogo) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados...</p></div>;
  }
  

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Nova Ordem de Serviço</CardTitle>
              <CardDescription>Preencha os dados para criar uma nova OS.</CardDescription>
            </div>
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
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value !== 'avulso') {
                            const client = clients.find(c => c.id === value);
                            if (client) osForm.setValue('clienteNome', client.nome);
                          } else {
                            osForm.setValue('clienteNome', 'Cliente Avulso');
                          }
                        }}
                        value={field.value || "avulso"} 
                        disabled={isLoadingClients}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecione o cliente"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="avulso">Cliente Avulso</SelectItem>
                          {clients.map(client => (
                            <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" onClick={() => setIsNewClientModalOpen(true)} disabled={isLoadingClients} title="Adicionar Novo Cliente">
                        <UserPlus className="h-4 w-4"/>
                      </Button>
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
                      <FormLabel>Nome do Cliente Avulso</FormLabel>
                      <FormControl><Input placeholder="Nome para cliente avulso" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Card className="pt-4">
                <CardHeader><CardTitle className="text-lg">Itens da Ordem de Serviço</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((item, index) => {
                    const isCatalogoSelected = !!item.produtoServicoId && item.produtoServicoId !== MANUAL_ITEM_PLACEHOLDER_VALUE;
                    return (
                    <div key={item.idTemp} className="p-3 border rounded-md space-y-3 relative bg-muted/20">
                       <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => remove(index)} title="Remover Item">
                         <Trash2 className="h-4 w-4" />
                       </Button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormItem>
                                <FormLabel>Item do Catálogo</FormLabel>
                                <Select
                                    onValueChange={(value) => handleItemCatalogoSelect(index, value)}
                                    value={item.produtoServicoId || MANUAL_ITEM_PLACEHOLDER_VALUE}
                                    disabled={isLoadingCatalogo}
                                >
                                    <FormControl><SelectTrigger><SelectValue placeholder={isLoadingCatalogo ? "Carregando..." : "Selecione ou digite abaixo"} /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value={MANUAL_ITEM_PLACEHOLDER_VALUE}>-- Item Manual --</SelectItem>
                                        {catalogoItens.map(catItem => <SelectItem key={catItem.id} value={catItem.id}>{catItem.nome} ({catItem.tipo}) - R${catItem.valorVenda.toFixed(2)}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                             <FormField name={`itens.${index}.nome`} control={osForm.control} render={({ field }) => (
                                <FormItem><FormLabel>Nome do Item</FormLabel><FormControl><Input placeholder="Nome do produto/serviço" {...field} disabled={isCatalogoSelected} /></FormControl><FormMessage /></FormItem>
                             )}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                             <FormField name={`itens.${index}.quantidade`} control={osForm.control} render={({ field }) => (
                                <FormItem><FormLabel>Qtd.</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={e => handleItemChange(index, 'quantidade', e.target.value)} min="1" /></FormControl><FormMessage /></FormItem>
                             )}/>
                             <FormField name={`itens.${index}.valorUnitario`} control={osForm.control} render={({ field }) => (
                                <FormItem><FormLabel>Val. Unit. (R$)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" onChange={e => handleItemChange(index, 'valorUnitario', e.target.value)} disabled={isCatalogoSelected} /></FormControl><FormMessage /></FormItem>
                             )}/>
                             <FormItem>
                                <FormLabel>Val. Total (R$)</FormLabel>
                                <Input type="number" value={(item.valorTotal || 0).toFixed(2)} readOnly disabled className="bg-muted/50" />
                             </FormItem>
                        </div>
                         <FormField name={`itens.${index}.tipo`} control={osForm.control} render={({ field }) => ( 
                            <FormItem className="hidden">
                                <FormControl><Input {...field} /></FormControl>
                            </FormItem>
                         )}/>
                    </div>
                  );
                })}
                  <Button type="button" variant="outline" onClick={() => handleAddItem()} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4"/> Adicionar Item</Button>
                  <FormMessage>{osForm.formState.errors.itens?.message || osForm.formState.errors.itens?.root?.message}</FormMessage>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormItem>
                    <FormLabel>Valor Total da OS (R$)</FormLabel>
                    <FormControl><Input type="number" value={(osForm.watch('valorTotalOS') || 0).toFixed(2)} readOnly disabled className="font-bold text-lg bg-muted/50" /></FormControl>
                    <FormMessage />
                </FormItem>
                <FormField
                  control={osForm.control}
                  name="valorAdiantado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Adiantado (R$) (Opcional)</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value || 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} step="0.01" min="0" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={osForm.control}
                name="dataEntrega"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Entrega Prevista</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ptBR })
                            ) : (
                              <span>Escolha uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1))} 
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={osForm.control}
                name="observacoes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes importantes, instruções especiais, etc." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Cliente</DialogTitle>
            <DialogPrimitiveDescription>
              Preencha os dados para cadastrar um novo cliente rapidamente.
            </DialogPrimitiveDescription>
          </DialogHeader>
          <Form {...newClientForm}>
            <form onSubmit={newClientForm.handleSubmit(onSaveNewClient)} className="space-y-4 py-2">
              <FormField control={newClientForm.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={newClientForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Opcional)</FormLabel>
                  <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={newClientForm.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (Opcional)</FormLabel>
                  <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={newClientForm.control} name="endereco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Rua ABC, 123, Bairro, Cidade - UF" {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSavingNewClient}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSavingNewClient}>
                  {isSavingNewClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Novo Cliente
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
