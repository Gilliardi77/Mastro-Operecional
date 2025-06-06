import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Palette, ImageIcon, Brain } from 'lucide-react';
import AISuggestionForm from '@/components/ai/AISuggestionForm';
import ModulePromptGeneratorForm from '@/components/ai/ModulePromptGeneratorForm';

export default function Home() {
  return (
    <div className="space-y-12">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Bem-vindo à Extensão de Módulo Business Maestro
        </h2>
        <p className="mt-4 text-lg text-muted-foreground">
          Aproveite ferramentas poderosas e IA para construir módulos consistentes e profissionais para sua aplicação Business Maestro.
        </p>
      </section>

      {/* ShadCN UI Showcase Section */}
      <section id="ui-showcase" aria-labelledby="ui-showcase-title">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle id="ui-showcase-title" className="flex items-center gap-2 font-headline text-2xl text-primary">
              <Palette className="h-7 w-7" />
              Demonstração ShadCN UI
            </CardTitle>
            <CardDescription>
              Explore uma variedade de componentes ShadCN UI pré-estilizados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold">Botões</h4>
                <div className="flex flex-wrap gap-2">
                  <Button>Padrão</Button>
                  <Button variant="destructive">Destrutivo</Button>
                  <Button variant="outline">Contorno</Button>
                  <Button variant="secondary">Secundário</Button>
                  <Button variant="ghost">Fantasma</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Input com Rótulo</h4>
                <div className="space-y-2">
                  <Label htmlFor="name-input">Nome</Label>
                  <Input id="name-input" type="text" placeholder="Digite seu nome" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <h4 className="font-semibold">Checkbox & Switch</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox id="terms-checkbox" />
                  <Label htmlFor="terms-checkbox">Aceitar termos e condições</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="notifications-switch" />
                  <Label htmlFor="notifications-switch">Ativar notificações</Label>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-semibold">Select</h4>
                <Select>
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue placeholder="Selecione uma fruta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apple">Maçã</SelectItem>
                    <SelectItem value="banana">Banana</SelectItem>
                    <SelectItem value="blueberry">Mirtilo</SelectItem>
                    <SelectItem value="grapes">Uvas</SelectItem>
                    <SelectItem value="pineapple">Abacaxi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">Saiba Mais</Button>
          </CardFooter>
        </Card>
      </section>

      {/* Image Optimization Section */}
      <section id="image-optimization" aria-labelledby="image-optimization-title">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle id="image-optimization-title" className="flex items-center gap-2 font-headline text-2xl text-primary">
              <ImageIcon className="h-7 w-7" />
              Otimização de Imagem
            </CardTitle>
            <CardDescription>
              Usando `next/image` para imagens otimizadas e placeholders.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="relative h-64 w-full max-w-md overflow-hidden rounded-lg shadow-md sm:h-80 md:h-96">
              <Image
                src="https://placehold.co/600x400.png"
                alt="Placeholder Equipe de Negócios"
                layout="fill"
                objectFit="cover"
                data-ai-hint="business team"
              />
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-sm text-muted-foreground">
              Imagens de placeholder incluem `data-ai-hint` para sugestões de imagens relevantes.
            </p>
          </CardFooter>
        </Card>
      </section>

      {/* AI Content Generation Section */}
      <section id="ai-generation" aria-labelledby="ai-generation-title">
        <div className="text-center mb-8">
            <h2 id="ai-generation-title" className="flex items-center justify-center gap-2 font-headline text-2xl text-primary">
              <Brain className="h-7 w-7" />
              Ferramentas de Geração com IA
            </h2>
            <p className="mt-2 text-muted-foreground">
                Utilize a integração Genkit para criação inteligente de conteúdo e prompts.
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
