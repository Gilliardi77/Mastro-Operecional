
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, Sparkles, FilePlus2, ShoppingCart, CalendarDays, Users, PackageSearch, LayoutGrid } from 'lucide-react';
import AISuggestionForm from '@/components/ai/AISuggestionForm';
import ModulePromptGeneratorForm from '@/components/ai/ModulePromptGeneratorForm';
import InteractiveModuleGuide from '@/components/ai/InteractiveModuleGuide';

interface QuickAccessCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  cta: string;
}

function QuickAccessCard({ title, description, href, icon: Icon, cta }: QuickAccessCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Icon className="h-8 w-8 text-primary" />
          <CardTitle className="text-xl font-headline">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Pode adicionar um pequeno placeholder de conteúdo aqui se desejar no futuro */}
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href={href}>{cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function Home() {
  const quickAccessItems: QuickAccessCardProps[] = [
    {
      title: 'Nova Ordem de Serviço',
      description: 'Crie e gerencie ordens de serviço para seus clientes.',
      href: '/produtos-servicos/atendimentos/novo',
      icon: FilePlus2,
      cta: 'Criar OS',
    },
    {
      title: 'Balcão de Vendas',
      description: 'Realize vendas rápidas de produtos e serviços.',
      href: '/produtos-servicos/balcao',
      icon: ShoppingCart,
      cta: 'Ir para o Balcão',
    },
    {
      title: 'Agenda',
      description: 'Visualize e gerencie seus compromissos e agendamentos.',
      href: '/produtos-servicos/agenda',
      icon: CalendarDays,
      cta: 'Ver Agenda',
    },
    {
      title: 'Clientes',
      description: 'Cadastre e gerencie sua base de clientes.',
      href: '/produtos-servicos/clientes',
      icon: Users,
      cta: 'Gerenciar Clientes',
    },
    {
      title: 'Produtos e Serviços',
      description: 'Administre seu catálogo de produtos e tipos de serviços.',
      href: '/produtos-servicos/produtos',
      icon: PackageSearch,
      cta: 'Ver Produtos/Serviços',
    },
    {
      title: 'Dashboard Produtos/Serviços',
      description: 'Visão geral do módulo de Produtos e Serviços.',
      href: '/produtos-servicos',
      icon: LayoutGrid,
      cta: 'Acessar Módulo',
    },
  ];

  return (
    <div className="space-y-16">
      <section className="text-center py-8 bg-gradient-to-br from-primary/5 via-background to-background rounded-xl shadow-inner">
        <h2 className="font-headline text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Bem-vindo ao Maestro Operacional
        </h2>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Sua plataforma completa para gerenciar clientes, serviços, agenda, vendas e muito mais, com o poder da Inteligência Artificial para otimizar suas operações.
        </p>
      </section>

      <section id="quick-access" aria-labelledby="quick-access-title">
        <div className="text-center mb-10">
          <h3 id="quick-access-title" className="font-headline text-3xl text-foreground">
            Acesso Rápido
          </h3>
          <p className="mt-2 text-muted-foreground">Comece a operar rapidamente com as principais funcionalidades.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quickAccessItems.map((item) => (
            <QuickAccessCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      <section id="ai-tools" aria-labelledby="ai-tools-title">
        <div className="text-center mb-10 mt-20">
            <h3 id="ai-tools-title" className="flex items-center justify-center gap-3 font-headline text-3xl text-foreground">
              <Sparkles className="h-8 w-8 text-primary" />
              Potencialize sua Criação com IA
            </h3>
            <p className="mt-2 text-muted-foreground">
                Utilize nossas ferramentas de Inteligência Artificial para construir e personalizar módulos para o Maestro Operacional.
            </p>
        </div>
        
        <div className="mb-12">
          <InteractiveModuleGuide />
        </div>

        <div className="text-center mb-8">
            <h4 className="flex items-center justify-center gap-2 font-headline text-2xl text-primary">
              <Brain className="h-7 w-7" />
              Outras Ferramentas de Geração
            </h4>
            <p className="mt-1 text-sm text-muted-foreground">
                Criação inteligente de conteúdo e prompts de módulo mais diretos.
            </p>
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <AISuggestionForm />
          <ModulePromptGeneratorForm />
        </div>
      </section>
    </div>
  );
}
