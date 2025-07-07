
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
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
import { useToast } from "@/hooks/use-toast";
import {
  createClient,
  getAllClientsByUserId,
  updateClient,
  deleteClient,
} from '@/services/clientService';
import { ClientFormSchema, type Client, type ClientFormValues } from '@/schemas/clientSchema';


export default function ClientesPage() {
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [clientes, setClientes] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: {
      id: undefined,
      nome: "",
      email: "",
      telefone: "",
      endereco: "",
      cpfCnpj: "",
      dataNascimento: "",
      observacoes: "",
      temDebitos: false,
    },
  });

  useEffect(() => {
    if (!isAuthenticating && !user) {
      router.push('/login?redirect=/operacional/clientes');
    }
  }, [isAuthenticating, user, router]);

  const fetchClientes = useCallback(async () => {
    if (!user?.uid) {
      return;
    }
    setIsLoadingData(true);
    try {
      const fetchedClientes = await getAllClientsByUserId(user.uid);
      setClientes(fetchedClientes);
    } catch (error: any) {
      console.error("Erro ao buscar clientes:", error);
      toast({ title: "Erro ao buscar clientes", description: error.message || "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setIsLoadingData(false);
    }
  }, [user, toast]); 

  useEffect(() => {
     if (user?.uid) { 
        fetchClientes();
     }
  }, [fetchClientes, user]);

  useEffect(() => {
    if (editingClient) {
      form.reset({
        id: editingClient.id,
        nome: editingClient.nome,
        email: editingClient.email || "",
        telefone: editingClient.telefone || "",
        endereco: editingClient.endereco || "",
        cpfCnpj: editingClient.cpfCnpj || "",
        dataNascimento: editingClient.dataNascimento || "",
        observacoes: editingClient.observacoes || "",
        temDebitos: editingClient.temDebitos || false,
      });
    } else {
      form.reset({
        id: undefined,
        nome: "",
        email: "",
        telefone: "",
        endereco: "",
        cpfCnpj: "",
        dataNascimento: "",
        observacoes: "",
        temDebitos: false,
      });
    }
  }, [editingClient, form, isModalOpen]);

  const handleOpenModal = (clientToEdit: Client | null = null) => {
    setEditingClient(clientToEdit);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (values: ClientFormValues) => {
    if (!user?.uid) {
      toast({ title: "Erro de Autenticação", description: "ID do usuário não encontrado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const { id, ...clientData } = values; 

    try {
      if (id && editingClient) { 
        await updateClient(id, clientData);
        toast({ title: "Cliente Atualizado!", description: `Cliente ${values.nome} atualizado com sucesso.` });
      } else { 
        await createClient(user.uid, clientData);
        toast({ title: "Cliente Adicionado!", description: `Cliente ${values.nome} adicionado com sucesso.` });
      }
      await fetchClientes(); 
      setIsModalOpen(false);
      setEditingClient(null);
    } catch (error: any) {
      console.error("Erro ao salvar cliente:", error);
      toast({ title: "Erro ao Salvar", description: error.message || "Não foi possível salvar o cliente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
     if (!user?.uid) {
      toast({ title: "Ação não permitida", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteClient(clientId);
      toast({ title: "Cliente Excluído!", description: "O cliente foi removido com sucesso." });
      await fetchClientes(); 
    } catch (error: any) {
      console.error("Erro ao excluir cliente:", error);
      toast({ title: "Erro ao Excluir", description: error.message || "Não foi possível excluir o cliente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cliente.email && cliente.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (cliente.telefone && cliente.telefone.includes(searchTerm))
  );

  if (isAuthenticating || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
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
          {isLoadingData ? (
             <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Carregando clientes...</p></div>
          ) : (
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
                 {filteredClientes.length === 0 && !isLoadingData && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {clientes.length === 0 ? "Nenhum cliente cadastrado." : "Nenhum cliente encontrado para a busca."}
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
            setEditingClient(null);
            form.reset({ id: undefined, nome: "", email: "", telefone: "", endereco: "", cpfCnpj: "", dataNascimento: "", observacoes: "", temDebitos: false });
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
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl><Input placeholder="Nome do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" placeholder="email@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="telefone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl><Input placeholder="(XX) XXXXX-XXXX" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endereco" render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl><Textarea placeholder="Rua, Número, Bairro, Cidade, Estado" {...field} rows={3} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF/CNPJ</FormLabel>
                  <FormControl><Input placeholder="Documento do cliente" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl><Input type="date" placeholder="AAAA-MM-DD" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea placeholder="Observações adicionais" {...field} rows={2} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="temDebitos" render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                    <FormControl><input type="checkbox" checked={field.value} onChange={field.onChange} className="form-checkbox h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary" /></FormControl>
                    <FormLabel className="font-normal">Cliente possui débitos?</FormLabel>
                  </FormItem>
              )} />
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
