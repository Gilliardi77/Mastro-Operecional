
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
    </div>
  );
}
