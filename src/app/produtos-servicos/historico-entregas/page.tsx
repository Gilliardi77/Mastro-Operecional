
import { History, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function HistoricoEntregasPage() {
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <History className="h-8 w-8" />
          Histórico de Entregas
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Consulte o status e detalhes das ordens de serviço concluídas e entregues.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-green-600" />
            Registros de Entregas
          </CardTitle>
          <CardDescription>Aqui será exibida a lista de entregas concluídas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">Nenhuma entrega registrada ainda ou funcionalidade em desenvolvimento.</p>
            {/* Placeholder para a tabela/lista de entregas */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
