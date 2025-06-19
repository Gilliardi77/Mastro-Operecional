
import { TrendingUp, Calculator, ListChecks, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardFinanceiroPage() {
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Dashboard Financeiro
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Acompanhe a saúde financeira do seu negócio e acesse as principais funcionalidades.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                Operações de Caixa
            </CardTitle>
            <CardDescription>Ações relacionadas ao gerenciamento do seu caixa diário.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Realize o fechamento diário do seu caixa, registrando entradas, saídas, sangrias e troco.
            </p>
            <Button asChild className="w-full">
              <Link href="/financeiro/fechamento-caixa">
                <Calculator className="mr-2 h-5 w-5" /> Ir para Fechamento de Caixa
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6" />
                Lançamentos Financeiros
            </CardTitle>
            <CardDescription>Visualize o histórico de todas as suas transações financeiras.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Consulte todas as receitas e despesas registradas no sistema.
            </p>
            <Button asChild className="w-full">
              <Link href="/financeiro/lancamentos">
                <ListChecks className="mr-2 h-5 w-5" /> Ver Lançamentos
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

       <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Análises e Relatórios
            </CardTitle>
            <CardDescription>Insights e visualizações sobre suas finanças.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
              <p className="text-muted-foreground">Gráficos, DRE, fluxo de caixa e outras análises financeiras serão exibidos aqui.</p>
              <p className="text-sm text-muted-foreground mt-2">(Em desenvolvimento)</p>
            </div>
             <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                    <Link href="https://studio--viso-clara-financeira.us-central1.hosted.app" target="_blank">
                        Acessar Visão Clara Financeira <ExternalLink className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">Para análises financeiras avançadas, utilize o app Visão Clara Financeira.</p>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
