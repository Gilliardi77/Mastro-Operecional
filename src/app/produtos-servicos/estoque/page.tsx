
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, MinusCircle, Edit, Search, Loader2, PackageOpen, AlertTriangle, Package, CalendarIcon, FileText, SquarePlus } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from "next/navigation";
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, runTransaction } from "firebase/firestore";
import { cn } from '@/lib/utils';

interface ProdutoEstoqueFirestore {
  id: string;
  nome: string;
  tipo: 'Produto' | 'Serviço';
  unidade: string;
  valorVenda: number;
  custoUnitario?: number | null;
  quantidadeEstoque?: number | null;
  estoqueMinimo?: number | null;
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
  descricao?: string;
}

interface ProdutoEstoque extends Omit<ProdutoEstoqueFirestore, 'criadoEm' | 'atualizadoEm'> {
  criadoEm: Date;
  atualizadoEm: Date;
}

const movimentacaoSchemaBase = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  quantidade: z.coerce.number().positive("Quantidade deve ser positiva."),
  data: z.date({ required_error: "Data é obrigatória." }),
  observacoes: z.string().optional(),
});

const entradaSchema = movimentacaoSchemaBase.extend({
  custoUnitario: z.coerce.number().nonnegative("Custo deve ser não-negativo.").optional().default(0),
});
type EntradaFormValues = z.infer<typeof entradaSchema>;

const saidaSchema = movimentacaoSchemaBase.extend({
  motivo: z.enum(['Venda', 'Perda', 'Consumo Interno', 'Ajuste'], { required_error: "Motivo é obrigatório." }),
});
type SaidaFormValues = z.infer<typeof saidaSchema>;

const ajusteSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  novaQuantidade: z.coerce.number().nonnegative("Nova quantidade deve ser não-negativa."),
  observacoes: z.string().min(5, "Observação é obrigatória para ajustes manuais (mín. 5 caracteres)."),
});
type AjusteFormValues = z.infer<typeof ajusteSchema>;

const newProductSchema = z.object({
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  descricao: z.string().optional(),
  valorVenda: z.coerce.number().positive({ message: "Valor de venda deve ser positivo." }),
  unidade: z.string().min(1, { message: "Unidade é obrigatória (Ex: UN, KG, HR, M²)." }),
  custoUnitario: z.coerce.number().nonnegative({ message: "Custo Unitário é obrigatório e deve ser não-negativo." }).default(0),
  quantidadeEstoque: z.coerce.number().nonnegative({ message: "Estoque Inicial é obrigatório e deve ser não-negativo." }).default(0),
  estoqueMinimo: z.coerce.number().nonnegative({ message: "Estoque Mínimo é obrigatório e deve ser não-negativo." }).default(0),
});
type NewProductFormValues = z.infer<typeof newProductSchema>;


export default function ControleEstoquePage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [isEntradaModalOpen, setIsEntradaModalOpen] = useState(false);
  const [isSaidaModalOpen, setIsSaidaModalOpen] = useState(false);
  const [isAjusteModalOpen, setIsAjusteModalOpen] = useState(false);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [selectedProductForModal, setSelectedProductForModal] = useState<ProdutoEstoque | null>(null);

  const bypassAuth = true;

  const entradaForm = useForm<EntradaFormValues>({ resolver: zodResolver(entradaSchema), defaultValues: { quantidade: 1, data: new Date(), custoUnitario: 0 } });
  const saidaForm = useForm<SaidaFormValues>({ resolver: zodResolver(saidaSchema), defaultValues: { quantidade: 1, data: new Date() } });
  const ajusteForm = useForm<AjusteFormValues>({ resolver: zodResolver(ajusteSchema), defaultValues: { novaQuantidade: 0 } });
  const newProductForm = useForm<NewProductFormValues>({
    resolver: zodResolver(newProductSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      valorVenda: 0,
      unidade: "UN",
      custoUnitario: 0,
      quantidadeEstoque: 0,
      estoqueMinimo: 0,
    },
  });

  const fetchProdutos = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setProdutos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "produtosServicos"), 
        where("userId", "==", userIdToQuery),
        where("tipo", "==", "Produto"), 
        orderBy("nome", "asc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedProdutos = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ProdutoEstoqueFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          quantidadeEstoque: data.quantidadeEstoque ?? 0,
          estoqueMinimo: data.estoqueMinimo ?? 0,
          custoUnitario: data.custoUnitario ?? 0,
          criadoEm: data.criadoEm.toDate(),
          atualizadoEm: data.atualizadoEm.toDate(),
        } as ProdutoEstoque;
      });
      setProdutos(fetchedProdutos);
    } catch (error: any) {
      console.error("Erro ao buscar produtos para estoque:", error);
      toast({ title: "Erro ao buscar produtos", description: `Não foi possível carregar. ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    if (user || bypassAuth) {
      fetchProdutos();
    }
  }, [fetchProdutos, user, bypassAuth]);

  const openModal = (type: 'entrada' | 'saida' | 'ajuste' | 'newProduct', product?: ProdutoEstoque) => {
    setSelectedProductForModal(product || null);
    if (type === 'entrada') {
      entradaForm.reset({ produtoId: product?.id || "", quantidade: 1, data: new Date(), custoUnitario: product?.custoUnitario || 0, observacoes: "" });
      setIsEntradaModalOpen(true);
    } else if (type === 'saida') {
      saidaForm.reset({ produtoId: product?.id || "", quantidade: 1, data: new Date(), motivo: undefined, observacoes: "" });
      setIsSaidaModalOpen(true);
    } else if (type === 'ajuste') {
      ajusteForm.reset({ produtoId: product?.id || "", novaQuantidade: product?.quantidadeEstoque || 0, observacoes: "" });
      setIsAjusteModalOpen(true);
    } else if (type === 'newProduct') {
      newProductForm.reset({ nome: "", descricao: "", valorVenda: 0, unidade: "UN", custoUnitario: 0, quantidadeEstoque: 0, estoqueMinimo: 0 });
      setIsNewProductModalOpen(true);
    }
  };

  const handleNovaEntrada = async (values: EntradaFormValues) => {
    setIsSubmitting(true);
    try {
      const productRef = doc(db, "produtosServicos", values.produtoId);
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Produto não encontrado.");
        
        const currentData = productDoc.data() as ProdutoEstoqueFirestore;
        const currentStock = currentData.quantidadeEstoque ?? 0;
        const newStock = currentStock + values.quantidade;
        
        transaction.update(productRef, { 
          quantidadeEstoque: newStock,
          custoUnitario: values.custoUnitario, 
          atualizadoEm: Timestamp.now() 
        });
      });
      toast({ title: "Entrada Registrada!", description: `${values.quantidade} unidades adicionadas ao estoque.` });
      fetchProdutos();
      setIsEntradaModalOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao Registrar Entrada", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegistrarSaida = async (values: SaidaFormValues) => {
    setIsSubmitting(true);
    try {
      const productRef = doc(db, "produtosServicos", values.produtoId);
      await runTransaction(db, async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) throw new Error("Produto não encontrado.");

        const currentData = productDoc.data() as ProdutoEstoqueFirestore;
        const currentStock = currentData.quantidadeEstoque ?? 0;
        if (values.quantidade > currentStock) throw new Error("Quantidade de saída maior que estoque atual.");
        
        const newStock = currentStock - values.quantidade;
        transaction.update(productRef, { 
          quantidadeEstoque: newStock, 
          atualizadoEm: Timestamp.now() 
        });
      });
      toast({ title: "Saída Registrada!", description: `${values.quantidade} unidades removidas do estoque.` });
      fetchProdutos();
      setIsSaidaModalOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao Registrar Saída", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAjustarEstoque = async (values: AjusteFormValues) => {
    setIsSubmitting(true);
    try {
      const productRef = doc(db, "produtosServicos", values.produtoId);
      await updateDoc(productRef, {
        quantidadeEstoque: values.novaQuantidade,
        atualizadoEm: Timestamp.now(),
      });
      toast({ title: "Estoque Ajustado!", description: `Estoque atualizado para ${values.novaQuantidade} unidades.` });
      fetchProdutos();
      setIsAjusteModalOpen(false);
    } catch (error: any) {
      toast({ title: "Erro ao Ajustar Estoque", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewProduct = async (data: NewProductFormValues) => {
    if (!user && !bypassAuth) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : "unknown_user");
    const now = Timestamp.now();

    const newProductData = {
      ...data,
      tipo: 'Produto' as 'Produto' | 'Serviço',
      userId: userIdToSave,
      criadoEm: now,
      atualizadoEm: now,
    };

    try {
      await addDoc(collection(db, "produtosServicos"), newProductData);
      toast({ title: "Produto Cadastrado!", description: `${data.nome} foi adicionado ao catálogo e ao estoque.` });
      fetchProdutos();
      setIsNewProductModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar novo produto:", error);
      toast({ title: "Erro ao Salvar Produto", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredProdutos = useMemo(() => 
    produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase())),
    [produtos, searchTerm]
  );

  const totalItensEmEstoque = useMemo(() => 
    produtos.reduce((sum, p) => sum + (p.quantidadeEstoque ?? 0), 0), 
    [produtos]
  );
  const itensBaixoEstoque = useMemo(() => 
    produtos.filter(p => (p.quantidadeEstoque ?? 0) <= (p.estoqueMinimo ?? 0)).length, 
    [produtos]
  );

  if (isAuthLoading && !bypassAuth) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user && !bypassAuth) return <div className="p-4">Acesso negado. Faça login.</div>;
  if (isLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PackageOpen className="h-6 w-6 text-primary" />Controle de Estoque</CardTitle>
          <CardDescription>Gerencie e visualize o estoque de produtos em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Itens (Unidades)</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">{totalItensEmEstoque}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Itens com Baixo Estoque</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold text-destructive">{itensBaixoEstoque}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Entrada</CardTitle>
                <PlusCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">N/A</div><p className="text-xs text-muted-foreground">Placeholder</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última Saída</CardTitle>
                <MinusCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent><div className="text-2xl font-bold">N/A</div><p className="text-xs text-muted-foreground">Placeholder</p></CardContent>
            </Card>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mt-6">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar produto..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
              <Button onClick={() => openModal('newProduct')} variant="default" className="w-full sm:w-auto"><SquarePlus className="mr-2 h-4 w-4" /> Cadastrar Produto</Button>
              <Button onClick={() => openModal('entrada')} className="w-full sm:w-auto"><PlusCircle className="mr-2 h-4 w-4" /> Nova Entrada</Button>
              <Button onClick={() => openModal('saida')} variant="outline" className="w-full sm:w-auto"><MinusCircle className="mr-2 h-4 w-4" /> Registrar Saída</Button>
              <Button onClick={() => openModal('ajuste')} variant="secondary" className="w-full sm:w-auto"><Edit className="mr-2 h-4 w-4" /> Ajustar Estoque</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lista de Produtos em Estoque</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Est. Mínimo</TableHead>
                  <TableHead className="hidden sm:table-cell">Unidade</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Custo (Ref.)</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Últ. Mov.</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProdutos.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="h-24 text-center">Nenhum produto encontrado.</TableCell></TableRow>
                )}
                {filteredProdutos.map(p => (
                  <TableRow key={p.id} className={(p.quantidadeEstoque ?? 0) <= (p.estoqueMinimo ?? 0) ? 'bg-destructive/10' : ''}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-center">{p.quantidadeEstoque ?? 0}</TableCell>
                    <TableCell className="text-center hidden md:table-cell">{p.estoqueMinimo ?? 0}</TableCell>
                    <TableCell className="hidden sm:table-cell">{p.unidade}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">R$ {(p.custoUnitario ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{format(p.atualizadoEm, 'dd/MM/yy')}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openModal('entrada', p)} title="Registrar Entrada"><PlusCircle className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openModal('saida', p)} title="Registrar Saída"><MinusCircle className="h-4 w-4 text-red-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => openModal('ajuste', p)} title="Ajustar Estoque"><Edit className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modal Novo Produto */}
      <Dialog open={isNewProductModalOpen} onOpenChange={(isOpen) => {
          setIsNewProductModalOpen(isOpen);
          if (!isOpen) newProductForm.reset();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Produto</DialogTitle>
            <DialogPrimitiveDescription>Preencha os dados do novo produto para o catálogo e estoque.</DialogPrimitiveDescription>
          </DialogHeader>
          <Form {...newProductForm}>
            <form onSubmit={newProductForm.handleSubmit(handleSaveNewProduct)} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField control={newProductForm.control} name="nome" render={({ field }) => (
                <FormItem><FormLabel>Nome do Produto</FormLabel><FormControl><Input placeholder="Ex: Parafuso Sextavado 1/4" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={newProductForm.control} name="valorVenda" render={({ field }) => (
                <FormItem><FormLabel>Preço de Venda (R$)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" min="0"/></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={newProductForm.control} name="unidade" render={({ field }) => (
                <FormItem><FormLabel>Unidade</FormLabel><FormControl><Input placeholder="UN, KG, Caixa, Peça" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={newProductForm.control} name="custoUnitario" render={({ field }) => (
                <FormItem><FormLabel>Custo Unitário (R$)</FormLabel><FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" min="0"/></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={newProductForm.control} name="quantidadeEstoque" render={({ field }) => (
                  <FormItem><FormLabel>Estoque Inicial</FormLabel><FormControl><Input type="number" placeholder="0" {...field} step="1" min="0"/></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={newProductForm.control} name="estoqueMinimo" render={({ field }) => (
                  <FormItem><FormLabel>Estoque Mínimo</FormLabel><FormControl><Input type="number" placeholder="0" {...field} step="1" min="0"/></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={newProductForm.control} name="descricao" render={({ field }) => (
                <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Textarea placeholder="Detalhes adicionais do produto..." {...field} rows={2} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter className="pt-3">
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Cadastrar Produto</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Nova Entrada */}
      <Dialog open={isEntradaModalOpen} onOpenChange={(isOpen) => {
          setIsEntradaModalOpen(isOpen);
          if (!isOpen) entradaForm.reset();
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Nova Entrada de Estoque</DialogTitle></DialogHeader>
          <Form {...entradaForm}>
            <form onSubmit={entradaForm.handleSubmit(handleNovaEntrada)} className="space-y-4">
              <FormField control={entradaForm.control} name="produtoId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedProductForModal}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={entradaForm.control} name="quantidade" render={({ field }) => (
                <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={entradaForm.control} name="custoUnitario" render={({ field }) => (
                <FormItem><FormLabel>Custo Unitário (R$)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={entradaForm.control} name="data" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data da Entrada</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} /></PopoverContent>
                  </Popover><FormMessage /></FormItem>
              )} />
              <FormField control={entradaForm.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar Entrada</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Saída */}
      <Dialog open={isSaidaModalOpen} onOpenChange={(isOpen) => {
          setIsSaidaModalOpen(isOpen);
          if (!isOpen) saidaForm.reset();
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Saída de Estoque</DialogTitle></DialogHeader>
          <Form {...saidaForm}>
            <form onSubmit={saidaForm.handleSubmit(handleRegistrarSaida)} className="space-y-4">
              <FormField control={saidaForm.control} name="produtoId" render={({ field }) => (
                <FormItem><FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedProductForModal}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger></FormControl>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={saidaForm.control} name="quantidade" render={({ field }) => (
                <FormItem><FormLabel>Quantidade</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={saidaForm.control} name="motivo" render={({ field }) => (
                <FormItem><FormLabel>Motivo da Saída</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {['Venda', 'Perda', 'Consumo Interno', 'Ajuste'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={saidaForm.control} name="data" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Data da Saída</FormLabel>
                  <Popover><PopoverTrigger asChild><FormControl>
                    <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: ptBR }) : <span>Escolha uma data</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus locale={ptBR} /></PopoverContent>
                  </Popover><FormMessage /></FormItem>
              )} />
              <FormField control={saidaForm.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observações (Opcional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Registrar Saída</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajustar Estoque */}
      <Dialog open={isAjusteModalOpen} onOpenChange={(isOpen) => {
          setIsAjusteModalOpen(isOpen);
          if (!isOpen) ajusteForm.reset();
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajustar Estoque Manualmente</DialogTitle></DialogHeader>
          <Form {...ajusteForm}>
            <form onSubmit={ajusteForm.handleSubmit(handleAjustarEstoque)} className="space-y-4">
              <FormField control={ajusteForm.control} name="produtoId" render={({ field }) => (
                <FormItem><FormLabel>Produto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedProductForModal}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger></FormControl>
                    <SelectContent>{produtos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={ajusteForm.control} name="novaQuantidade" render={({ field }) => (
                <FormItem><FormLabel>Nova Quantidade em Estoque</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={ajusteForm.control} name="observacoes" render={({ field }) => (
                <FormItem><FormLabel>Observação (Obrigatória)</FormLabel><FormControl><Textarea {...field} placeholder="Ex: Contagem de inventário, correção de erro..."/></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar Ajuste</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

    </div>
  );
}


    