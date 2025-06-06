"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateModulePrompt, type ModulePromptInput, type ModulePromptOutput } from "@/ai/flows/module-prompt-generator";

const ModulePromptGeneratorSchema = z.object({
  moduleDescription: z.string().min(20, "A descrição do módulo deve ter pelo menos 20 caracteres.").max(1000),
});

type ModulePromptGeneratorFormValues = z.infer<typeof ModulePromptGeneratorSchema>;

export default function ModulePromptGeneratorForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ModulePromptOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<ModulePromptGeneratorFormValues>({
    resolver: zodResolver(ModulePromptGeneratorSchema),
    defaultValues: {
      moduleDescription: "",
    },
  });

  const onSubmit: SubmitHandler<ModulePromptGeneratorFormValues> = async (data) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await generateModulePrompt(data);
      setResult(response);
      toast({
        title: "Prompt Gerado",
        description: "O prompt do módulo de IA foi gerado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar prompt do módulo:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar o prompt do módulo. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <FileText className="h-6 w-6 text-primary" />
          Gerador de Prompt de Módulo com IA
        </CardTitle>
        <CardDescription>
          Gere um prompt de desenvolvimento detalhado para um novo módulo com base na sua descrição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="moduleDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Módulo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Um módulo para gerenciar faturas de clientes, permitindo criação, visualização e envio de faturas em PDF."
                      {...field}
                      className="min-h-[150px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Forneça uma descrição detalhada do módulo que você deseja construir.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                "Gerar Prompt"
              )}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-4 rounded-lg border bg-secondary/50 p-6 shadow-inner">
            <h3 className="font-headline text-lg font-semibold text-primary">Prompt do Módulo Gerado:</h3>
            <Textarea
              readOnly
              value={result.modulePrompt}
              className="min-h-[200px] text-sm bg-background"
              aria-label="Prompt do módulo gerado"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
