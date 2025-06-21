
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, ShoppingCart, Trash2, Search, UserPlus, ScanLine, Edit, FileText, Loader2, PackageSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from '@/components/auth/auth-provider';
import { getFirebaseInstances } from '@/lib/firebase'; 
import { collection, addDoc, Timestamp, doc, runTransaction, type Firestore } from "firebase/firestore"; 
import { getAllClientsByUserId } from '@/services/clientService';
import type { Client } from '@/schemas/clientSchema';
import { getAllProductServicesByUserId } from '@/services/productServiceService'; 
import type { ProductService } from '@/schemas/productServiceSchema'; 
import CashBoxGuard from "@/components/cash-box/CashBoxGuard";

interface CartItem {
  id: string;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  manual?: boolean;
  imageHint?: string; 
  productId?: string;
  productType?: "Serviço" | "Produto"; 
}

const paymentMethods = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao_credito", label: "Cartão de Crédito" },
  { value: "cartao_debito", label: "Cartão de Débito" },
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto (Prazo)" },
  { value: "transferencia", label: "Transferência Bancária" },
  { value: "outro", label: "Outro" },
];

export default function BalcaoPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("avulso");
  const [paymentMethod, setPaymentMethod] = useState<string>(paymentMethods[0].value);
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);

  const [manualItemName, setManualItemName] = useState("");
  const [manualItemQuantity, setManualItemQuantity] = useState(1);
  const [manualItemPrice, setManualItemPrice] = useState(0);

  const [totalVenda, setTotalVenda] = useState(0);
  const [availableProducts, setAvailableProducts] = useState<ProductService[]>([]); 
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchTermProducts, setSearchTermProducts] = useState("");

  const [fetchedClients, setFetchedClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(true);


  const bypassAuth = true; 

  const fetchAvailableProducts = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setAvailableProducts([]);
      setIsLoadingProducts(false);
      return;
    }
    setIsLoadingProducts(true);
    try {
      const fetchedItems = await getAllProductServicesByUserId(userIdToQuery, 'nome', 'asc');
      setAvailableProducts(fetchedItems);
    } catch (error) {
      console.error("Erro ao buscar produtos/serviços via service:", error);
      toast({ title: "Erro ao buscar itens", description: "Não foi possível carregar os produtos e serviços.", variant: "destructive" });
    } finally {
      setIsLoadingProducts(false);
    }
  }, [user, bypassAuth, toast]);

  const fetchClients = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setFetchedClients([]);
      setIsLoadingClients(false);
      return;
    }
    setIsLoadingClients(true);
    try {
      const clientsData = await getAllClientsByUserId(userIdToQuery);
      setFetchedClients(clientsData);
    } catch (error: any) {
      console.error("Erro ao buscar clientes via service:", error);
      toast({ title: "Erro ao buscar clientes", description: error.message || "Não foi possível carregar os dados dos clientes.", variant: "destructive" });
    } finally {
      setIsLoadingClients(false);
    }
  }, [user, bypassAuth, toast]);


  useEffect(() => {
    if (user || bypassAuth) {
        fetchAvailableProducts();
        fetchClients();
    }
  }, [fetchAvailableProducts, fetchClients, user, bypassAuth]);


  useEffect(() => {
    const newTotal = cartItems.reduce((acc, item) => acc + item.valorTotal, 0);
    setTotalVenda(newTotal);
  }, [cartItems]);

  const addToCart = (product: ProductService) => { 
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(item => item.productId === product.id && !item.manual);
      if (existingItem) {
        return prevItems.map(item =>
          item.productId === product.id
            ? { ...item, quantidade: item.quantidade + 1, valorTotal: (item.quantidade + 1) * item.valorUnitario }
            : item
        );
      } else {
        return [
          ...prevItems,
          {
            id: `cart-${product.id}-${Date.now()}`,
            productId: product.id,
            nome: product.nome,
            quantidade: 1,
            valorUnitario: product.valorVenda,
            valorTotal: product.valorVenda,
            manual: false,
            imageHint: product.nome.toLowerCase().split(" ").slice(0,2).join(" "), 
            productType: product.tipo, 
          },
        ];
      }
    });
    toast({ title: "Item adicionado", description: `${product.nome} adicionado ao carrinho.` });
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prevItems) => prevItems.filter(item => item.id !== itemId));
    toast({ title: "Item removido", description: `Item removido do carrinho.` });
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName || manualItemQuantity <= 0 || manualItemPrice <= 0) {
      toast({
        title: "Erro",
        description: "Preencha nome, quantidade e preço válidos para o item manual.",
        variant: "destructive",
      });
      return;
    }
    const newItem: CartItem = {
      id: `manual-${Date.now()}`,
      nome: manualItemName,
      quantidade: manualItemQuantity,
      valorUnitario: manualItemPrice,
      valorTotal: manualItemQuantity * manualItemPrice,
      manual: true,
      imageHint: manualItemName.toLowerCase().split(" ").slice(0,2).join(" "),
    };
    setCartItems((prevItems) => [...prevItems, newItem]);
    toast({ title: "Item manual adicionado", description: `${manualItemName} adicionado ao carrinho.` });
    setManualItemName("");
    setManualItemQuantity(1);
    setManualItemPrice(0);
    setIsManualItemModalOpen(false);
  };

  const handleFinalizarVenda = async () => {
    let userIdToSave = user ? user.uid : null;
    if (bypassAuth && !user) {
        userIdToSave = "bypass_user_placeholder";
    }

    if (!userIdToSave) {
      toast({ title: "Erro de Autenticação", description: "Usuário não identificado. Faça login para registrar a venda.", variant: "destructive" });
      setIsFinalizingSale(false);
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho antes de finalizar a venda.",
        variant: "destructive",
      });
      return;
    }
    setIsFinalizingSale(true);

    const { db: dbInstance } = getFirebaseInstances();
    if (!dbInstance) {
      toast({ title: "Erro de Firebase", description: "DB não disponível para finalizar venda.", variant: "destructive" });
      setIsFinalizingSale(false);
      return;
    }

    try {
      const dataVendaDate = new Date();
      const clienteSelecionado = fetchedClients.find(c => c.id === selectedClient);
      const clienteNome = selectedClient === "avulso" ? "Cliente Avulso" : clienteSelecionado?.nome || "Não identificado";

      const vendaData = {
        userId: userIdToSave,
        clienteId: selectedClient === "avulso" ? null : selectedClient,
        clienteNome: clienteNome,
        itens: cartItems.map(item => ({
            productId: item.productId || null,
            nome: item.nome,
            quantidade: item.quantidade,
            valorUnitario: item.valorUnitario,
            valorTotal: item.valorTotal,
            manual: item.manual || false,
            productType: item.productType || null, 
        })),
        totalVenda: totalVenda,
        formaPagamento: paymentMethod,
        dataVenda: dataVendaDate,
        status: "Concluída",
      };
      const vendaDocRef = await addDoc(collection(dbInstance, "vendas"), {
          ...vendaData, 
          criadoEm: Timestamp.fromDate(dataVendaDate),
          atualizadoEm: Timestamp.fromDate(dataVendaDate)
      });


      const lancamentoReceita = {
        userId: userIdToSave,
        titulo: `Venda Balcão #${vendaDocRef.id.substring(0,6)} - ${clienteNome}`,
        valor: totalVenda,
        tipo: 'receita' as 'receita' | 'despesa',
        data: dataVendaDate,
        categoria: "Venda Balcão",
        status: paymentMethod === "boleto" ? 'pendente' : 'recebido' as 'pago' | 'recebido' | 'pendente',
        descricao: `Venda realizada no balcão. Cliente: ${clienteNome}. Itens: ${cartItems.map(i => i.nome).join(', ')}.`,
        vendaId: vendaDocRef.id,
        formaPagamento: paymentMethod,
      };
      await addDoc(collection(dbInstance, "lancamentosFinanceiros"), {
        ...lancamentoReceita,
        criadoEm: Timestamp.fromDate(dataVendaDate),
        atualizadoEm: Timestamp.fromDate(dataVendaDate)
      });


      for (const item of cartItems) {
        if (item.productId && !item.manual && item.productType === 'Produto') {
          const productRef = doc(dbInstance, "produtosServicos", item.productId);
          try {
            await runTransaction(dbInstance, async (transaction) => {
              const productDoc = await transaction.get(productRef);
              if (!productDoc.exists()) {
                throw new Error(`Produto ${item.nome} (ID: ${item.productId}) não encontrado no catálogo.`);
              }
              const productData = productDoc.data() as ProductService; 
              const estoqueAtual = productData.quantidadeEstoque ?? 0;
              
              const novoEstoque = estoqueAtual - item.quantidade;
              transaction.update(productRef, { 
                quantidadeEstoque: novoEstoque,
                atualizadoEm: Timestamp.now() 
              });
            });
            console.log(`Estoque do produto ${item.nome} atualizado.`);
          } catch (stockError: any) {
            console.error(`Erro ao atualizar estoque para ${item.nome} (ID: ${item.productId}):`, stockError);
            toast({
              title: `Erro de Estoque: ${item.nome}`,
              description: `Não foi possível atualizar o estoque: ${stockError.message}. A venda foi registrada. Verifique o estoque manualmente.`,
              variant: "destructive",
              duration: 7000,
            });
          }
        }
      }

      toast({
        title: "Venda Finalizada!",
        description: `Total: R$ ${totalVenda.toFixed(2)}. Lançamento financeiro criado. Estoque de produtos atualizado.`,
      });
      setCartItems([]);
      setSelectedClient("avulso");
      setPaymentMethod(paymentMethods[0].value);

    } catch (error: any) {
      console.error("Erro detalhado ao finalizar venda:", error);
      toast({
        title: "Erro ao Finalizar Venda",
        description: `Não foi possível processar a venda. Detalhe: ${error.message || 'Erro desconhecido.'}`,
        variant: "destructive"
      });
    } finally {
      setIsFinalizingSale(false);
    }
  };

  const handleTransformarEmOS = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Carrinho vazio",
        description: "Adicione itens ao carrinho para transformar em Ordem de Serviço.",
        variant: "destructive",
      });
      return;
    }

    const descricao = cartItems.map(item => `${item.nome} (Qtd: ${item.quantidade})`).join(', ');
    const queryParams = new URLSearchParams();

    const clienteSelecionadoObj = fetchedClients.find(c => c.id === selectedClient);
    const nomeClienteParaOS = selectedClient === "avulso" ? "Cliente Avulso" : clienteSelecionadoObj?.nome;

    if (selectedClient && selectedClient !== "avulso") {
      queryParams.append('clienteId', selectedClient);
    }
     if (nomeClienteParaOS) {
      queryParams.append('clienteNome', nomeClienteParaOS);
    }
    queryParams.append('descricao', descricao);
    queryParams.append('valorTotal', totalVenda.toFixed(2));

    router.push(`/produtos-servicos/atendimentos/novo?${queryParams.toString()}`);
  };

  const filteredAvailableProducts = availableProducts.filter(product =>
    product.nome.toLowerCase().includes(searchTermProducts.toLowerCase()) ||
    product.tipo.toLowerCase().includes(searchTermProducts.toLowerCase())
  );

  if (!bypassAuth && !user && !isLoadingProducts && !isLoadingClients) {
    return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para acessar o balcão de vendas.</p>
          <Button onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }


  return (
    <CashBoxGuard>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Balcão de Vendas</CardTitle>
              <CardDescription>
                Registre vendas rapidamente. Vendas atualizam o financeiro. Adicione itens do catálogo ou manualmente. Cliente opcional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="relative flex-grow min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto ou serviço..."
                    className="pl-10"
                    value={searchTermProducts}
                    onChange={(e) => setSearchTermProducts(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="icon" aria-label="Scan Barcode" disabled>
                  <ScanLine className="h-5 w-5" />
                </Button>
                <Button variant="outline" onClick={() => setIsManualItemModalOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" /> Adicionar Item Manual
                </Button>
              </div>

              {(isLoadingProducts || isLoadingClients) && (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando dados...</p>
                </div>
              )}

              {!isLoadingProducts && filteredAvailableProducts.length === 0 && (
                <div className="text-center py-10">
                  <PackageSearch className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {availableProducts.length === 0 ? "Nenhum produto ou serviço cadastrado." : "Nenhum item encontrado para a busca."}
                  </p>
                  <Button onClick={() => router.push('/produtos-servicos/produtos')} className="mt-4">Cadastrar Produtos/Serviços</Button>
                </div>
              )}

              {!isLoadingProducts && filteredAvailableProducts.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto p-1">
                  {filteredAvailableProducts.map((product) => (
                    <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => addToCart(product)}>
                      <CardContent className="p-3 flex flex-col items-center text-center">
                        <Image
                          src={`https://placehold.co/100x80.png?text=${encodeURIComponent(product.nome.substring(0,12))}`}
                          alt={product.nome}
                          width={100}
                          height={80}
                          className="rounded-md mb-2 object-cover"
                          data-ai-hint={product.nome.toLowerCase().split(" ").slice(0,2).join(" ")}
                        />
                        <p className="text-sm font-medium truncate w-full" title={product.nome}>{product.nome}</p>
                        <p className="text-xs text-muted-foreground">R$ {product.valorVenda.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">({product.tipo})</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo da Venda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <div className="flex gap-2">
                  <Select value={selectedClient} onValueChange={setSelectedClient} disabled={isLoadingClients}>
                    <SelectTrigger id="cliente">
                      <SelectValue placeholder={isLoadingClients ? "Carregando..." : "Selecionar cliente"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="avulso">Cliente Avulso</SelectItem>
                      {fetchedClients.map(client => (
                          <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" aria-label="Adicionar novo cliente" disabled>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{item.nome} {item.manual && <span className="text-xs text-muted-foreground">(Manual)</span>}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantidade} x R$ {item.valorUnitario.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">R$ {item.valorTotal.toFixed(2)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {cartItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum item na venda.</p>
                )}
              </div>

              <Separator />

              <div>
                <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Subtotal</p>
                  <p>R$ {totalVenda.toFixed(2)}</p>
                </div>
                <div className="flex justify-between">
                  <p className="text-muted-foreground">Desconto</p>
                  <p className="text-primary cursor-pointer hover:underline">R$ 0,00</p>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <p>Total</p>
                  <p>R$ {totalVenda.toFixed(2)}</p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                  <Button
                      variant="success"
                      className="w-full"
                      size="lg"
                      onClick={handleFinalizarVenda}
                      disabled={cartItems.length === 0 || isFinalizingSale}
                  >
                      {isFinalizingSale ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                      {isFinalizingSale ? "Finalizando..." : "Finalizar Venda"}
                  </Button>
                  <Button
                      variant="default" 
                      className="w-full"
                      onClick={handleTransformarEmOS}
                      disabled={cartItems.length === 0 || isFinalizingSale}
                  >
                      <FileText className="mr-2 h-4 w-4" /> Transformar em OS
                  </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isManualItemModalOpen} onOpenChange={setIsManualItemModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Item Manualmente</DialogTitle>
              <DialogDescription>
                Insira os detalhes do produto ou serviço que não está cadastrado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddManualItem}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manualItemName" className="text-right">
                    Nome
                  </Label>
                  <Input
                    id="manualItemName"
                    value={manualItemName}
                    onChange={(e) => setManualItemName(e.target.value)}
                    className="col-span-3"
                    placeholder="Nome do Produto/Serviço"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manualItemQuantity" className="text-right">
                    Qtd.
                  </Label>
                  <Input
                    id="manualItemQuantity"
                    type="number"
                    value={manualItemQuantity}
                    onChange={(e) => setManualItemQuantity(parseInt(e.target.value, 10) || 1)}
                    className="col-span-3"
                    min="1"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="manualItemPrice" className="text-right">
                    Preço Unit.
                  </Label>
                  <Input
                    id="manualItemPrice"
                    type="number"
                    value={manualItemPrice}
                    onChange={(e) => setManualItemPrice(parseFloat(e.target.value) || 0)}
                    className="col-span-3"
                    min="0.01"
                    step="0.01"
                    placeholder="R$ 0,00"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Adicionar ao Carrinho</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CashBoxGuard>
  );
}
