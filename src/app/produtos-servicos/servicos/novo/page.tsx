
import { Wrench, PlusSquare, ArrowLeft } from 'lucide-react'; // Usando PlusSquare para diferenciar
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
// Importaremos componentes de formulário do ShadCN UI aqui

export default function NovoServicoPage() {
  return (
    <div className="space-y-8">
      <section className="flex justify-between items-center">
         <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
                <Link href="/produtos-servicos/servicos">
                    <ArrowLeft className="h-5 w-5" />
                    <span className="sr-only">Voltar para Serviços</span>
                </Link>
            </Button>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
            <PlusSquare className="h-8 w-8" /> {/* Alterado de Wrench para não confundir com listagem */}
            Novo Serviço
            </h2>
        </div>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Formulário de Cadastro</CardTitle>
          <CardDescription>Preencha os dados do novo tipo de serviço.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">O formulário de novo serviço será implementado aqui.</p>
            {/* Placeholder para campos: Tipo, Tempo, Custo, etc. com ajuda da IA */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
