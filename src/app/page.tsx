import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
