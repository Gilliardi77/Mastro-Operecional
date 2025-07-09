// src/app/team/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, PlusCircle, Users, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getTeamMembers } from '@/services/userProfileService';
import { type UserProfileData } from '@/schemas/userProfileSchema';
import { CreateUserFormSchema, type CreateUserFormValues } from '@/schemas/teamManagementSchema';
import { createUserAction } from './actions';
import { Badge } from '@/components/ui/badge';

type TeamMember = Pick<UserProfileData, 'id' | 'companyName' | 'role' | 'accessibleModules'> & {
  email: string;
  displayName: string;
};

const modules = [
  { id: 'operacional', label: 'Operacional' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'consultor', label: 'Consultor' },
] as const;

export default function TeamManagementPage() {
  const { toast } = useToast();
  const { user, isAuthenticating } = useAuth();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(CreateUserFormSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      accessibleModules: [],
    },
  });

  const fetchTeam = useCallback(async () => {
    if (!user?.uid || user.role !== 'admin') {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const members = await getTeamMembers(user.uid);
      setTeamMembers(members as TeamMember[]);
    } catch (error: any) {
      toast({ title: "Erro ao buscar equipe", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!isAuthenticating) {
      if (user?.role !== 'admin') {
        toast({ title: "Acesso Negado", description: "Você não tem permissão para acessar esta página.", variant: "destructive" });
        router.push('/');
      } else {
        fetchTeam();
      }
    }
  }, [user, isAuthenticating, router, toast, fetchTeam]);

  const handleCreateUser = async (data: CreateUserFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createUserAction(data);
      if (result.success) {
        toast({ title: "Usuário Criado!", description: `A conta para ${data.displayName} foi criada com sucesso.` });
        setIsModalOpen(false);
        form.reset();
        await fetchTeam();
      } else {
        throw new Error(result.error || "Ocorreu um erro desconhecido.");
      }
    } catch (error: any) {
      toast({ title: "Erro ao Criar Usuário", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Gerenciamento de Equipe</CardTitle>
              <CardDescription>Adicione e visualize os usuários da sua conta.</CardDescription>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Novo Usuário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Módulos Acessíveis</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="h-24 text-center">Nenhum membro na equipe.</TableCell></TableRow>
                ) : (
                  teamMembers.map(member => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.displayName}</TableCell>
                      <TableCell className="hidden sm:table-cell">{member.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.accessibleModules?.map(mod => <Badge key={mod} variant="secondary" className="capitalize">{mod}</Badge>) || 'Nenhum'}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
            <DialogDescription>Crie uma nova conta e defina as permissões de acesso aos módulos.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField control={form.control} name="displayName" render={({ field }) => (
                <FormItem><FormLabel>Nome Completo</FormLabel><FormControl><Input placeholder="Nome do membro da equipe" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="email@exemplo.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                    <FormLabel>Senha Temporária</FormLabel>
                    <FormControl><Input type="password" placeholder="Crie uma senha forte" {...field} /></FormControl>
                    <FormDescription>O usuário deverá alterar esta senha no futuro.</FormDescription>
                    <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="accessibleModules"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Módulos Acessíveis</FormLabel>
                      <FormDescription>Selecione os módulos que este usuário poderá acessar.</FormDescription>
                    </div>
                    {modules.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="accessibleModules"
                        render={({ field }) => (
                          <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(field.value?.filter((value) => value !== item.id));
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal capitalize">{item.label}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancelar</Button></DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
