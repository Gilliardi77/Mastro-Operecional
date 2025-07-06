
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight, Bot, Lightbulb } from "lucide-react";
import { useConsultationContext } from "@/contexts/ConsultationContext";


interface BlockCommentScreenProps {
  blockComment: string;
  blockTheme: string;
  blockNumber: number;
  onProceed: () => void;
  isLastBlock: boolean;
  isLoading: boolean;
}

export function StageCompletionScreen({ // Renamed props for clarity with block concept
  blockComment,
  blockTheme,
  blockNumber,
  onProceed,
  isLastBlock,
  isLoading
}: BlockCommentScreenProps) {
  const { consultorMaestroData } = useConsultationContext();
  const consultantName = consultorMaestroData?.identidade?.nome || "MAE";
  
  if (isLoading && !blockComment) { // Show loading if AI was to generate this, but it's fixed now
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center">
        <Bot className="h-12 w-12 text-primary mb-4 animate-pulse" />
        <p className="text-lg font-semibold">Aguarde um momento...</p>
      </div>
    );
  }


  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <Card className="shadow-2xl bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Lightbulb className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Reflexão do Bloco {blockNumber}: {blockTheme}</CardTitle>
          <CardDescription className="text-lg text-muted-foreground mt-1">
            {consultantName} diz:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="rounded-lg border bg-secondary/30 dark:bg-secondary/20 p-4 shadow-sm">
              <p className="whitespace-pre-wrap text-md text-center font-medium text-foreground">{blockComment}</p>
            </div>
        </CardContent>
        <CardFooter className="flex justify-center pt-6">
          <Button onClick={onProceed} disabled={isLoading} size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
            {isLastBlock ? "Ver Diagnóstico Final" : `Avançar para Próximo Bloco`}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
