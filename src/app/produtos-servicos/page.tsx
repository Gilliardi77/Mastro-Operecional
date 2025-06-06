
import { CalendarDays, PlusCircle, BarChart3, Users, Package, Wrench, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';

export default function ProdutosServicosPage() {
  return (
    <div className="space-y-8">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Módulo Produtos + Serviços
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Gestão completa de atendimentos, orçamentos, ordens de serviço e mais.
        </p>
      </section>

      {/* Atalhos Principais e Status do Dia */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <CalendarDays className="h-6 w-6" />
              Agenda de Hoje
            </CardTitle>
            <CardDescription>Próximos atendimentos e tarefas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Placeholder para lista de atendimentos */}
            <div className="p-4 text-center border-2 border-dashed rounded-md border-muted">
              <p className="text-sm text-muted-foreground">Nenhum atendimento agendado para hoje.</p>
            </div>
            <Button variant="outline" className="w-full">Ver Agenda Completa</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <PlusCircle className="h-6 w-6" />
              Acesso Rápido
            </CardTitle>
            <CardDescription>Inicie um novo atendimento.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full">Novo Orçamento</Button>
            <Button className="w-full">Nova Ordem de Serviço</Button>
            <Button variant="secondary" className="w-full">Atendimento Rápido</Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline text-xl text-primary">
              <BarChart3 className="h-6 w-6" />
              Resumo do Dia
            </CardTitle>
            <CardDescription>Visão geral das atividades de hoje.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Placeholders para resumo */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Serviços:</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Entregas:</span>
              <span className="font-semibold">0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vendas:</span>
              <span className="font-semibold">R$ 0,00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Atrasos:</span>
              <span className="font-semibold">0</span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Atalhos de Gestão Básica */}
      <section>
        <h3 className="mb-4 text-xl font-semibold text-center text-primary">Gestão</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/produtos-servicos/clientes" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Users className="mr-3 h-7 w-7" /> Clientes
            </Button>
          </Link>
          <Link href="/produtos-servicos/produtos" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Package className="mr-3 h-7 w-7" /> Produtos
            </Button>
          </Link>
          <Link href="/produtos-servicos/servicos" passHref>
            <Button variant="outline" className="w-full h-16 text-lg justify-start p-4 shadow-md hover:shadow-lg transition-shadow">
              <Wrench className="mr-3 h-7 w-7" /> Serviços
            </Button>
          </Link>
        </div>
      </section>

      {/* Botão Flutuante IA - Placeholder Visual */}
      {/* Este será um componente global, mas adicionando um placeholder visual aqui por enquanto */}
      <div className="fixed bottom-6 right-6">
        <Button
          size="lg"
          className="rounded-full shadow-xl w-auto h-auto p-4"
          aria-label="Ajuda da IA"
        >
          <Bot className="h-7 w-7 mr-2" />
          Me Ajuda com isso
        </Button>
      </div>

    </div>
  );
}
