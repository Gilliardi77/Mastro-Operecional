
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useConsultationContext } from '@/contexts/ConsultationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Not used directly if using FormLabel
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from 'lucide-react';
import type { InitialFormField } from '@/types';

export function InitialForm() {
  const { initialFormConfig, handleInitialFormSubmit, state } = useConsultationContext();
  const { isLoading } = state;

  if (!initialFormConfig) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-6" />
        <p className="text-xl font-semibold">Carregando formulário...</p>
      </div>
    );
  }

  const formSchema = React.useMemo(() => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    initialFormConfig.campos.forEach(field => {
      let fieldSchema: z.ZodTypeAny;
      switch (field.tipo) {
        case 'texto':
          fieldSchema = z.string().min(1, { message: "Este campo é obrigatório." }).max(500, { message: "Resposta muito longa."});
          if (field.id === 'faturamento_medio') { // Optional field
            fieldSchema = fieldSchema.optional().or(z.literal(""));
          }
          break;
        case 'numero':
          fieldSchema = z.preprocess(
            (val) => (val === "" || val === undefined || val === null ? undefined : String(val).trim() === "" ? undefined : Number(val)),
             z.number({ invalid_type_error: "Deve ser um número." }).min(0, { message: "Deve ser positivo." })
          );
          if (field.id === 'faturamento_medio') { // Optional field
             fieldSchema = fieldSchema.optional();
          }
          break;
        case 'opcoes':
          fieldSchema = z.string().min(1, { message: "Selecione uma opção." });
          break;
        default:
          fieldSchema = z.string();
      }
      schemaFields[field.id] = fieldSchema;
    });
    return z.object(schemaFields);
  }, [initialFormConfig.campos]);

  type InitialFormData = z.infer<typeof formSchema>;

  const form = useForm<InitialFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: initialFormConfig.campos.reduce((acc, field) => {
      acc[field.id] = field.tipo === 'numero' ? undefined : "";
      return acc;
    }, {} as Record<string, any>),
  });

  const onSubmit = (data: InitialFormData) => {
    const processedData: Record<string, string | string[]> = {};
    for (const key in data) {
        const value = data[key as keyof InitialFormData];
        if (value !== undefined && value !== null) {
            const fieldConfig = initialFormConfig.campos.find(f => f.id === key);
            if (fieldConfig?.tipo === 'numero') {
                processedData[key] = String(value); // Keep as string for Genkit compatibility if needed, or convert to number
            } else {
                processedData[key] = String(value);
            }
        }
    }
    handleInitialFormSubmit(processedData);
  };
  

  return (
    <div className="container mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center py-12 px-4">
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">{initialFormConfig.titulo}</CardTitle>
          <CardDescription className="text-md text-muted-foreground mt-2 whitespace-pre-wrap">
            {initialFormConfig.descricao}
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {initialFormConfig.campos.map((field: InitialFormField) => (
                <FormField
                  control={form.control}
                  key={field.id}
                  name={field.id as keyof InitialFormData}
                  render={({ field: formField }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base font-medium">{field.pergunta}</FormLabel>
                      {field.tipo === 'texto' && (
                        <FormControl>
                          <Input
                            type="text"
                            {...formField}
                            value={formField.value || ""}
                            className="bg-background" />
                        </FormControl>
                      )}
                      {field.tipo === 'numero' && (
                        <FormControl>
                           <Input
                            type="number"
                            {...formField}
                            value={formField.value || ""}
                            onChange={e => formField.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                            className="bg-background" />
                        </FormControl>
                      )}
                      {field.tipo === 'opcoes' && field.opcoes && (
                        <FormControl>
                          <Select onValueChange={formField.onChange} defaultValue={formField.value as string || undefined}>
                            <SelectTrigger className="w-full bg-background">
                              <SelectValue placeholder="Selecione uma opção" />
                            </SelectTrigger>
                            <SelectContent>
                              {field.opcoes?.map((opcao) => (
                                <SelectItem key={opcao} value={opcao}>
                                  {opcao}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Iniciar Diagnóstico
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
