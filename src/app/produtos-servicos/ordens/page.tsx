
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListOrdered, Search, Loader2, Settings2, Eye } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where, orderBy, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type OrdemServicoStatus = "Pendente" | "Em Andamento" | "Concluído" | "Cancelado";

interface ItemOS {
  produtoServicoId?: string | null;
  nome: string;
  quantidade: number;
  valorUnitario: number;
  tipo: 'Produto' | 'Serviço' | 'Manual';
}

interface OrdemServicoFirestore {
  id: string; // Firestore document ID will be used as 'id'
  numeroOS: string; // Usually the same as ID or a custom formatted one
  clienteId?: string | null;
  clienteNome: string;
  itens: ItemOS[];
  valorTotal: number; // This is valorTotalOS from the form
  valorAdiantado: number;
  dataEntrega: Timestamp;
  observacoes?: string;
  status: OrdemServicoStatus;
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface OrdemServicoListData extends Omit<OrdemServicoFirestore, 'criadoEm' | 'dataEntrega' | 'atualizadoEm' | 'itens'> {
  dataCriacao: Date;
  dataEntregaPrevista: Date;
  servicoDescricao: string;
}

const getStatusVariant = (status: OrdemServicoStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "Concluído": return "default";
    case "Em Andamento": return "secondary";
    case "Pendente": return "outline";
    case "Cancelado": return "destructive";
    default: return "outline";
  }
};

export default function OrdensServicoPage() {
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [ordensServico, setOrdensServico] = useState<OrdemServicoListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const bypassAuth = true; 

  const fetchOrdensServico = useCallback(async () => {
    const userIdToQuery = bypassAuth && !user ? "bypass_user_placeholder" : user?.uid;
    if (!userIdToQuery) {
      setOrdensServico([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const collectionRef = collection(db, "ordensServico");
      const q = query(
        collectionRef,
        where("userId", "==", userIdToQuery),
        orderBy("criadoEm", "desc")
      );
      const querySnapshot = await getDocs(q);
      const fetchedOrdens = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<OrdemServicoFirestore, 'id'>; // Firestore data doesn't include id
        const id = docSnap.id;
        let servicoDescricao = "Serviço/Produto não especificado";
        if (data.itens && data.itens.length > 0) {
          servicoDescricao = data.itens[0].nome;
          if (data.itens.length > 1) {
            servicoDescricao += ` e mais ${data.itens.length - 1} item(ns)`;
          }
        } else if (data.observacoes) {
          servicoDescricao = data.observacoes.substring(0, 50) + (data.observacoes.length > 50 ? "..." : "");
        }


        return {
          id: id, // Manually add the doc id
          numeroOS: data.numeroOS || id, // Use numeroOS field, fallback to id
          clienteNome: data.clienteNome,
          servicoDescricao: servicoDescricao,
          dataCriacao: data.criadoEm.toDate(),
          dataEntregaPrevista: data.dataEntrega.toDate(),
          status: data.status,
          valorTotal: data.valorTotal,
          userId: data.userId,
          // Fill other necessary fields from OrdemServicoListData based on OrdemServicoFirestore
          clienteId: data.clienteId,
          valorAdiantado: data.valorAdiantado,
          observacoes: data.observacoes,

        } as OrdemServicoListData;
      });
      setOrdensServico(fetchedOrdens);
    } catch (error: any) {
      console.error("Erro ao buscar Ordens de Serviço:", error);
      toast({ title: "Erro ao buscar OS", description: `Não foi possível carregar os dados. ${error.message}`, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    if (user || bypassAuth) {
      fetchOrdensServico();
    }
  }, [fetchOrdensServico, user, bypassAuth]);

  const filteredOrdens = useMemo(() => {
    return ordensServico.filter(order => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        order.clienteNome.toLowerCase().includes(searchTermLower) ||
        order.numeroOS.toLowerCase().includes(searchTermLower) ||
        order.servicoDescricao.toLowerCase().includes(searchTermLower)
      );
    });
  }, [ordensServico, searchTerm]);

  if (isAuthLoading && !bypassAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }

  if (!user && !bypassAuth) {
     return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para acessar as ordens de serviço.</p>
          <Button onClick={() => router.push('/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading && (user || bypassAuth)) {
     return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando Ordens de Serviço...</p></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><ListOrdered className="h-6 w-6 text-primary" />Ordens de Serviço</CardTitle>
              <CardDescription>Visualize e acompanhe todas as ordens de serviço registradas.</CardDescription>
            </div>
            <Button onClick={() => router.push('/produtos-servicos/atendimentos/novo')}>
              Nova Ordem de Serviço
            </Button>
          </div>
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                placeholder="Buscar por OS, cliente, descrição..."
                className="pl-10 w-full md:w-1/2 lg:w-1/3"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS #</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição Principal</TableHead>
                  <TableHead className="hidden md:table-cell">Criação</TableHead>
                  <TableHead className="hidden md:table-cell">Entrega Prev.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Valor Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrdens.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {ordensServico.length === 0 ? "Nenhuma Ordem de Serviço cadastrada." : "Nenhuma OS encontrada para a busca."}
                    </TableCell>
                  </TableRow>
                )}
                {filteredOrdens.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.numeroOS.substring(0,8)}...</TableCell>
                    <TableCell>{order.clienteNome}</TableCell>
                    <TableCell>{order.servicoDescricao}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(order.dataCriacao, "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="hidden md:table-cell">{format(order.dataEntregaPrevista, "dd/MM/yy", { locale: ptBR })}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right hidden sm:table-cell">R$ {order.valorTotal.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/produtos-servicos/producao?agendamentoId=${order.id}`)} title="Ir para Produção">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({title: "Em Breve", description: "Visualização de detalhes da OS."})} title="Ver Detalhes (Em Breve)">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/produtos-servicos/atendimentos/novo?osId=${order.id}`)} title="Editar OS (Em Breve)">
                        <Edit2 className="h-4 w-4" />
                      </Button> */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

