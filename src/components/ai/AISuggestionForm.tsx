"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Lightbulb } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getContentSuggestions, type ContentSuggestionsInput, type ContentSuggestionsOutput } from "@/ai/flows/ai-content-suggestions";

const AISuggestionFormSchema = z.object({
  modulePurpose: z.string().min(10, "O propósito do módulo deve ter pelo menos 10 caracteres.").max(500),
  moduleContext: z.string().min(10, "O contexto do módulo deve ter pelo menos 10 caracteres.").max(500),
  desiredContentLength: z.enum(["Short", "Medium", "Long"]),
});

type AISuggestionFormValues = z.infer<typeof AISuggestionFormSchema>;

export default function AISuggestionForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ContentSuggestionsOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<AISuggestionFormValues>({
    resolver: zodResolver(AISuggestionFormSchema),
    defaultValues: {
      modulePurpose: "",
      moduleContext: "Aplicação Business Maestro",
      desiredContentLength: "Medium",
    },
  });

  const onSubmit: SubmitHandler<AISuggestionFormValues> = async (data) => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await getContentSuggestions(data);
      setResult(response);
      toast({
        title: "Sugestões Geradas",
        description: "As sugestões de conteúdo por IA foram geradas com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao gerar sugestões de IA:", error);
      toast({
        title: "Erro",
        description: "Falha ao gerar sugestões de IA. Por favor, tente novamente.",
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
          <Lightbulb className="h-6 w-6 text-primary" />
          Sugestões de Conteúdo com IA
        </CardTitle>
        <CardDescription>
          Gere ideias de conteúdo para o seu módulo usando IA.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="modulePurpose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Propósito do Módulo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Página de perfil do usuário, painel de vendas, painel de configurações"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Descreva o objetivo principal ou função deste módulo.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="moduleContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contexto do Módulo</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Aplicação Business Maestro para proprietários de pequenas empresas"
                      {...field}
                      className="min-h-[100px]"
                    />
                  </FormControl>
                  <FormDescription>
                    Forneça contexto como nome da aplicação, público-alvo, domínio dos dados.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="desiredContentLength"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tamanho Desejado do Conteúdo</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tamanho do conteúdo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Short">Curto (algumas frases)</SelectItem>
                      <SelectItem value="Medium">Médio (um parágrafo)</SelectItem>
                      <SelectItem value="Long">Longo (vários parágrafos)</SelectItem>
                    </SelectContent>
                  </Select>
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
                "Obter Sugestões"
              )}
            </Button>
          </form>
        </Form>

        {result && (
          <div className="mt-8 space-y-4 rounded-lg border bg-secondary/50 p-6 shadow-inner">
            <h3 className="font-headline text-lg font-semibold text-primary">Sugestões Geradas:</h3>
            {result.suggestions.length > 0 ? (
              <ul className="list-disc space-y-2 pl-5">
                {result.suggestions.map((suggestion, index) => (
                  <li key={index} className="text-sm">{suggestion}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma sugestão gerada.</p>
            )}
            <h4 className="font-headline text-md font-semibold pt-2">Justificativa:</h4>
            <p className="text-sm text-muted-foreground">{result.reasoning}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
