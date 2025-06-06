
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AgendaPage() {
  return (
    <div className="space-y-8">
      <section className="text-center sm:text-left">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
          <CalendarDays className="h-8 w-8" />
          Agenda de Atendimentos
        </h2>
        <p className="mt-2 text-lg text-muted-foreground">
          Visualize e gerencie seus agendamentos.
        </p>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Visualização da Agenda</CardTitle>
          <CardDescription>Aqui será exibido o calendário ou lista de atendimentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">A agenda será implementada aqui.</p>
            {/* Placeholder para calendário/lista de agenda */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
