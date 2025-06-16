
/// REFORMULADO E OTIMIZADO ///
"use client";

// Imports agrupados por funcionalidade
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectTrigger, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth/auth-provider";
import { useAIGuide } from "@/contexts/AIGuideContext";

import { FileText, CalendarIcon, MessageSquare, Mail, Loader2, Trash2, PlusCircle, UserPlus } from "lucide-react";

// Schemas e Tipagens
import { OrdemServicoFormSchema, type OrdemServicoFormValues, type ItemOSFormValues, type OrdemServicoCreateData } from "@/schemas/ordemServicoSchema";
import { type OrdemProducaoCreateData, type OrdemProducaoStatus } from "@/schemas/ordemProducaoSchema";
import { ClientFormSchema, type ClientFormValues as NewClientFormValues, type ClientCreateData, type Client } from "@/schemas/clientSchema";
import type { ProductService } from "@/schemas/productServiceSchema";

// Services
import { getAllClientsByUserId, createClient } from "@/services/clientService";
import { getAllProductServicesByUserId } from "@/services/productServiceService";
import { createOrdemServico } from "@/services/ordemServicoService";
import { createOrdemProducao } from "@/services/ordemProducaoService";

// Constantes
const MANUAL_ITEM_PLACEHOLDER_VALUE = "manual_placeholder";

interface LastSavedOsDataType extends Omit<OrdemServicoFormValues, 'itens'> {
  numeroOS?: string;
  clienteNomeFinal?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  itensSalvos: Array<Omit<ItemOSFormValues, 'idTemp'>>;
}

interface AIFillFormEventPayload {
  formName: string;
  fieldName: FieldPath<OrdemServicoFormValues> | `itens.${number}.${keyof Omit<ItemOSFormValues, 'idTemp' | 'tipo'>}`;
  value: any;
  actionLabel?: string;
  itemIndex?: number;
}

export default function OrdemServicoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isAuthLoading } = useAuth();
  const { updateAICurrentPageContext } = useAIGuide();
  const bypassAuth = true;

  const osForm = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(OrdemServicoFormSchema),
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
    resolver: zodResolver(ClientFormSchema),
    defaultValues: { nome: "", email: "", telefone: "", endereco: "" },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [lastSavedOsData, setLastSavedOsData] = useState<LastSavedOsDataType | null>(null);
  const [isSavingNewClient, setIsSavingNewClient] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [catalogoItens, setCatalogoItens] = useState<ProductService[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  
  const [isInitialPrefillComplete, setIsInitialPrefillComplete] = useState(false);
  const prevClienteIdRef = useRef<string | undefined>(osForm.getValues('clienteId'));


  // Effect 1: Fetch initial data (clients and catalog)
  useEffect(() => {
    const userIdToQuery = user?.uid || (bypassAuth ? "bypass_user_placeholder" : "");
    if (!userIdToQuery) {
      setIsLoadingClients(false);
      setIsLoadingCatalogo(false);
      return;
    }

    setIsLoadingClients(true);
    setIsLoadingCatalogo(true);

    Promise.all([
      getAllClientsByUserId(userIdToQuery),
      getAllProductServicesByUserId(userIdToQuery, "nome", "asc"),
    ]).then(([fetchedClients, fetchedCatalogoItens]) => {
      setClients(fetchedClients);
      setCatalogoItens(fetchedCatalogoItens);
    }).catch((err: any) => {
      console.error("Erro ao carregar dados iniciais (clientes/catálogo):", err);
      toast({ title: "Erro ao carregar dados", description: `Não foi possível carregar clientes ou catálogo. Detalhe: ${err.message}`, variant: "destructive", duration: 7000 });
    }).finally(() => {
      setIsLoadingClients(false);
      setIsLoadingCatalogo(false);
    });
  }, [user, bypassAuth, toast]);


  // Effect 2: Prefill form from searchParams ONCE after data is loaded
  useEffect(() => {
    if (isLoadingClients || isLoadingCatalogo || isInitialPrefillComplete) {
      return;
    }

    const clienteIdParam = searchParams.get('clienteId');
    const clienteNomeParam = searchParams.get('clienteNome');
    const descricaoParam = searchParams.get('descricao');
    const valorTotalParam = searchParams.get('valorTotal');
    
    let prefillValues: Partial<OrdemServicoFormValues> & { itens?: ItemOSFormValues[] } = {};
    let shouldApplyPrefill = false;

    if (clienteIdParam) {
      const client = clients.find(c => c.id === clienteIdParam);
      prefillValues.clienteId = client ? client.id : "avulso";
      prefillValues.clienteNome = client ? client.nome : (clienteNomeParam || "Cliente Avulso");
      shouldApplyPrefill = true;
    } else if (clienteNomeParam) {
      prefillValues.clienteId = "avulso";
      prefillValues.clienteNome = clienteNomeParam;
      shouldApplyPrefill = true;
    }

    if (descricaoParam) {
      let valorUnitarioDoItem = 0;
      if (valorTotalParam && !isNaN(parseFloat(valorTotalParam))) {
        valorUnitarioDoItem = parseFloat(valorTotalParam);
      }
      prefillValues.itens = [{
        idTemp: `item-${Date.now()}`,
        produtoServicoId: undefined,
        nome: descricaoParam,
        quantidade: 1,
        valorUnitario: valorUnitarioDoItem,
        tipo: 'Manual',
      }];
      if (valorTotalParam && !isNaN(parseFloat(valorTotalParam))) {
        prefillValues.valorTotalOS = parseFloat(valorTotalParam);
      }
      shouldApplyPrefill = true;
    } else if (valorTotalParam && !isNaN(parseFloat(valorTotalParam))) {
      prefillValues.valorTotalOS = parseFloat(valorTotalParam);
      shouldApplyPrefill = true;
    }

    if (shouldApplyPrefill) {
      osForm.reset({
        ...osForm.formState.defaultValues,
        ...prefillValues,
      });
    } else {
      // If no specific prefill params, ensure form is reset to its defined defaults
      osForm.reset(osForm.formState.defaultValues);
    }
    
    setIsInitialPrefillComplete(true);
    setLastSavedOsData(null);
    prevClienteIdRef.current = osForm.getValues('clienteId'); // Initialize prevClienteIdRef after reset

  }, [searchParams, clients, catalogoItens, osForm, isLoadingClients, isLoadingCatalogo, isInitialPrefillComplete]);


  // Effect 3: Sync clienteNome when clienteId (dropdown) changes, AFTER initial prefill is complete
  const watchedClienteId = osForm.watch('clienteId');
  useEffect(() => {
    if (!isInitialPrefillComplete || isLoadingClients || watchedClienteId === prevClienteIdRef.current) {
      // Only run if prefill is complete, clients are loaded, and clienteId actually changed
      if (watchedClienteId !== prevClienteIdRef.current) { // Update ref if it changed but other conditions failed
         prevClienteIdRef.current = watchedClienteId;
      }
      return;
    }

    const currentFormClienteNome = osForm.getValues('clienteNome');

    if (watchedClienteId && watchedClienteId !== "avulso") {
      const client = clients.find(c => c.id === watchedClienteId);
      if (client && client.nome !== currentFormClienteNome) {
        osForm.setValue('clienteNome', client.nome, { shouldValidate: true, shouldDirty: true });
      }
    } else if (watchedClienteId === "avulso") {
      const defaultAvulsoName = "Cliente Avulso";
      // Set to "Cliente Avulso" only if it's not already that AND (it's empty OR it was a specific client previously)
      if (currentFormClienteNome !== defaultAvulsoName && 
          (currentFormClienteNome === "" || (prevClienteIdRef.current && prevClienteIdRef.current !== "avulso"))) {
         osForm.setValue('clienteNome', defaultAvulsoName, { shouldValidate: true, shouldDirty: true });
      }
    }
    prevClienteIdRef.current = watchedClienteId; // Update ref after handling the change

  }, [watchedClienteId, clients, osForm, isInitialPrefillComplete, isLoadingClients]);


  const watchedOsFormValues = osForm.watch();
  useEffect(() => {
    if (isInitialPrefillComplete) { 
        const formSnapshotJSON = JSON.stringify(watchedOsFormValues);
        updateAICurrentPageContext({
            pageName: "Nova Ordem de Serviço",
            formSnapshotJSON: formSnapshotJSON,
        });
    }
  }, [watchedOsFormValues, updateAICurrentPageContext, isInitialPrefillComplete]);


  useEffect(() => {
    const handleAiFormFill = (event: Event) => {
      const customEvent = event as CustomEvent<AIFillFormEventPayload>;
      const { detail } = customEvent;

      if (detail.formName === "ordemServicoForm") {
        const generalFieldNames: Array<FieldPath<OrdemServicoFormValues>> = [
          "clienteId", "clienteNome", "valorAdiantado", "dataEntrega", "observacoes", "valorTotalOS"
        ];

        if (typeof detail.fieldName === 'string' && generalFieldNames.includes(detail.fieldName as FieldPath<OrdemServicoFormValues>)) {
          let valueToSet = detail.value;
          if (detail.fieldName === 'dataEntrega' && typeof valueToSet === 'string') {
            const parsedDate = new Date(valueToSet + 'T00:00:00'); 
            if (!isNaN(parsedDate.getTime())) valueToSet = parsedDate;
            else { toast({ title: "Erro de Data", description: "Formato de data inválido da IA.", variant: "destructive"}); return; }
          } else if ((detail.fieldName === 'valorAdiantado' || detail.fieldName === 'valorTotalOS') && typeof valueToSet !== 'number') {
            const numValue = parseFloat(valueToSet);
            if (!isNaN(numValue)) valueToSet = numValue;
            else { toast({ title: "Erro de Valor", description: `Valor de ${detail.fieldName} inválido da IA.`, variant: "destructive"}); return; }
          }
          osForm.setValue(detail.fieldName as FieldPath<OrdemServicoFormValues>, valueToSet, { shouldValidate: true, shouldDirty: true });
          toast({ title: "Campo Preenchido pela IA", description: `${detail.actionLabel || `Campo ${detail.fieldName} preenchido.`}` });
        } else if (typeof detail.fieldName === 'string' && detail.fieldName.startsWith("itens.") && detail.itemIndex !== undefined) {
            const fieldNameParts = detail.fieldName.split('.');
            const itemIndex = parseInt(fieldNameParts[1], 10);
            const itemFieldName = fieldNameParts[2] as keyof Omit<ItemOSFormValues, 'idTemp' | 'tipo'>;

            if (itemIndex >= 0 && itemIndex < fields.length && itemFieldName) {
                let valueToSet = detail.value;
                 if ((itemFieldName === 'quantidade' || itemFieldName === 'valorUnitario') && typeof valueToSet !== 'number') {
                    const numValue = parseFloat(valueToSet);
                    if (!isNaN(numValue)) valueToSet = numValue;
                    else { 
                        toast({ title: "Erro de Valor do Item", description: `Valor de ${itemFieldName} inválido da IA para o item ${itemIndex + 1}.`, variant: "destructive"}); 
                        return; 
                    }
                }
                update(itemIndex, { ...fields[itemIndex], [itemFieldName]: valueToSet });
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


  async function onOsSubmit(data: OrdemServicoFormValues) {
    setIsSaving(true);
    setLastSavedOsData(null);
    const uid = user?.uid || (bypassAuth ? "bypass_user_placeholder" : null);
    if (!uid) {
      toast({ title: "Erro de Autenticação", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    const selectedClient = data.clienteId && data.clienteId !== "avulso" ? clients.find(c => c.id === data.clienteId) : null;
    const nomeClienteFinal = selectedClient ? selectedClient.nome : (data.clienteNome || "Cliente Avulso");

    const itensParaSalvar = data.itens.map(({ produtoServicoId, nome, quantidade, valorUnitario, tipo }) => ({
      produtoServicoId: (produtoServicoId && produtoServicoId !== MANUAL_ITEM_PLACEHOLDER_VALUE) ? produtoServicoId : null,
      nome, quantidade, valorUnitario, tipo
    }));

    const osDataToCreate: OrdemServicoCreateData = {
      clienteId: data.clienteId && data.clienteId !== "avulso" ? data.clienteId : null,
      clienteNome: nomeClienteFinal,
      itens: itensParaSalvar,
      valorTotal: data.valorTotalOS || 0,
      valorAdiantado: data.valorAdiantado || 0,
      dataEntrega: data.dataEntrega, 
      observacoes: data.observacoes || "",
    };

    try {
      const osDoc = await createOrdemServico(uid, osDataToCreate);
      
      const primeiroItemNome = itensParaSalvar[0]?.nome || "Serviço Detalhado na OS";
      const opDataToCreate: OrdemProducaoCreateData = {
        agendamentoId: osDoc.id, 
        clienteId: osDoc.clienteId,
        clienteNome: osDoc.clienteNome,
        servicoNome: primeiroItemNome + (itensParaSalvar.length > 1 ? " e outros" : ""),
        dataAgendamento: osDoc.dataEntrega, 
        status: "Pendente" as OrdemProducaoStatus, 
        progresso: 0,
        observacoesAgendamento: osDoc.observacoes,
      };
      await createOrdemProducao(uid, opDataToCreate);

      toast({ title: "OS Criada", description: `OS #${osDoc.numeroOS.substring(0, 6)}... salva e OP criada.` });
      setLastSavedOsData({
        ...data,
        numeroOS: osDoc.numeroOS, 
        clienteNomeFinal: nomeClienteFinal,
        clienteTelefone: selectedClient?.telefone,
        clienteEmail: selectedClient?.email,
        itensSalvos: itensParaSalvar,
      });
      osForm.reset({ 
        clienteId: "avulso", 
        clienteNome: "Cliente Avulso", 
        itens: [], 
        valorTotalOS: 0, 
        valorAdiantado: 0, 
        observacoes: "", 
        dataEntrega: undefined 
      });
      setIsInitialPrefillComplete(false); 
      prevClienteIdRef.current = "avulso"; // Reset ref for next form interaction
    } catch (error: any) {
      toast({ title: "Erro ao Salvar OS", description: error.message, variant: "destructive" });
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
    
    const clientDataToCreate: ClientCreateData = {
        nome: data.nome,
        email: data.email,
        telefone: data.telefone,
        endereco: data.endereco,
        cpfCnpj: data.cpfCnpj,
        dataNascimento: data.dataNascimento,
        observacoes: data.observacoes,
        temDebitos: data.temDebitos,
    };

    try {
      const clienteCriado = await createClient(userIdToSave, clientDataToCreate);
      setClients(prev => [...prev, clienteCriado].sort((a,b) => a.nome.localeCompare(b.nome)));
      osForm.setValue('clienteId', clienteCriado.id, {shouldDirty: true}); 
      prevClienteIdRef.current = clienteCriado.id; // Update ref as selection changed
      // The useEffect for watchedClienteId will handle setting clienteNome
      toast({ title: "Novo Cliente Salvo!", description: `${clienteCriado.nome} foi adicionado e selecionado.` });
      setIsNewClientModalOpen(false);
      newClientForm.reset();
    } catch (e: any) {
      console.error("Erro ao salvar novo cliente:", e);
      toast({ title: "Erro ao Salvar Cliente", variant: "destructive", description: e.message });
    } finally {
      setIsSavingNewClient(false);
    }
  }

  const handleAddItem = (itemCatalogo?: ProductService) => {
    const newItem: ItemOSFormValues = itemCatalogo ? {
        idTemp: `item-${Date.now()}`,
        produtoServicoId: itemCatalogo.id,
        nome: itemCatalogo.nome,
        quantidade: 1,
        valorUnitario: itemCatalogo.valorVenda,
        tipo: itemCatalogo.tipo,
    } : {
        idTemp: `item-${Date.now()}`,
        produtoServicoId: undefined, 
        nome: "",
        quantidade: 1,
        valorUnitario: 0,
        tipo: 'Manual',
    };
    append(newItem);
  };

  const handleItemCatalogoSelect = (index: number, itemId: string) => {
    const currentItem = fields[index];
    if (itemId === MANUAL_ITEM_PLACEHOLDER_VALUE) {
        update(index, {
            ...currentItem,
            produtoServicoId: undefined, 
            nome: currentItem.nome || "", 
            valorUnitario: currentItem.valorUnitario ?? 0, 
            tipo: 'Manual',
        });
    } else {
        const selectedCatalogoItem = catalogoItens.find(c => c.id === itemId);
        if (selectedCatalogoItem) {
            update(index, {
                ...currentItem,
                produtoServicoId: selectedCatalogoItem.id,
                nome: selectedCatalogoItem.nome,
                valorUnitario: selectedCatalogoItem.valorVenda,
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

  if (isAuthLoading) { 
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando autenticação...</p></div>;
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
          {(isLoadingClients || isLoadingCatalogo) && !isInitialPrefillComplete && (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados do formulário...</p></div>
          )}
          {(!isLoadingClients && !isLoadingCatalogo) && (
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
                            // prevClienteIdRef.current = field.value; // Update ref before field changes
                            field.onChange(value);
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

                {watchedClienteId === 'avulso' && ( 
                  <FormField
                    control={osForm.control}
                    name="clienteNome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Cliente Avulso</FormLabel>
                        <FormControl><Input placeholder="Nome para cliente avulso" {...field} value={field.value || ''} /></FormControl>
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
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField name={`itens.${index}.quantidade`} control={osForm.control} render={({ field }) => (
                                  <FormItem><FormLabel>Qtd.</FormLabel><FormControl><Input type="number" placeholder="1" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 1)} min="1" /></FormControl><FormMessage /></FormItem>
                              )}/>
                              <FormField name={`itens.${index}.valorUnitario`} control={osForm.control} render={({ field }) => (
                                  <FormItem><FormLabel>Val. Unit. (R$)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} step="0.01" min="0" disabled={isCatalogoSelected} /></FormControl><FormMessage /></FormItem>
                              )}/>
                          </div>
                          <FormField name={`itens.${index}.tipo`} control={osForm.control} render={({ field }) => ( 
                              <FormItem className="hidden">
                                  <FormControl><Input {...field} value={field.value || 'Manual'} /></FormControl>
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
                  <FormField
                    control={osForm.control}
                    name="valorTotalOS"
                    render={({ field }) => (
                      <FormItem>
                          <FormLabel>Valor Total da OS (R$) (Opcional)</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value || 0} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} step="0.01" min="0" /></FormControl>
                          <FormDescription>Se não informado, será calculado com base nos itens ao salvar.</FormDescription>
                          <FormMessage />
                      </FormItem>
                    )}
                  />
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
                      <FormControl><Textarea placeholder="Detalhes importantes, instruções especiais, etc." {...field} value={field.value || ''} rows={3} /></FormControl>
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
          )}
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
                  <FormControl><Input type="email" placeholder="email@exemplo.com" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={newClientForm.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone (Opcional)</FormLabel>
                  <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={newClientForm.control} name="endereco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço Completo (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Rua ABC, 123, Bairro, Cidade - UF" {...field} value={field.value || ''} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={newClientForm.control} name="cpfCnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ (Opcional)</FormLabel>
                  <FormControl><Input placeholder="Documento do cliente" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={newClientForm.control} name="dataNascimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Nascimento (Opcional)</FormLabel>
                  <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={newClientForm.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (Opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Preferências, histórico, etc." {...field} value={field.value || ''} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={newClientForm.control} name="temDebitos" render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl><input type="checkbox" checked={field.value || false} onChange={field.onChange} className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" /></FormControl>
                  <FormLabel className="font-normal text-sm">Cliente possui débitos pendentes?</FormLabel>
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
    

    

