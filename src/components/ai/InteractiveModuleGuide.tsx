
"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, FileText } from "lucide-react";

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
import { symptômesModuleInteractively, type InteractiveModuleGuideInput, type InteractiveModuleGuideOutput } from "@/ai/flows/interactive-module-guide-flow";

const InteractiveModuleGuideSchema = z.object({
  userRequest: z.string().min(15, "Descreva sua necessidade com pelo menos 15 caracteres.").max(1000),
});

type InteractiveModuleGuideFormValues = z.infer<typeof InteractiveModuleGuideSchema>;

export default function InteractiveModuleGuide() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<InteractiveModuleGuideOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<InteractiveModuleGuideFormValues>({
    resolver: zodResolver(InteractiveModuleGuideSchema),
    defaultValues: {
      userRequest: "",
    },
  });

  const onSubmit: SubmitHandler<InteractiveModuleGuideFormValues> = async (data) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await symptômesModuleInteractively(data);
      setResult(response);
      toast({
        title: "Guia Concluído!",
        description: "O Guia Interativo de Módulo gerou um prompt e orientações para você.",
      });
    } catch (error) {
      console.error("Erro ao interagir com o Guia de Módulo:", error);
      let errorMessage = "Falha na interação com o Guia de Módulo. Tente novamente.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({
        title: "Erro na Geração",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-2xl text-primary">
          <Sparkles className="h-7 w-7" />
          Guia Interativo para Criação de Módulos
        </CardTitle>
        <CardDescription>
          Descreva a sua necessidade e a IA irá gerar um prompt detalhado para ajudar no desenvolvimento do seu novo módulo para o Maestro Operacional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="userRequest"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base">Qual módulo você precisa construir ou qual problema quer resolver?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Preciso de um painel para visualizar as principais métricas de vendas, como total de vendas, ticket médio e produtos mais vendidos, com gráficos e filtros por período."
                      {...field}
                      className="min-h-[120px] border-border focus:border-primary focus:ring-primary"
                    />
                  </FormControl>
                  <FormDescription>
                    Seja o mais claro possível sobre a finalidade e principais características do módulo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto text-base py-3 px-6">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Consultando o Guia...
                </>
              ) : (
                "Obter Ajuda do Guia"
              )}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-6 rounded-lg border bg-card p-6 shadow-inner">
            <div>
              <h3 className="font-headline text-xl font-semibold text-primary mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Orientação do Guia MIA:
              </h3>
              <p className="text-sm text-foreground bg-primary/5 p-3 rounded-md">{result.guidanceText}</p>
            </div>
            <div>
              <h3 className="font-headline text-xl font-semibold text-primary mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Prompt do Módulo Sugerido:
              </h3>
              <Textarea
                readOnly
                value={result.modulePrompt}
                className="min-h-[250px] text-sm bg-muted/50 border-border focus:border-primary focus:ring-primary"
                aria-label="Prompt do módulo gerado pelo guia interativo"
              />
               <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(result.modulePrompt);
                  toast({ title: "Copiado!", description: "Prompt copiado para a área de transferência." });
                }}
                className="mt-2"
              >
                Copiar Prompt
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
