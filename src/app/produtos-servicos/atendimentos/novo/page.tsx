
/// REFORMULADO E OTIMIZADO ///
"use client";

// Imports agrupados por funcionalidade
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectValue, SelectItem, SelectContent } from "@/components/ui/select";
import { SelectTrigger } from "@/components/ui/SelectTrigger";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogPrimitiveDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAIGuide } from "@/contexts/AIGuideContext";

import { FileText, CalendarIcon, MessageSquare, Mail, Loader2, Trash2, PlusCircle, UserPlus, CreditCard, Printer } from "lucide-react";

// Schemas e Tipagens
import { OrdemServicoFormSchema, type OrdemServicoFormValues, type ItemOSFormValues, type OrdemServicoCreateData, PaymentStatusEnum } from "@/schemas/ordemServicoSchema";
import { type OrdemProducaoCreateData, type OrdemProducaoStatus } from "@/schemas/ordemProducaoSchema";
import { ClientFormSchema, type ClientFormValues as NewClientFormValues, type ClientCreateData, type Client } from "@/schemas/clientSchema";
import type { ProductService } from "@/schemas/productServiceSchema";
import type { LancamentoFinanceiroCreateData } from '@/schemas/lancamentoFinanceiroSchema';
import type { UserProfileData } from "@/schemas/userProfileSchema";

// Services
import { getAllClientsByUserId, createClient } from "@/services/clientService";
import { getAllProductServicesByUserId } from "@/services/productServiceService";
import { createOrdemServico } from "@/services/ordemServicoService";
import { createOrdemProducao } from "@/services/ordemProducaoService";
import { createLancamentoFinanceiro } from "@/services/lancamentoFinanceiroService";
import { getUserProfile } from "@/services/userProfileService";


// Constantes
const MANUAL_ITEM_PLACEHOLDER_VALUE = "manual_placeholder";

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "transferencia_bancaria", label: "Transferência Bancária" },
  { value: "outro", label: "Outro" },
];


interface LastSavedOsDataType extends Omit<OrdemServicoFormValues, 'itens'> {
  numeroOS?: string;
  clienteNomeFinal?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  itensSalvos: Array<Omit<ItemOSFormValues, 'idTemp'>>;
  createdAt?: Date;
  userProfile?: UserProfileData | null;
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
  const { user, isAuthenticating } = useAuth();
  const { updateAICurrentPageContext } = useAIGuide();

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/produtos-servicos/atendimentos/novo');
    }
  }, [user, isAuthenticating, router]);
  
  const osForm = useForm<OrdemServicoFormValues>({
    resolver: zodResolver(OrdemServicoFormSchema),
    defaultValues: {
      clienteId: "avulso",
      clienteNome: "Cliente Avulso",
      itens: [],
      valorTotalOS: 0,
      valorAdiantado: 0,
      formaPagamentoAdiantamento: undefined,
      observacoes: "",
      dataEntrega: undefined,
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: osForm.control,
    name: "itens",
  });

  const watchedItens = osForm.watch("itens");
  const watchedValorAdiantado = osForm.watch("valorAdiantado");

  const valorTotalCalculado = watchedItens.reduce((sum, item) => {
    const itemTotal = (item.quantidade || 0) * (item.valorUnitario || 0);
    return sum + itemTotal;
  }, 0);

  useEffect(() => {
    if (valorTotalCalculado !== osForm.getValues('valorTotalOS')) {
        osForm.setValue('valorTotalOS', valorTotalCalculado, { shouldValidate: true });
    }
  }, [valorTotalCalculado, osForm]);

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
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [isLoadingClients, setIsLoadingClients] = useState(true);
  const [isLoadingCatalogo, setIsLoadingCatalogo] = useState(true);
  const [isLoadingUserProfile, setIsLoadingUserProfile] = useState(true);
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  
  const [isInitialPrefillComplete, setIsInitialPrefillComplete] = useState(false);
  const searchParamsAppliedRef = useRef(false);
  const prevClienteIdRef = useRef<string | undefined>(osForm.getValues('clienteId'));


  // Effect 1: Fetch initial data
  useEffect(() => {
    if (!user) return;
    
    const userIdToQuery = user.uid;

    setIsLoadingClients(true);
    setIsLoadingCatalogo(true);
    setIsLoadingUserProfile(true);

    Promise.all([
      getAllClientsByUserId(userIdToQuery),
      getAllProductServicesByUserId(userIdToQuery, "nome", "asc"),
      getUserProfile(userIdToQuery),
    ]).then(([fetchedClients, fetchedCatalogoItens, fetchedUserProfile]) => {
      setClients(fetchedClients);
      setCatalogoItens(fetchedCatalogoItens);
      setUserProfile(fetchedUserProfile);
    }).catch((err: any) => {
      console.error("Erro ao carregar dados iniciais (clientes/catálogo/perfil):", err);
      toast({ title: "Erro ao carregar dados", description: `Não foi possível carregar os dados da página. Detalhe: ${err.message}`, variant: "destructive", duration: 7000 });
    }).finally(() => {
      setIsLoadingClients(false);
      setIsLoadingCatalogo(false);
      setIsLoadingUserProfile(false);
    });
  }, [user, toast]);


  // Effect 2: Prefill form from searchParams ONCE after data is loaded
  useEffect(() => {
    if (isLoadingClients || isLoadingCatalogo || searchParamsAppliedRef.current) {
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
    
    const baseValues = osForm.formState.defaultValues || {};
    if (shouldApplyPrefill) {
      osForm.reset({ ...baseValues, ...prefillValues });
    } else {
      osForm.reset(baseValues); // Reset to defaults if no prefill
    }
    
    searchParamsAppliedRef.current = true;
    setIsInitialPrefillComplete(true); 
    setLastSavedOsData(null);
    prevClienteIdRef.current = osForm.getValues('clienteId'); 
  }, [searchParams, clients, catalogoItens, osForm, isLoadingClients, isLoadingCatalogo, setIsInitialPrefillComplete]);


  // Effect 3: Sync clienteNome when clienteId (dropdown) changes, AFTER initial prefill is complete
  const watchedClienteId = osForm.watch('clienteId');
  useEffect(() => {
    if (!isInitialPrefillComplete || isLoadingClients || watchedClienteId === prevClienteIdRef.current) {
      if (watchedClienteId !== prevClienteIdRef.current) {
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
      if (currentFormClienteNome !== defaultAvulsoName) {
        const previousIdWasSpecificClient = prevClienteIdRef.current && prevClienteIdRef.current !== "avulso";
        if (previousIdWasSpecificClient || currentFormClienteNome === "") {
          osForm.setValue('clienteNome', defaultAvulsoName, { shouldValidate: true, shouldDirty: true });
        }
      }
    }
    prevClienteIdRef.current = watchedClienteId; 
  }, [watchedClienteId, clients, osForm, isInitialPrefillComplete, isLoadingClients]);


  // Effect 4: Update AI Guide Context with form snapshot
  const formValuesForSnapshot = osForm.watch();
  const formSnapshot = JSON.stringify(formValuesForSnapshot);

  useEffect(() => {
    if (isInitialPrefillComplete && !isLoadingClients && !isLoadingCatalogo) { 
        updateAICurrentPageContext({
            pageName: "Nova Ordem de Serviço",
            formSnapshotJSON: formSnapshot,
        });
    }
  }, [formSnapshot, updateAICurrentPageContext, isInitialPrefillComplete, isLoadingClients, isLoadingCatalogo]);


  // Effect 5: Event listener for AI form fill
  useEffect(() => {
    const handleAiFormFill = (event: Event) => {
      const customEvent = event as CustomEvent<AIFillFormEventPayload>;
      const { detail } = customEvent;

      if (detail.formName === "ordemServicoForm") {
        const generalFieldNames: Array<FieldPath<OrdemServicoFormValues>> = [
          "clienteId", "clienteNome", "valorAdiantado", "formaPagamentoAdiantamento", "dataEntrega", "observacoes", "valorTotalOS"
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
    if (!user?.uid) {
      toast({ title: "Ação não permitida", description: "Você precisa estar logado para salvar uma Ordem de Serviço.", variant: "destructive" });
      return;
    }
    const uid = user.uid;

    setIsSaving(true);
    setLastSavedOsData(null);
    
    const selectedClient = data.clienteId && data.clienteId !== "avulso" ? clients.find(c => c.id === data.clienteId) : null;
    const nomeClienteFinal = selectedClient ? selectedClient.nome : (data.clienteNome || "Cliente Avulso");

    const itensParaSalvar = data.itens.map(({ produtoServicoId, nome, quantidade, valorUnitario, tipo }) => ({
      produtoServicoId: (produtoServicoId && produtoServicoId !== MANUAL_ITEM_PLACEHOLDER_VALUE) ? produtoServicoId : null,
      nome, quantidade, valorUnitario, tipo
    }));
    
    const valorTotalFinal = itensParaSalvar.reduce(
      (acc, item) => acc + (item.quantidade * item.valorUnitario), 0
    );


    let statusPagamentoFinal: PaymentStatusEnum = PaymentStatusEnum.Enum.Pendente;
    let valorPagoTotalFinal = data.valorAdiantado || 0;
    let dataPrimeiroPagamentoFinal: Date | null = null;
    let formaPrimeiroPagamentoFinal: string | null = null;

    if (data.valorAdiantado && data.valorAdiantado > 0) {
      if (data.valorAdiantado >= valorTotalFinal ) {
        statusPagamentoFinal = PaymentStatusEnum.Enum['Pago Total'];
      } else {
        statusPagamentoFinal = PaymentStatusEnum.Enum['Pago Parcial'];
      }
      dataPrimeiroPagamentoFinal = new Date();
      formaPrimeiroPagamentoFinal = data.formaPagamentoAdiantamento || null;
    }


    const osDataToCreate: OrdemServicoCreateData = {
      clienteId: data.clienteId && data.clienteId !== "avulso" ? data.clienteId : null,
      clienteNome: nomeClienteFinal,
      itens: itensParaSalvar,
      valorTotal: valorTotalFinal,
      valorAdiantado: data.valorAdiantado || 0,
      dataEntrega: data.dataEntrega, 
      observacoes: data.observacoes || "",
      // Campos de pagamento inicial
      statusPagamento: statusPagamentoFinal,
      valorPagoTotal: valorPagoTotalFinal,
      dataPrimeiroPagamento: dataPrimeiroPagamentoFinal,
      formaPrimeiroPagamento: formaPrimeiroPagamentoFinal,
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

      if (data.valorAdiantado && data.valorAdiantado > 0 && data.formaPagamentoAdiantamento) {
        const lancamentoAdiantamentoData: LancamentoFinanceiroCreateData = {
          titulo: `Adiantamento OS #${osDoc.numeroOS.substring(0,6)}`,
          valor: data.valorAdiantado,
          tipo: 'receita',
          data: new Date(),
          categoria: "Adiantamento OS",
          status: 'recebido',
          descricao: `Adiantamento para OS de ${nomeClienteFinal}.`,
          referenciaOSId: osDoc.id,
          formaPagamento: data.formaPagamentoAdiantamento,
        };
        await createLancamentoFinanceiro(uid, lancamentoAdiantamentoData);
        toast({ title: "Adiantamento Registrado", description: `Lançamento financeiro para o adiantamento de R$ ${data.valorAdiantado.toFixed(2)} criado.` });
      }


      toast({ title: "OS Criada", description: `OS #${osDoc.numeroOS.substring(0, 6)}... salva e OP criada.` });
      setLastSavedOsData({
        ...data,
        numeroOS: osDoc.numeroOS, 
        clienteNomeFinal: nomeClienteFinal,
        clienteTelefone: selectedClient?.telefone,
        clienteEmail: selectedClient?.email,
        itensSalvos: itensParaSalvar,
        createdAt: osDoc.createdAt,
        userProfile: userProfile,
      });
      setIsPrintModalOpen(true);
      osForm.reset({ 
        clienteId: "avulso", 
        clienteNome: "Cliente Avulso", 
        itens: [], 
        valorTotalOS: 0, 
        valorAdiantado: 0, 
        formaPagamentoAdiantamento: undefined,
        observacoes: "", 
        dataEntrega: undefined 
      });
      searchParamsAppliedRef.current = false;
      setIsInitialPrefillComplete(false); 
      prevClienteIdRef.current = "avulso";
    } catch (error: any) {
      toast({ title: "Erro ao Salvar OS", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  async function onSaveNewClient(data: NewClientFormValues) {
    if (!user?.uid) {
      toast({ title: "Ação não permitida", description: "Você precisa estar logado para salvar um novo cliente.", variant: "destructive" });
      return;
    }
    const userIdToSave = user.uid;

    setIsSavingNewClient(true);
        
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
      prevClienteIdRef.current = clienteCriado.id; 
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

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const canSendActions = (!!lastSavedOsData && !!lastSavedOsData.dataEntrega) || (osForm.formState.isValid && (osForm.formState.isDirty || Object.keys(osForm.formState.touchedFields).length > 0) && !!osForm.getValues('dataEntrega'));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <CardTitle>Nova Ordem de Serviço</CardTitle>
              <CardDescription>Preencha os dados para criar uma nova OS. Adiantamentos geram lançamentos financeiros.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(isLoadingClients || isLoadingCatalogo || isLoadingUserProfile) && !isInitialPrefillComplete && (
             <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando dados do formulário...</p></div>
          )}
          {(!isLoadingClients && !isLoadingCatalogo && !isLoadingUserProfile) && (
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
                                      <FormControl>
                                        <SelectTrigger> 
                                          <SelectValue placeholder={isLoadingCatalogo ? "Carregando..." : "Selecione ou digite abaixo"} />
                                        </SelectTrigger>
                                      </FormControl>
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
                          <FormLabel>Valor Total da OS (R$)</FormLabel>
                          <FormControl><Input type="number" placeholder="0.00" {...field} value={field.value || 0} readOnly className="bg-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0" /></FormControl>
                          <FormDescription>Este valor é calculado automaticamente com base nos itens adicionados.</FormDescription>
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
                
                {watchedValorAdiantado !== undefined && watchedValorAdiantado > 0 && (
                  <FormField
                    control={osForm.control}
                    name="formaPagamentoAdiantamento"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-1"><CreditCard className="h-4 w-4 text-muted-foreground"/> Forma de Pagamento do Adiantamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a forma de pagamento do adiantamento" />
                            </SelectTrigger>
                          </FormControl>
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
                )}


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
                            required
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
      
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="max-w-3xl print:max-w-full print:shadow-none print:border-0">
            <DialogHeader className="print:hidden">
                <DialogTitle>Ordem de Serviço Gerada</DialogTitle>
                <DialogPrimitiveDescription>
                    Use esta tela para imprimir ou compartilhar a OS com o cliente.
                </DialogPrimitiveDescription>
            </DialogHeader>
            {lastSavedOsData && (
            <div id="printable-os" className="space-y-6 p-2 print:p-0">
                <div className="flex justify-between items-start pb-4 border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-primary">{lastSavedOsData.userProfile?.companyName || 'Sua Empresa Aqui'}</h2>
                        <p className="text-xs text-muted-foreground">{lastSavedOsData.userProfile?.businessType || 'Ramo de Atividade'}</p>
                        <p className="text-xs text-muted-foreground">
                            {lastSavedOsData.userProfile?.companyEmail || 'seuemail@empresa.com'}
                            {lastSavedOsData.userProfile?.companyPhone && ` | ${lastSavedOsData.userProfile.companyPhone}`}
                        </p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-lg font-bold">ORDEM DE SERVIÇO</h3>
                        <p className="text-sm">Nº: <span className="font-mono">{lastSavedOsData.numeroOS?.substring(0, 8)}...</span></p>
                        <p className="text-sm">Data: <span className="font-mono">{format(lastSavedOsData.createdAt || new Date(), "dd/MM/yyyy")}</span></p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold text-muted-foreground">CLIENTE:</h4>
                        <p className="font-bold">{lastSavedOsData.clienteNomeFinal}</p>
                        <p className="text-sm">{lastSavedOsData.clienteEmail}</p>
                        <p className="text-sm">{lastSavedOsData.clienteTelefone}</p>
                    </div>
                    <div className="text-right">
                        <h4 className="font-semibold text-muted-foreground">DATA DE ENTREGA PREVISTA:</h4>
                        <p className="font-bold">{format(lastSavedOsData.dataEntrega || new Date(), "dd/MM/yyyy")}</p>
                    </div>
                </div>
                
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[60%]">Descrição do Item/Serviço</TableHead>
                                <TableHead className="text-center">Qtd.</TableHead>
                                <TableHead className="text-right">Preço Unit.</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lastSavedOsData.itensSalvos.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{item.nome}</TableCell>
                                    <TableCell className="text-center">{item.quantidade}</TableCell>
                                    <TableCell className="text-right">R$ {item.valorUnitario.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">R$ {(item.quantidade * item.valorUnitario).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">R$ {lastSavedOsData.valorTotalOS.toFixed(2)}</span>
                        </div>
                        {lastSavedOsData.valorAdiantado > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Adiantamento</span>
                            <span className="font-medium">- R$ {lastSavedOsData.valorAdiantado.toFixed(2)}</span>
                        </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-lg font-bold">
                            <span>Valor a Pagar</span>
                            <span>R$ {(lastSavedOsData.valorTotalOS - (lastSavedOsData.valorAdiantado || 0)).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                
                {lastSavedOsData.observacoes && (
                <div className="pt-4 border-t">
                    <h4 className="font-semibold text-muted-foreground">Observações:</h4>
                    <p className="text-sm whitespace-pre-wrap">{lastSavedOsData.observacoes}</p>
                </div>
                )}
            </div>
            )}
            <DialogFooter className="print:hidden">
                <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>Fechar</Button>
                <Button onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" /> Imprimir / Salvar PDF</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

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
