"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { predictFinancialTrends, type PredictFinancialTrendsOutput } from "@/ai/flows/financial-trend-prediction";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { BrainCircuit, Sparkles, Lightbulb, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  historicalData: z.string().min(10, { message: "Os dados históricos devem ter pelo menos 10 caracteres." }).describe("Dados financeiros históricos em formato CSV."),
  industry: z.string().min(3, { message: "O setor da indústria deve ter pelo menos 3 caracteres." }).describe("Setor da indústria."),
  economicConditions: z.string().optional().describe("Condições econômicas atuais."),
});

type FormData = z.infer<typeof formSchema>;

export function PredictiveAnalysisForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictFinancialTrendsOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      historicalData: "",
      industry: "",
      economicConditions: "",
    },
  });

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    setPredictionResult(null);
    setError(null);
    try {
      const result = await predictFinancialTrends(data);
      setPredictionResult(result);
      toast({
        title: "Análise Preditiva Concluída",
        description: "As tendências financeiras foram previstas com sucesso.",
        variant: "default",
        action: <CheckCircle2 className="text-green-500" />,
      });
    } catch (e) {
      console.error("Erro na análise preditiva:", e);
      const errorMessage = e instanceof Error ? e.message : "Ocorreu um erro desconhecido.";
      setError(`Falha ao prever tendências: ${errorMessage}`);
      toast({
        title: "Erro na Análise",
        description: `Não foi possível completar a análise preditiva. ${errorMessage}`,
        variant: "destructive",
        action: <AlertTriangle className="text-yellow-500" />,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="shadow-lg rounded-lg w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-7 w-7 text-primary" />
          <CardTitle className="font-headline">Análise Preditiva com IA</CardTitle>
        </div>
        <CardDescription>
          Utilize nossa inteligência artificial para prever tendências financeiras futuras com base nos seus dados.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="historicalData"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dados Históricos (formato CSV)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Ano,Receita,Despesa\n2022,100000,60000\n2023,120000,70000"
                      className="min-h-[120px] font-code text-sm"
                      {...field}
                      aria-describedby="historicalData-description"
                    />
                  </FormControl>
                  <FormDescription id="historicalData-description">
                    Insira os dados financeiros históricos da sua empresa. Quanto mais dados, melhor a precisão.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="industry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor da Indústria</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Varejo de Moda, Tecnologia SaaS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="economicConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condições Econômicas (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Inflação alta, crescimento do PIB, taxa de juros"
                      className="min-h-[80px] font-code text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Descreva brevemente o cenário econômico atual que pode impactar sua empresa.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4 border-t pt-6">
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analisar Tendências
                </>
              )}
            </Button>
            {error && <p className="text-sm text-destructive flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> {error}</p>}
          </CardFooter>
        </form>
      </Form>

      {predictionResult && !isLoading && (
        <div className="p-6 border-t mt-6 space-y-6">
          <h3 className="text-xl font-headline font-semibold text-primary flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6" />
            Resultados da Análise Preditiva
          </h3>
          <Card className="shadow-md rounded-md">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5"/>Tendências Previstas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{predictionResult.predictedTrends}</p>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-md">
            <CardHeader>
              <CardTitle className="text-lg font-headline">Nível de Confiança</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-sm font-medium ${
                predictionResult.confidenceLevel === "High" ? "text-green-600" :
                predictionResult.confidenceLevel === "Medium" ? "text-yellow-600" : "text-red-600"
              }`}>
                {predictionResult.confidenceLevel}
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md rounded-md">
            <CardHeader>
              <CardTitle className="text-lg font-headline flex items-center gap-2"><Lightbulb className="h-5 w-5"/>Recomendações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{predictionResult.recommendations}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
