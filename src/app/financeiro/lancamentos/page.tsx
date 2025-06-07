
import { ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function LancamentosFinanceirosPage() {
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <ListChecks className="h-8 w-8" />
          Lançamentos Financeiros
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Visualize o histórico de todas as suas transações financeiras.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Histórico de Lançamentos</CardTitle>
            <CardDescription>Receitas e despesas registradas.</CardDescription>
          </div>
          <Button asChild variant="outline">
            <Link href="/financeiro/despesas/nova">Adicionar Despesa</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">A tabela com seus lançamentos financeiros será exibida aqui.</p>
            <p className="text-sm text-muted-foreground mt-2">(Em desenvolvimento)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
