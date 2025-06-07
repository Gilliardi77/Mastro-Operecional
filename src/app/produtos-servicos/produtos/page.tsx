
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, Edit2, Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Label } from '@/components/ui/label';
import { db } from "@/lib/firebase";
import { useAuth } from '@/components/auth/auth-provider'; 
import { useRouter } from "next/navigation"; // Adicionado useRouter
import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc } from "firebase/firestore";

const itemSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  tipo: z.enum(['Produto', 'Serviço'], { required_error: "Tipo é obrigatório." }),
  descricao: z.string().optional(),
  valorVenda: z.coerce.number().positive({ message: "Valor de venda deve ser positivo." }),
  unidade: z.string().min(1, { message: "Unidade é obrigatória (Ex: UN, KG, HR, M²)." }),
  custoUnitario: z.coerce.number().optional(),
  quantidadeEstoque: z.coerce.number().optional(),
  estoqueMinimo: z.coerce.number().optional(),
}).refine(data => {
  if (data.tipo === 'Produto') {
    return data.custoUnitario !== undefined && data.custoUnitario >= 0 &&
           data.quantidadeEstoque !== undefined && data.quantidadeEstoque >= 0 &&
           data.estoqueMinimo !== undefined && data.estoqueMinimo >= 0;
  }
  return true;
}, {
  message: "Para produtos, Custo, Estoque Atual e Estoque Mínimo são obrigatórios e devem ser não-negativos.",
  path: ['custoUnitario'], 
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ProdutoServicoFirestore {
  id: string; 
  nome: string;
  tipo: 'Produto' | 'Serviço';
  descricao?: string;
  valorVenda: number;
  unidade: string;
  custoUnitario?: number | null;
  quantidadeEstoque?: number | null;
  estoqueMinimo?: number | null;
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface ProdutoServico extends Omit<ProdutoServicoFirestore, 'criadoEm' | 'atualizadoEm' | 'custoUnitario' | 'quantidadeEstoque' | 'estoqueMinimo'> {
  criadoEm: Date;
  atualizadoEm: Date;
  custoUnitario?: number | null;
  quantidadeEstoque?: number | null;
  estoqueMinimo?: number | null;
}


export default function ProdutosServicosPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter(); // Instanciado useRouter
  const [allProdutosServicos, setAllProdutosServicos] = useState<ProdutoServico[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProdutoServico | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bypassAuth = true; // Forçar bypass para testes

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      nome: "",
      tipo: undefined,
      descricao: "",
      valorVenda: 0,
      unidade: "",
      custoUnitario: 0,
      quantidadeEstoque: 0,
      estoqueMinimo: 0,
    },
  });

  const tipoSelecionado = form.watch('tipo');

  const fetchProdutosServicos = useCallback(async () => {
    if (!user && !bypassAuth) {
      setAllProdutosServicos([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userIdToQuery = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
      if (!userIdToQuery) { 
        setAllProdutosServicos([]);
        setIsLoading(false);
        return;
      }
      const q = query(collection(db, "produtosServicos"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const querySnapshot = await getDocs(q);
      const docsData = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ProdutoServicoFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          criadoEm: data.criadoEm.toDate(),
          atualizadoEm: data.atualizadoEm.toDate(),
        } as ProdutoServico;
      });
      setAllProdutosServicos(docsData);
    } catch (error) {
      console.error("Erro ao buscar produtos/serviços:", error);
      toast({ title: "Erro ao buscar dados", description: "Não foi possível carregar os itens.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    if (user || bypassAuth) {
      fetchProdutosServicos();
    }
  }, [fetchProdutosServicos, user, bypassAuth]);


  useEffect(() => {
    if (editingItem) {
      form.reset({
        id: editingItem.id,
        nome: editingItem.nome,
        tipo: editingItem.tipo,
        descricao: editingItem.descricao || "",
        valorVenda: editingItem.valorVenda,
        unidade: editingItem.unidade,
        custoUnitario: editingItem.tipo === 'Produto' ? (editingItem.custoUnitario ?? 0) : 0,
        quantidadeEstoque: editingItem.tipo === 'Produto' ? (editingItem.quantidadeEstoque ?? 0) : 0,
        estoqueMinimo: editingItem.tipo === 'Produto' ? (editingItem.estoqueMinimo ?? 0) : 0,
      });
    } else {
      form.reset({
        nome: "",
        tipo: undefined,
        descricao: "",
        valorVenda: 0,
        unidade: "",
        custoUnitario: 0,
        quantidadeEstoque: 0,
        estoqueMinimo: 0,
      });
    }
  }, [editingItem, form, isModalOpen]);


  const handleSalvarItem = async (data: ItemFormValues) => {
    if (!user && !bypassAuth) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : "unknown_user");
     
    const now = Timestamp.now();

    const itemDataForFirestore: Omit<ProdutoServicoFirestore, 'id' | 'criadoEm'> = {
      nome: data.nome,
      tipo: data.tipo,
      descricao: data.descricao || "",
      valorVenda: data.valorVenda,
      unidade: data.unidade,
      userId: userIdToSave,
      atualizadoEm: now,
      custoUnitario: null,
      quantidadeEstoque: null,
      estoqueMinimo: null,
    };

    if (data.tipo === 'Produto') {
      itemDataForFirestore.custoUnitario = data.custoUnitario ?? 0;
      itemDataForFirestore.quantidadeEstoque = data.quantidadeEstoque ?? 0;
      itemDataForFirestore.estoqueMinimo = data.estoqueMinimo ?? 0;
    }

    try {
      if (editingItem?.id) { 
        const docRef = doc(db, "produtosServicos", editingItem.id);
        await updateDoc(docRef, itemDataForFirestore); 
        toast({ title: "Item Atualizado!", description: `${data.nome} foi atualizado.` });
      } else {
        await addDoc(collection(db, "produtosServicos"), {
          ...itemDataForFirestore, 
          criadoEm: now,
        });
        toast({ title: "Item Adicionado!", description: `${data.nome} foi cadastrado.` });
      }
      setEditingItem(null);
      setIsModalOpen(false);
      await fetchProdutosServicos();
    } catch (error) {
      console.error("Erro ao salvar item:", error);
      toast({ title: "Erro ao salvar", description: `Não foi possível salvar o item. Detalhe: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbrirModalParaNovo = () => {
    setEditingItem(null);
    form.reset({ 
        nome: "", tipo: undefined, descricao: "", valorVenda: 0, unidade: "",
        custoUnitario: 0, quantidadeEstoque: 0, estoqueMinimo: 0,
    });
    setIsModalOpen(true);
  };
  
  const handleAbrirModalParaEditar = (item: ProdutoServico) => {
    setEditingItem(item);
     form.reset({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        descricao: item.descricao || "",
        valorVenda: item.valorVenda,
        unidade: item.unidade,
        custoUnitario: item.tipo === 'Produto' ? (item.custoUnitario ?? 0) : 0,
        quantidadeEstoque: item.tipo === 'Produto' ? (item.quantidadeEstoque ?? 0) : 0,
        estoqueMinimo: item.tipo === 'Produto' ? (item.estoqueMinimo ?? 0) : 0,
      });
    setIsModalOpen(true);
  };

  const handleExcluirItem = async (itemId: string) => {
    if (!user && !bypassAuth) return;
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "produtosServicos", itemId));
      toast({ title: "Item Excluído!", description: "O item foi removido.", variant: "destructive" });
      await fetchProdutosServicos();
    } catch (error) {
      console.error("Erro ao excluir item:", error);
      toast({ title: "Erro ao excluir", description: "Não foi possível excluir o item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusEstoque = (item: ProdutoServico): { status: 'OK' | 'Baixo' | 'N/A', variant: 'secondary' | 'destructive' | 'outline' } => {
    if (item.tipo === 'Serviço' || item.quantidadeEstoque === undefined || item.estoqueMinimo === undefined || item.quantidadeEstoque === null || item.estoqueMinimo === null) {
      return { status: 'N/A', variant: 'outline' };
    }
    if (item.quantidadeEstoque <= item.estoqueMinimo) {
      return { status: 'Baixo', variant: 'destructive' };
    }
    return { status: 'OK', variant: 'secondary' };
  };

  const filteredItems = allProdutosServicos.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.descricao && item.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const showContent = !isLoading || (bypassAuth && allProdutosServicos.length > 0);

  if (isAuthLoading) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }
  
  if (!bypassAuth && !user) {
     return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para gerenciar produtos e serviços.</p>
          <Button onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading && (user || bypassAuth)) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando itens...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Produtos e Serviços</CardTitle>
              <CardDescription>Cadastre e gerencie seus produtos, serviços e respectivos estoques (para produtos).</CardDescription>
            </div>
            <Button onClick={handleAbrirModalParaNovo}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar por nome ou descrição..." 
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {showContent && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead>Valor Venda</TableHead>
                    <TableHead className="hidden md:table-cell">Unidade</TableHead>
                    <TableHead className="hidden lg:table-cell">Estoque (Atual/Mínimo)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const infoEstoque = getStatusEstoque(item);
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.nome}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={item.tipo === "Serviço" ? "secondary" : "outline"}>
                            {item.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell>R$ {item.valorVenda.toFixed(2)}</TableCell>
                        <TableCell className="hidden md:table-cell">{item.unidade}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {item.tipo === 'Produto' ? (
                            <Badge variant={infoEstoque.variant} className="gap-1">
                              {infoEstoque.status === 'Baixo' && <AlertTriangle className="h-3 w-3" />}
                              {item.quantidadeEstoque ?? 'N/A'} / {item.estoqueMinimo ?? 'N/A'} ({infoEstoque.status})
                            </Badge>
                          ) : (
                            <Badge variant="outline">N/A</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAbrirModalParaEditar(item)} disabled={isSubmitting}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleExcluirItem(item.id)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredItems.length === 0 && !isLoading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        {allProdutosServicos.length === 0 ? "Nenhum produto ou serviço cadastrado." : "Nenhum item encontrado para a busca."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen) {
            setEditingItem(null);
            form.reset({
                nome: "", tipo: undefined, descricao: "", valorVenda: 0, unidade: "",
                custoUnitario: 0, quantidadeEstoque: 0, estoqueMinimo: 0,
            });
        }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Adicionar Novo Item"}</DialogTitle>
            <DialogDescription>
              {editingItem ? "Atualize os detalhes do produto ou serviço." : "Preencha os dados para cadastrar um novo produto ou serviço."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSalvarItem)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Item</FormLabel>
                    <FormControl><Input placeholder="Ex: Camiseta Branca, Consultoria Inicial" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select 
                        onValueChange={(value) => {
                            field.onChange(value as 'Produto' | 'Serviço'); 
                            if (value === 'Serviço') {
                                form.setValue('custoUnitario', undefined); 
                                form.setValue('quantidadeEstoque', undefined);
                                form.setValue('estoqueMinimo', undefined);
                            } else if (value === 'Produto') {
                                const currentValues = form.getValues();
                                const editingProduct = editingItem && editingItem.tipo === 'Produto' ? editingItem : null;
                                form.setValue('custoUnitario', editingProduct?.custoUnitario ?? currentValues.custoUnitario ?? 0);
                                form.setValue('quantidadeEstoque', editingProduct?.quantidadeEstoque ?? currentValues.quantidadeEstoque ?? 0);
                                form.setValue('estoqueMinimo', editingProduct?.estoqueMinimo ?? currentValues.estoqueMinimo ?? 0);
                            }
                        }} 
                        value={field.value || ""}
                    >
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Produto">Produto</SelectItem>
                        <SelectItem value="Serviço">Serviço</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="valorVenda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço de Venda (R$)</FormLabel>
                    <FormControl><Input type="number" placeholder="0,00" {...field} step="0.01" min="0"/></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade</FormLabel>
                    <FormControl><Input placeholder="Ex: UN, KG, HR, M², Peça" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {tipoSelecionado === 'Produto' && (
                <>
                  <FormField
                    control={form.control}
                    name="custoUnitario"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custo Unitário (R$) (Produto)</FormLabel>
                        <FormControl><Input type="number" placeholder="0,00" {...field} step="0.01" min="0"/></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="quantidadeEstoque"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estoque Atual (Produto)</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} step="1" min="0"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="estoqueMinimo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estoque Mínimo (Produto)</FormLabel>
                          <FormControl><Input type="number" placeholder="0" {...field} step="1" min="0"/></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Detalhes adicionais sobre o item..." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? "Salvar Alterações" : "Adicionar Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
    

    