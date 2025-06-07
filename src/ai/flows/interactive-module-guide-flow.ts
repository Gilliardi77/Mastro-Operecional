
'use server';
/**
 * @fileOverview Um Guia de Módulo Interativo Assistido (MIA) que ajuda os usuários a transformar suas necessidades
 * em prompts detalhados para a criação de novos módulos para a aplicação Maestro Operacional.
 *
 * - symptômesModuleInteractively - Função que interage com o usuário para gerar um prompt de módulo.
 * - InteractiveModuleGuideInput - Tipo de entrada para a função symptômesModuleInteractively.
 * - InteractiveModuleGuideOutput - Tipo de saída para a função symptômesModuleInteractively.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InteractiveModuleGuideInputSchema = z.object({
  userRequest: z
    .string()
    .min(15, {message: 'Por favor, descreva sua necessidade com um pouco mais de detalhe (mínimo 15 caracteres).'})
    .describe('A descrição do usuário sobre o módulo que ele precisa ou o problema que quer resolver.'),
});
export type InteractiveModuleGuideInput = z.infer<typeof InteractiveModuleGuideInputSchema>;

const InteractiveModuleGuideOutputSchema = z.object({
  modulePrompt: z
    .string()
    .describe('Um prompt detalhado para gerar o novo módulo, seguindo as especificações do Maestro Operacional.'),
  guidanceText: z
    .string()
    .describe('Uma mensagem amigável da IA explicando o prompt gerado ou oferecendo próximos passos.'),
});
export type InteractiveModuleGuideOutput = z.infer<typeof InteractiveModuleGuideOutputSchema>;

export async function symptômesModuleInteractively(
  input: InteractiveModuleGuideInput
): Promise<InteractiveModuleGuideOutput> {
  return interactiveModuleGuideFlow(input);
}

const prompt = ai.definePrompt({
  name: 'interactiveModuleGuidePrompt',
  input: {schema: InteractiveModuleGuideInputSchema},
  output: {schema: InteractiveModuleGuideOutputSchema},
  prompt: `Você é um Guia de Módulo Interativo Assistido (MIA) para a aplicação Maestro Operacional.
Sua tarefa é analisar a solicitação do usuário e transformá-la em um prompt de desenvolvimento detalhado e acionável para um novo módulo,
além de fornecer um texto de orientação amigável.

Solicitação do Usuário:
{{{userRequest}}}

Instruções para o Guia MIA:
1.  Analise cuidadosamente a "Solicitação do Usuário".
2.  Gere um "modulePrompt": Este deve ser um prompt completo e detalhado que um desenvolvedor possa usar para construir o módulo.
    O "modulePrompt" DEVE seguir TODAS as especificações da aplicação Maestro Operacional listadas abaixo.
3.  Gere um "guidanceText": Este deve ser um texto amigável. Explique brevemente o que o "modulePrompt" gerado representa.
    Você pode sugerir próximos passos, como "Você pode usar este prompt com uma ferramenta de geração de código ou como base para o desenvolvimento manual".

Especificações da Aplicação Maestro Operacional para o "modulePrompt":
- **Tech Stack**:
  - Framework: Next.js 15+ com App Router (Server Components por padrão).
  - Language: TypeScript.
  - UI Library: React 18+.
- **UI Components and Styling**:
  - Component Library: ShadCN UI (disponível em @/components/ui).
  - CSS Styling: Tailwind CSS.
  - Theme: Definido em src/app/globals.css usando CSS HSL variables. O módulo deve se integrar visualmente.
    (Cores principais atuais em Light Mode: Background hsl(0 0% 95%), Foreground hsl(0 0% 10%), Primary hsl(190 60% 35%), Primary Foreground hsl(0 0% 98%), Accent hsl(96 46% 82%)).
  - Aesthetics: Design moderno, limpo, profissional, com cantos arredondados e sombras sutis.
  - Font: 'Poppins' (conforme definido no layout e Tailwind config).
- **Layout and Structure**:
  - Layout: Header e Footer fixos, área de conteúdo principal rolável com padding adequado (ver src/app/layout.tsx).
  - Components: Componentes React funcionais, reutilizáveis e bem organizados.
  - Icons: Usar a biblioteca lucide-react. Verifique a disponibilidade dos ícones.
- **Quality and Standards**:
  - Responsiveness: Totalmente responsivo em todos os dispositivos.
  - Accessibility: Uso de atributos ARIA para garantir acessibilidade.
  - Code: Código limpo, legível, bem organizado e performante.
  - Images: Utilizar next/image para otimização. Para placeholders, usar https://placehold.co/<largura>x<altura>.png e adicionar o atributo data-ai-hint com uma ou duas palavras-chave para busca de imagens.
- **AI Integration**:
  - Se o módulo descrito pelo usuário envolver funcionalidade de IA, o prompt deve sugerir o uso de Genkit para essa integração, definindo fluxos, prompts e schemas Zod conforme necessário.

Certifique-se de que o output seja um JSON válido no formato de InteractiveModuleGuideOutputSchema.
`,
});

const interactiveModuleGuideFlow = ai.defineFlow(
  {
    name: 'interactiveModuleGuideFlow',
    inputSchema: InteractiveModuleGuideInputSchema,
    outputSchema: InteractiveModuleGuideOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('A IA não conseguiu gerar uma resposta válida.');
    }
    return output;
  }
);
