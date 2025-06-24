
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Loader2, Unlock } from "lucide-react";
import { useAuth } from '@/components/auth/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { useCashBox } from '@/contexts/CashBoxContext';
import { abrirSessaoCaixa, getUltimaSessaoFechada } from '@/services/sessaoCaixaService';

export function AbrirCaixaForm() {
  const { user } = useAuth();
  const { mutate } = useCashBox();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [trocoSugerido, setTrocoSugerido] = useState<number>(0);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(true);

  const form = useForm({
    resolver: zodResolver(z.object({
      trocoInicial: z.coerce.number().nonnegative("O troco inicial não pode ser negativo."),
    })),
    defaultValues: {
      trocoInicial: 0,
    },
  });

  useEffect(() => {
    async function fetchSuggestion() {
      if (!user?.uid) {
        setIsSuggestionLoading(false);
        return;
      }
      try {
        const ultimaSessao = await getUltimaSessaoFechada(user.uid);
        const valorSugerido = ultimaSessao?.saldoFinalCalculado ?? 0;
        setTrocoSugerido(valorSugerido);
        form.setValue("trocoInicial", valorSugerido);
      } catch (error) {
        console.warn("Não foi possível sugerir troco inicial:", error);
      } finally {
        setIsSuggestionLoading(false);
      }
    }
    fetchSuggestion();
  }, [user, form]);

  const onSubmit = async (data: { trocoInicial: number }) => {
    if (!user?.uid) {
      toast({ title: "Usuário não autenticado", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      await abrirSessaoCaixa(user.uid, data.trocoInicial);
      toast({ title: "Caixa Aberto!", description: `Caixa aberto com troco inicial de R$ ${data.trocoInicial.toFixed(2)}.` });
      await mutate();
    } catch (error: any) {
      toast({ title: "Erro ao Abrir Caixa", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full mx-auto shadow-none border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-primary">
          <Unlock className="h-7 w-7" />
          Abrir Caixa
        </CardTitle>
        <CardDescription>Você precisa abrir o caixa para iniciar as operações de venda.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            {isSuggestionLoading ? (
                <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4"/><span>Buscando sugestão de troco...</span></div>
            ) : (
                <FormField
                  control={form.control}
                  name="trocoInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Troco Inicial (R$)</FormLabel>
                      <FormControl><Input type="number" placeholder="0.00" {...field} step="0.01" /></FormControl>
                      <FormDescription>
                        Valor sugerido com base no fechamento anterior: R$ {trocoSugerido.toFixed(2)}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading || isSuggestionLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Abrir Caixa e Iniciar Operações
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
