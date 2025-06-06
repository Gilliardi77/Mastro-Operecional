
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { PlusCircle, UserSearch, AlertCircle, CheckCircle, Edit2, Trash2, Loader2 } from "lucide-react";
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
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
} from "firebase/firestore";
import Link from 'next/link'; // Importado para manter a funcionalidade do botão que pode ter sido removida

interface ClienteFirestore {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  temDebitos?: boolean; 
  userId: string;
  criadoEm: Timestamp;
  atualizadoEm: Timestamp;
}

interface Cliente extends Omit<ClienteFirestore, 'criadoEm' | 'atualizadoEm'> {
  criadoEm?: Date;
  atualizadoEm?: Date;
}

const clientSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(3, { message: "Nome deve ter pelo menos 3 caracteres." }),
  email: z.string().email({ message: "Formato de e-mail inválido." }).optional().or(z.literal('')),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export default function ClientesPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Cliente | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const bypassAuthInStudioEnv = process.env.NEXT_PUBLIC_BYPASS_AUTH_IN_STUDIO;
  const bypassAuth = bypassAuthInStudioEnv === 'true';

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
    },
  });

  const fetchClientes = useCallback(async () => {
    if (!user && !bypassAuth) {
      setClientes([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const userIdToQuery = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
      if (!userIdToQuery && !bypassAuth) { // Corrigido: !bypassAuth deve estar aqui para não bloquear quando bypassAuth é true e user é null.
        setClientes([]);
        setIsLoading(false);
        return;
      }
      const q = query(collection(db, "clientes"), where("userId", "==", userIdToQuery), orderBy("nome", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedClientes = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data() as Omit<ClienteFirestore, 'id'>;
        return {
          id: docSnap.id,
          ...data,
          temDebitos: data.temDebitos || false, 
          criadoEm: data.criadoEm?.toDate(),
          atualizadoEm: data.atualizadoEm?.toDate(),
        } as Cliente;
      });
      setClientes(fetchedClientes);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: "Erro ao buscar clientes", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, bypassAuth]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  useEffect(() => {
    if (editingClient) {
      form.reset(editingClient);
    } else {
      form.reset({ nome: "", email: "", telefone: "", endereco: "" });
    }
  }, [editingClient, form, isModalOpen]);

  const handleOpenModal = (clientToEdit: Cliente | null = null) => {
    setEditingClient(clientToEdit);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (values: ClientFormValues) => {
    if (!user && !bypassAuth) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const userIdToSave = user ? user.uid : (bypassAuth ? "bypass_user_placeholder" : null);
    if (!userIdToSave && !bypassAuth) {
        toast({ title: "Erro: ID do usuário não encontrado", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }

    const clientData = {
      nome: values.nome,
      email: values.email || "",
      telefone: values.telefone || "",
      endereco: values.endereco || "",
      userId: userIdToSave,
      atualizadoEm: Timestamp.now(),
      temDebitos: editingClient?.temDebitos || false, 
    };

    try {
      if (editingClient?.id) {
        const docRef = doc(db, "clientes", editingClient.id);
        await updateDoc(docRef, clientData);
        toast({ title: "Cliente Atualizado!", description: `Cliente ${values.nome} atualizado com sucesso.` });
      } else {
        await addDoc(collection(db, "clientes"), {
          ...clientData,
          criadoEm: Timestamp.now(),
        });
        toast({ title: "Cliente Adicionado!", description: `Cliente ${values.nome} adicionado com sucesso.` });
      }
      await fetchClientes();
      setIsModalOpen(false);
      setEditingClient(null);
      form.reset();
    } catch (error) {
      console.error("Erro ao salvar cliente:", error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o cliente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!user && !bypassAuth) return;
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "clientes", clientId));
      toast({ title: "Cliente Excluído!", description: "O cliente foi removido com sucesso." });
      await fetchClientes();
    } catch (error) {
      console.error("Erro ao excluir cliente:", error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível excluir o cliente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cliente.telefone && cliente.telefone.includes(searchTerm))
  );

  if (isLoading && !user && !bypassAuth) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Verificando autenticação...</p></div>;
  }
  if (isLoading && (user || bypassAuth)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando clientes...</p></div>;
  }
   if (!bypassAuth && !user && !isLoading) {
     return (
      <Card>
        <CardHeader><CardTitle>Acesso Negado</CardTitle></CardHeader>
        <CardContent>
          <p>Você precisa estar logado para acessar a lista de clientes.</p>
          <Button onClick={() => auth.signOut().then(() => window.location.href = '/login')} className="mt-4">Fazer Login</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Gerenciamento de Clientes</CardTitle>
              <CardDescription>Adicione, visualize e gerencie seus clientes. Informações de endereço e débitos disponíveis.</CardDescription>
            </div>
            {/* Botão "Novo Cliente" que abre o modal */}
            <Button onClick={() => handleOpenModal()}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Cliente
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <UserSearch className="h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Buscar cliente por nome, email ou telefone..." 
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
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Telefone</TableHead>
                  <TableHead className="text-center hidden sm:table-cell">Débitos</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id} className={cliente.temDebitos ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell>{cliente.email || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{cliente.telefone || '-'}</TableCell>
                    <TableCell className="text-center hidden sm:table-cell">
                      {cliente.temDebitos ? (
                        <Badge variant="destructive" className="items-center">
                          <AlertCircle className="h-3.5 w-3.5 mr-1" />
                          Sim
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="items-center">
                           <CheckCircle className="h-3.5 w-3.5 mr-1 text-green-600" />
                           Não
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(cliente)} disabled={isSubmitting}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o cliente "{cliente.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClient(cliente.id)} disabled={isSubmitting} className={buttonVariants({variant: "destructive"})}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
                 {filteredClientes.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {clientes.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado para a busca."}
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
            setEditingClient(null); 
            form.reset({ nome: "", email: "", telefone: "", endereco: "" });
          }
      }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingClient ? "Atualize os dados do cliente." : "Preencha os dados para um novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSaveClient)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (Opcional)</FormLabel>
                    <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone (Opcional)</FormLabel>
                    <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço (Opcional)</FormLabel>
                    <FormControl><Textarea placeholder="Rua, Número, Bairro, Cidade, Estado" {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingClient ? "Salvar Alterações" : "Adicionar Cliente"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    