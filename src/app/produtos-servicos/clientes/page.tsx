
import { Users, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function ClientesPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestão de Clientes
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Visualize, adicione e gerencie seus clientes.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/produtos-servicos/clientes/novo">
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Cliente
          </Link>
        </Button>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>Aqui será exibida a lista de clientes cadastrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">Nenhum cliente cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground mt-2">Clique em "Novo Cliente" para começar.</p>
          </div>
          {/* Placeholder para a tabela/lista de clientes */}
        </CardContent>
      </Card>
    </div>
  );
}
