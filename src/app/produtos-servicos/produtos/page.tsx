
import { Package, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function ProdutosPage() {
  return (
    <div className="space-y-8">
      <section className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl flex items-center gap-2">
            <Package className="h-8 w-8" />
            Gestão de Produtos
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">
            Visualize, adicione e gerencie seus produtos e estoque.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/produtos-servicos/produtos/novo">
            <PlusCircle className="mr-2 h-5 w-5" /> Novo Produto
          </Link>
        </Button>
      </section>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>Aqui será exibida a lista de produtos cadastrados.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-8 text-center border-2 border-dashed rounded-md border-muted">
            <p className="text-muted-foreground">Nenhum produto cadastrado ainda.</p>
             <p className="text-sm text-muted-foreground mt-2">Clique em "Novo Produto" para começar.</p>
          </div>
          {/* Placeholder para a tabela/lista de produtos */}
        </CardContent>
      </Card>
    </div>
  );
}
