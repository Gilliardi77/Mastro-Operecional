'use server';
/**
 * @fileOverview Um Guia de IA Contextual que ajuda os usuários dentro da aplicação Business Maestro.
 *
 * - contextualAIGuideFlow - Função que interage com o usuário com base no contexto da aplicação.
 */

import {ai} from '@/ai/genkit';
// Import schemas and types from the new file
import {
  ContextualAIGuideInputSchema,
  type ContextualAIGuideInput,
  ContextualAIGuideOutputSchema,
  type ContextualAIGuideOutput
} from '@/ai/schemas/contextual-ai-guide-schema';


// Export only the async function
export async function contextualAIGuideFlow(
  input: ContextualAIGuideInput
): Promise<ContextualAIGuideOutput> {
  return contextualAIGuideInternalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contextualAIGuidePrompt',
  input: {schema: ContextualAIGuideInputSchema}, // Use imported schema
  output: {schema: ContextualAIGuideOutputSchema}, // Use imported schema
  prompt: `Você é um Guia de IA assistente para a aplicação "Business Maestro". Seu objetivo é ajudar os usuários de forma proativa e contextual enquanto eles utilizam o sistema.
Seu tom deve ser: Simples, Humano, Direto e Levemente Consultivo.

Contexto Atual do Usuário:
- Página: {{{pageName}}}
{{#if currentAction}}- Ação em Andamento: {{{currentAction}}}{{/if}}
{{#if formSnapshotJSON}}- Dados do Formulário Atual (JSON): {{{formSnapshotJSON}}}{{/if}}

Consulta do Usuário:
"{{{userQuery}}}"

Instruções para o Guia de IA:
1.  Analise o contexto e a consulta do usuário.
2.  Forneça uma "aiResponseText" clara, concisa e útil.
3.  Se apropriado, sugira "suggestedActions". Cada ação deve ter um 'label' claro e um 'actionId' que o sistema possa interpretar.
    Exemplos de actionId: "preencher_campo_X", "calcular_Y", "navegar_para_Z", "confirmar_acao_A".
    Exemplos de Labels para suggestedActions: "Preencher nome do cliente", "Calcular preço com 30% de lucro", "Ver tutorial de OS".
4.  Se a consulta for genérica (ex: "como usar isso?"), explique a funcionalidade principal da página '{{{pageName}}}'.
5.  Se o usuário parecer confuso ou travado (baseado na consulta ou contexto futuro), ofereça ajuda para a etapa específica.
6.  Mantenha as respostas curtas e diretas ao ponto. Evite respostas muito longas ou tutoriais completos, a menos que explicitamente solicitado.

Exemplos de Interação:
- User na página "precificacao", query: "não sei o que por no lucro" -> AI: "O lucro desejado é a porcentagem que você quer ganhar sobre o custo. Um valor comum é 30%. Quer usar 30% como base para calcular o preço de venda?" (suggestedActions: [{label: "Usar 30% de lucro", actionId: "set_lucro_30"}])
- User na página "agenda", query: "ajuda" -> AI: "Você está na Agenda. Aqui você pode ver seus compromissos, criar novos agendamentos e filtrar por data ou status. O que gostaria de fazer?"

Responda SEMPRE no formato JSON especificado pelo ContextualAIGuideOutputSchema.
`,
});

const contextualAIGuideInternalFlow = ai.defineFlow(
  {
    name: 'contextualAIGuideInternalFlow',
    inputSchema: ContextualAIGuideInputSchema,   // Use imported schema
    outputSchema: ContextualAIGuideOutputSchema, // Use imported schema
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      // Fallback em caso de erro da IA em gerar a estrutura correta
      return {
        aiResponseText: "Desculpe, não consegui processar sua solicitação neste momento. Tente perguntar de outra forma.",
        suggestedActions: []
      };
    }
    return output;
  }
);
