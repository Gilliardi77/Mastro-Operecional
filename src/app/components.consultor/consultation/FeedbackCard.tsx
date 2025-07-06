
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";

interface FeedbackCardProps {
  feedback: string | null;
  isLoading: boolean;
  consultantName?: string;
}

export function FeedbackCard({ feedback, isLoading, consultantName = "MAE - Maestro AI Expert" }: FeedbackCardProps) {
  if (isLoading && !feedback) {
     return (
      <Card className="mt-6 w-full max-w-2xl self-start animate-pulse bg-secondary/50">
        <CardHeader className="flex flex-row items-center space-x-2 pb-2">
          <Bot className="h-6 w-6 text-secondary-foreground" />
          <CardTitle className="text-sm font-medium text-secondary-foreground">{consultantName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) {
    return null;
  }

  return (
    <Card className="mt-6 w-full max-w-2xl self-start rounded-xl bg-secondary/80 shadow-lg dark:bg-secondary/30">
      <CardHeader className="flex flex-row items-center space-x-3 border-b border-secondary-foreground/10 pb-3 pt-4 px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-6 w-6" />
        </div>
        <CardTitle className="text-base font-semibold text-primary">{consultantName}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4 px-4 pb-4">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {feedback}
        </p>
      </CardContent>
    </Card>
  );
}
