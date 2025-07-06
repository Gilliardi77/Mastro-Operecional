"use client";

import { useState, type FormEvent } from "react";
import { Calculator, Percent, TrendingUp, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FinancialCalculator() {
  const [revenue, setRevenue] = useState<string>("");
  const [expenses, setExpenses] = useState<string>("");
  const [profit, setProfit] = useState<number | null>(null);
  const [profitMargin, setProfitMargin] = useState<number | null>(null);

  const handleCalculate = (e: FormEvent) => {
    e.preventDefault();
    const numRevenue = parseFloat(revenue);
    const numExpenses = parseFloat(expenses);

    if (isNaN(numRevenue) || isNaN(numExpenses)) {
      setProfit(null);
      setProfitMargin(null);
      // TODO: Add toast notification for invalid input
      return;
    }

    const calculatedProfit = numRevenue - numExpenses;
    setProfit(calculatedProfit);

    if (numRevenue !== 0) {
      setProfitMargin((calculatedProfit / numRevenue) * 100);
    } else {
      setProfitMargin(null);
    }
  };

  return (
    <Card className="shadow-lg rounded-lg w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          <CardTitle className="font-headline">Calculadora Financeira Rápida</CardTitle>
        </div>
        <CardDescription>
          Calcule rapidamente o lucro e a margem de lucro.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleCalculate}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="revenue" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Receita Total (R$)
            </Label>
            <Input
              id="revenue"
              type="number"
              placeholder="Ex: 50000"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              required
              aria-label="Receita Total em Reais"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="expenses" className="flex items-center gap-1">
               <DollarSign className="h-4 w-4 text-muted-foreground" />
              Despesas Totais (R$)
            </Label>
            <Input
              id="expenses"
              type="number"
              placeholder="Ex: 30000"
              value={expenses}
              onChange={(e) => setExpenses(e.target.value)}
              required
              aria-label="Despesas Totais em Reais"
            />
          </div>
          <Button type="submit" className="w-full">
            <Calculator className="mr-2 h-4 w-4" />
            Calcular Métricas
          </Button>
        </CardContent>
      </form>
      {profit !== null && (
        <CardFooter className="flex flex-col items-start space-y-4 pt-6 border-t">
          <div className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-green-500" />
            <span className="font-medium">Lucro:</span>
            <span className="text-primary font-semibold">
              R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          {profitMargin !== null && (
            <div className="flex items-center gap-2 text-lg">
              <Percent className="h-5 w-5 text-blue-500" />
              <span className="font-medium">Margem de Lucro:</span>
              <span className="text-primary font-semibold">
                {profitMargin.toFixed(2)}%
              </span>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
