
import { TrendingUp, Calculator } from 'lucide-react'; // Adicionado Calculator
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Adicionado Button
import Link from 'next/link'; // Adicionado Link

export default function DashboardFinanceiroPage() {
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Dashboard Financeiro
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Acompanhe a saúde financeira do seu negócio.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Resumo dos seus indicadores financeiros.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
              <p className="text-muted-foreground">Os gráficos e indicadores financeiros serão exibidos aqui.</p>
              <p className="text-sm text-muted-foreground mt-2">(Em desenvolvimento)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                Operações de Caixa
            </CardTitle>
            <CardDescription>Ações relacionadas ao gerenciamento do seu caixa diário.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
             <div className="p-8 text-center border-2 border-dashed rounded-md border-muted w-full">
                 <p className="text-muted-foreground">Outras operações de caixa aparecerão aqui.</p>
                 <p className="text-sm text-muted-foreground mt-2">(Em desenvolvimento)</p>
            </div>
            <Button asChild className="w-full sm:w-auto">
              <Link href="/financeiro/fechamento-caixa">
                <Calculator className="mr-2 h-5 w-5" /> Ir para Fechamento de Caixa
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
