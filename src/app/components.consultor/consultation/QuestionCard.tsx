
"use client";

import type { Question, BlockConfig } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface QuestionCardProps {
  question: Question | null;
  blockConfig: BlockConfig | null;
  totalBlocks: number;
}

export function QuestionCard({ question, blockConfig, totalBlocks }: QuestionCardProps) {
  if (!question || !blockConfig) {
    return (
      <Card className="w-full max-w-2xl animate-pulse">
        <CardHeader>
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-8 bg-muted rounded w-3/4 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded w-full"></div>
        </CardContent>
      </Card>
    );
  }
  
  const blockTitle = `🧠 Bloco ${blockConfig.index + 1} de ${totalBlocks} — ${blockConfig.tema}`;
  const questionNumbering = `Pergunta ${question.questionNumberInBlock} de ${blockConfig.numero_perguntas}:`;

  return (
    <Card className="w-full max-w-2xl bg-card shadow-xl">
      <CardHeader>
        <CardDescription className="font-medium text-primary">{blockTitle}</CardDescription>
        <CardTitle className="text-xl font-semibold !mt-2">
          <span className="block text-base font-normal text-muted-foreground mb-1">{questionNumbering}</span>
          {question.text}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
