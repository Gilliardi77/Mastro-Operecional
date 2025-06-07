
'use server';
/**
 * @fileOverview Um Guia de IA Contextual que ajuda os usuários dentro da aplicação Business Maestro.
 *
 * - contextualAIGuideFlow - Função que interage com o usuário com base no contexto da aplicação.
 * - ContextualAIGuideInput - Tipo de entrada para a função contextualAIGuideFlow.
 * - ContextualAIGuideOutput - Tipo de saída para a função contextualAIGuideFlow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const ContextualAIGuideInputSchema = z.object({
  pageName: z.string().describe('O nome ou rota da página atual que o usuário está visualizando. Ex: "/produtos-servicos/agenda", "HomePage", "PrecificacaoPage".'),
  userQuery: z.string().min(1, {message: 'A consulta do usuário não pode estar vazia.'}).describe('A pergunta ou comando do usuário para a IA Guia.'),
  currentAction: z.string().optional().describe('A ação específica que o usuário está tentando realizar. Ex: "criando_novo_atendimento", "cadastrando_cliente", "editando_os".'),
  formSnapshotJSON: z.string().optional().describe('Um JSON stringificado do estado atual de um formulário que o usuário pode estar preenchendo. Inclui campos e seus valores.'),
  // userHistorySnippet: z.string().optional().describe('Um breve resumo das ações recentes do usuário no app para dar mais contexto à IA.'), // Poderia ser adicionado futuramente
});
export type ContextualAIGuideInput = z.infer<typeof ContextualAIGuideInputSchema>;

export const ContextualAIGuideOutputSchema = z.object({
  aiResponseText: z.string().describe('A resposta textual da IA para o usuário, formatada de forma amigável e útil.'),
  suggestedActions: z.array(
      z.object({
        label: z.string().describe('O texto a ser exibido no botão de ação sugerida.'),
        actionId: z.string().describe('Um identificador único para a ação (ex: "preencher_campo_nome", "calcular_preco_sugerido", "navegar_para_ajuda_clientes").'),
        payload: z.any().optional().describe('Dados adicionais necessários para executar a ação sugerida (ex: { campo: "nome", valor: "Sugestão da IA" }).'),
      })
    ).optional().describe('Uma lista de ações que a IA sugere que o usuário ou o sistema podem tomar.'),
  confidenceScore: z.number().min(0).max(1).optional().describe('Um score de confiança (0-1) sobre a relevância e precisão da resposta/sugestão.'),
});
export type ContextualAIGuideOutput = z.infer<typeof ContextualAIGuideOutputSchema>;

export async function contextualAIGuideFlow(
  input: ContextualAIGuideInput
): Promise<ContextualAIGuideOutput> {
  return contextualAIGuideInternalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contextualAIGuidePrompt',
  input: {schema: ContextualAIGuideInputSchema},
  output: {schema: ContextualAIGuideOutputSchema},
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
    inputSchema: ContextualAIGuideInputSchema,
    outputSchema: ContextualAIGuideOutputSchema,
  },
  async (input) => {
    // Simulação de lógica mais complexa baseada no contexto pode vir aqui no futuro.
    // Por enquanto, passamos diretamente para o prompt.
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
