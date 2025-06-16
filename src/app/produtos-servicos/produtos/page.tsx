
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from "next/navigation";
import {
  ProductServiceFormSchema,
  type ProductService,
  type ProductServiceFormValues,
  type ProductServiceCreateData,
  type ProductServiceUpdateData,
} from '@/schemas/productServiceSchema';
import {
  createProductService,
  getAllProductServicesByUserId,
  updateProductService,
  deleteProductService
} from '@/services/productServiceService';

export default function ProdutosServicosPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [allProdutosServicos, setAllProdutosServicos] = useState<ProductService[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductService | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bypassAuth = true;

  const form = useForm<ProductServiceFormValues>({
    resolver: zodResolver(ProductServiceFormSchema),
    defaultValues: {
      nome: "",
      tipo: undefined, // Zod enum for 'Produto' | 'Serviço'
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
    const userIdToQuery = user?.uid || (bypassAuth ? "bypass_user_placeholder" : null);
    if (!userIdToQuery) {
      setAllProdutosServicos([]);
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const fetchedItems = await getAllProductServicesByUserId(userIdToQuery);
      setAllProdutosServicos(fetchedItems);
    } catch (error: any) {
      console.error("Erro ao buscar produtos/serviços:", error);
      toast({ title: "Erro ao buscar dados", description: error.message || "Não foi possível carregar os itens.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    if (!isAuthLoading) {
      fetchProdutosServicos();
    }
  }, [fetchProdutosServicos, isAuthLoading]);

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

  const handleSalvarItem = async (values: ProductServiceFormValues) => {
    const userIdToSave = user?.uid || (bypassAuth ? "bypass_user_placeholder" : null);
    if (!userIdToSave) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const dataForService: ProductServiceCreateData | ProductServiceUpdateData = {
      nome: values.nome,
      tipo: values.tipo,
      descricao: values.descricao,
      valorVenda: values.valorVenda,
      unidade: values.unidade,
      // Conditionally include product-specific fields
      ...(values.tipo === 'Produto' && {
        custoUnitario: values.custoUnitario ?? 0,
        quantidadeEstoque: values.quantidadeEstoque ?? 0,
        estoqueMinimo: values.estoqueMinimo ?? 0,
      }),
      ...(values.tipo === 'Serviço' && { // Ensure these are null for services if schema expects it
        custoUnitario: null,
        quantidadeEstoque: null,
        estoqueMinimo: null,
      }),
    };


    try {
      if (editingItem?.id) {
        await updateProductService(editingItem.id, dataForService as ProductServiceUpdateData);
        toast({ title: "Item Atualizado!", description: `${values.nome} foi atualizado.` });
      } else {
        await createProductService(userIdToSave, dataForService as ProductServiceCreateData);
        toast({ title: "Item Adicionado!", description: `${values.nome} foi cadastrado.` });
      }
      setEditingItem(null);
      setIsModalOpen(false);
      await fetchProdutosServicos();
    } catch (error: any) {
      console.error("Erro ao salvar item:", error);
      toast({ title: "Erro ao salvar", description: error.message || "Não foi possível salvar o item.", variant: "destructive" });
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

  const handleAbrirModalParaEditar = (item: ProductService) => {
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
    const userIdRequester = user?.uid || (bypassAuth ? "bypass_user_placeholder" : null);
    if (!userIdRequester) {
        toast({ title: "Ação não permitida", description: "Usuário não autenticado.", variant: "destructive" });
        return;
    }
    setIsSubmitting(true);
    try {
      await deleteProductService(itemId);
      toast({ title: "Item Excluído!", description: "O item foi removido.", variant: "destructive" });
      await fetchProdutosServicos();
    } catch (error: any) {
      console.error("Erro ao excluir item:", error);
      toast({ title: "Erro ao excluir", description: error.message || "Não foi possível excluir o item.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusEstoque = (item: ProductService): { status: 'OK' | 'Baixo' | 'N/A', variant: 'secondary' | 'destructive' | 'outline' } => {
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

  if (isAuthLoading && !bypassAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }

  if (!user && !bypassAuth) {
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

  if (isLoadingData && (user || bypassAuth)) {
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
                {filteredItems.length === 0 && !isLoadingData && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      {allProdutosServicos.length === 0 ? "Nenhum produto ou serviço cadastrado." : "Nenhum item encontrado para a busca."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
                            form.setValue('custoUnitario', currentValues.custoUnitario ?? 0);
                            form.setValue('quantidadeEstoque', currentValues.quantidadeEstoque ?? 0);
                            form.setValue('estoqueMinimo', currentValues.estoqueMinimo ?? 0);
                        }
                      }}
                      value={field.value}
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
                    <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" min="0" /></FormControl>
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
                        <FormControl><Input type="number" placeholder="0.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value))} step="0.01" min="0" /></FormControl>
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
                          <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} step="1" min="0" /></FormControl>
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
                          <FormControl><Input type="number" placeholder="0" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} step="1" min="0" /></FormControl>
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
