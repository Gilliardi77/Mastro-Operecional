
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Loader2, Save, Edit3, Trash2, PlusCircle, Settings2, Send, CheckCircle2, History
} from 'lucide-react';
import { getActiveUserId } from '@/lib/authUtils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc, DialogFooter, DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import {
  type CustoFixoConfiguradoClient,
  CustoFixoConfiguradoCreateSchema,
  type CustoFixoConfiguradoCreateData,
  type CustoFixoConfiguradoUpdateData,
} from '@/schemas/custoFixoConfiguradoSchema';
import {
  createCustoFixo,
  getAllCustosFixosConfigurados,
  updateCustoFixo,
  hardDeleteCustoFixo,
} from '@/services/custoFixoConfiguradoService';
import { createPendingExpenseFromFixedCost, getLaunchedFixedCostsIdsForCurrentMonth } from '@/app/financeiro/actions';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption
} from '@/components/ui/table';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';

const custoFixoFormSchema = CustoFixoConfiguradoCreateSchema.extend({
  ativo: z.boolean().optional()
});
type CustoFixoFormValues = z.infer<typeof custoFixoFormSchema>;

export default function PlanejamentoCustosSection() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCustoFixo, setCurrentCustoFixo] = useState<CustoFixoConfiguradoClient | null>(null);

  const [custosFixosLista, setCustosFixosLista] = useState<CustoFixoConfiguradoClient[]>([]);
  const [lancadoNoMesMap, setLancadoNoMesMap] = useState<Record<string, boolean>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // State for delete confirmation
  const [isDeleteCostDialogOpen, setIsDeleteCostDialogOpen] = useState(false);
  const [costToDelete, setCostToDelete] = useState<CustoFixoConfiguradoClient | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
  
  const activeUserId = useMemo(() => getActiveUserId(user), [user]);

  const editForm = useForm<CustoFixoFormValues>({
    resolver: zodResolver(custoFixoFormSchema),
    defaultValues: { nome: '', valorMensal: 0, categoria: '', observacoes: '', ativo: true },
  });

  const fetchData = useCallback(async () => {
    if (!activeUserId || !user) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const idToken = await user.getIdToken();
      
      const [custos, launchedIds] = await Promise.all([
        getAllCustosFixosConfigurados(idToken, showInactive),
        getLaunchedFixedCostsIdsForCurrentMonth(idToken)
      ]);

      const lancadosMap: Record<string, boolean> = {};
      launchedIds.forEach(id => { lancadosMap[id] = true; });
      
      setCustosFixosLista(custos);
      setLancadoNoMesMap(lancadosMap);

    } catch (error) {
      toast({ title: 'Erro ao carregar dados', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [activeUserId, user, showInactive, toast]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/financeiro');
    } else if (!authLoading && activeUserId) {
      fetchData();
    }
  }, [authLoading, user, activeUserId, router, fetchData]);

  const handleOpenEditModal = (custo: CustoFixoConfiguradoClient | null = null) => {
    setCurrentCustoFixo(custo);
    if (custo) {
      editForm.reset({
        nome: custo.nome,
        valorMensal: custo.valorMensal,
        categoria: custo.categoria || '',
        observacoes: custo.observacoes || '',
        ativo: custo.ativo,
      });
    } else {
      editForm.reset({ nome: '', valorMensal: 0, categoria: '', observacoes: '', ativo: true });
    }
    setIsEditModalOpen(true);
  };

  const onEditSubmit = async (values: CustoFixoFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      if (currentCustoFixo) {
        const updateData: CustoFixoConfiguradoUpdateData = { ...values, ativo: values.ativo ?? true };
        await updateCustoFixo(idToken, currentCustoFixo.id, updateData);
        toast({ title: 'Custo Fixo Atualizado!' });
      } else {
        const createData: CustoFixoConfiguradoCreateData = { ...values };
        await createCustoFixo(idToken, createData);
        toast({ title: 'Custo Fixo Adicionado!' });
      }
      setIsEditModalOpen(false);
      fetchData();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleLancarDespesa = async (custoFixoId: string) => {
    if(!user) return;

    if (lancadoNoMesMap[custoFixoId]) {
      toast({ title: 'Aviso', description: 'Esta despesa já foi lançada para o mês atual.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await user.getIdToken();
      await createPendingExpenseFromFixedCost(idToken, custoFixoId);
      toast({ title: 'Sucesso!', description: 'Despesa pendente criada na aba Lançamentos.'});
      fetchData(); // Refresh data to update status
    } catch (error) {
      toast({ title: 'Erro ao Lançar Despesa', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCusto = async (id: string) => {
    if(!user) return;
    setIsSubmitting(true);
    try {
        const idToken = await user.getIdToken();
        await hardDeleteCustoFixo(idToken, id);
        toast({title: "Custo Excluído", description: "O custo fixo foi removido permanentemente."});
        fetchData();
    } catch (error) {
        toast({title: "Erro ao Excluir", description: (error as Error).message, variant: "destructive"});
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleOpenDeleteCostDialog = (custo: CustoFixoConfiguradoClient) => {
    setCostToDelete(custo);
    setDeletePassword('');
    setIsDeleteCostDialogOpen(true);
  };

  const handleConfirmDeleteCost = async () => {
    if (!user || !user.email || !costToDelete) return;
    setIsVerifyingPassword(true);
    try {
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(user, credential);
        toast({ title: 'Senha verificada!', description: 'Excluindo custo...' });
        await handleDeleteCusto(costToDelete.id);
        setIsDeleteCostDialogOpen(false);
    } catch (error) {
        toast({ title: 'Senha Incorreta', description: 'A exclusão foi cancelada.', variant: 'destructive' });
    } finally {
        setIsVerifyingPassword(false);
        setDeletePassword('');
    }
  };

  const formatCurrency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  
  if (authLoading || (!user && !activeUserId)) {
    return <Card className="mt-6 p-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card>;
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 mt-6">
        <Card className="shadow-lg rounded-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="text-xl font-headline flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-primary"/>Planejamento de Custos Fixos
                </CardTitle>
                <CardDescription>Configure seus custos recorrentes e lance-os como despesas pendentes para o mês.</CardDescription>
              </div>
              <Button onClick={() => handleOpenEditModal()} variant="default" disabled={isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Custo
              </Button>
            </div>
            <div className="flex items-center space-x-2 mt-4">
              <Switch id="show-inactive-custos" checked={showInactive} onCheckedChange={setShowInactive} disabled={isLoading} />
              <Label htmlFor="show-inactive-custos">Mostrar custos inativos</Label>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
            ) : custosFixosLista.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">{showInactive ? "Nenhum custo fixo configurado." : "Nenhum custo fixo ativo configurado."}</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Custo</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor Mensal</TableHead>
                      <TableHead>Status (Mês Atual)</TableHead>
                      <TableHead className="text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {custosFixosLista.map((custo) => {
                      const isLancado = lancadoNoMesMap[custo.id];
                      return (
                        <TableRow key={custo.id} className={!custo.ativo ? "opacity-50" : ""}>
                          <TableCell className="font-medium">{custo.nome}</TableCell>
                          <TableCell>{custo.categoria || '-'}</TableCell>
                          <TableCell className="text-right">{formatCurrency(custo.valorMensal)}</TableCell>
                          <TableCell>
                            {isLancado ? (
                              <span className="flex items-center text-green-600 font-medium text-sm"><CheckCircle2 className="mr-1.5 h-4 w-4" /> Lançada no Mês</span>
                            ) : (
                              <span className="flex items-center text-amber-600 text-sm"><History className="mr-1.5 h-4 w-4" /> A Lançar</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center space-x-1">
                             <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="outline" size="sm" onClick={() => handleLancarDespesa(custo.id)} disabled={isSubmitting || isLancado || !custo.ativo}>
                                  <Send className="h-4 w-4 mr-1" /> Lançar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>{isLancado ? 'Despesa já foi lançada este mês' : 'Lançar como despesa pendente'}</p></TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(custo)} disabled={isSubmitting}><Edit3 className="h-4 w-4" /></Button></TooltipTrigger>
                              <TooltipContent><p>Editar Configuração</p></TooltipContent>
                            </Tooltip>
                             <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDeleteCostDialog(custo)} disabled={isSubmitting} className="hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Excluir Custo</p></TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableCaption>Gerencie seus custos fixos planejados.</TableCaption>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit/Add Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{currentCustoFixo ? 'Editar' : 'Adicionar'} Custo Fixo</DialogTitle>
              <DialogDesc>Preencha os detalhes do seu custo fixo recorrente.</DialogDesc>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField control={editForm.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="valorMensal" render={({ field }) => (<FormItem><FormLabel>Valor Mensal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="categoria" render={({ field }) => (<FormItem><FormLabel>Categoria</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={editForm.control} name="observacoes" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                {currentCustoFixo && <FormField control={editForm.control} name="ativo" render={({ field }) => (<FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Ativo</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>)} />}
                <DialogFooter>
                  <DialogClose asChild><Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="animate-spin mr-2"/>}<Save className="mr-2"/> Salvar</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Cost Confirmation Dialog */}
        <AlertDialog open={isDeleteCostDialogOpen} onOpenChange={setIsDeleteCostDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Para excluir o custo fixo <span className="font-semibold text-foreground">"{costToDelete?.nome}"</span>, digite sua senha de login. Esta ação é irreversível.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2 space-y-2">
                <Label htmlFor="delete-cost-password">Senha</Label>
                <Input 
                    id="delete-cost-password" 
                    type="password" 
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Sua senha"
                    autoComplete="current-password"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isVerifyingPassword} onClick={() => setDeletePassword('')}>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleConfirmDeleteCost} 
                  disabled={!deletePassword || isVerifyingPassword} 
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {isVerifyingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Excluir Custo
                </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </TooltipProvider>
  );
}
