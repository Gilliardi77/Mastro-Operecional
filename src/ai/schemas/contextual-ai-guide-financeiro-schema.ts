import { z } from 'genkit';

// Schema para as ações sugeridas pela IA
export const SuggestedActionSchema = z.object({
  label: z.string().describe('O texto amigável que será exibido no botão para o usuário.'),
  actionId: z.string().describe("Um identificador único para a ação que o sistema frontend pode interpretar (ex: 'navigate_to_page', 'fill_field_X')."),
  payload: z.any().optional().describe('Dados adicionais necessários para executar a ação (ex: { "path": "/financeiro" } ou { "fieldName": "productName", "value": "Novo Produto" }).'),
});
export type SuggestedAction = z.infer<typeof SuggestedActionSchema>;


// Schema para a entrada do flow do Guia de IA Contextual
export const ContextualAIGuideInputSchema = z.object({
  pageName: z.string().describe('O nome da página atual que o usuário está visualizando (ex: "Dashboard", "Financeiro", "Precificação").'),
  userQuery: z.string().describe('A pergunta ou comando do usuário para o guia de IA.'),
  currentAction: z.string().optional().describe('Opcional: A ação específica que o usuário está tentando realizar na página (ex: "criando_novo_lancamento", "filtrando_relatorio").'),
  formSnapshotJSON: z.string().optional().describe('Opcional: Um snapshot JSON dos dados atuais de um formulário que o usuário pode estar preenchendo.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    text: z.string(),
  })).optional().describe('Opcional: Histórico recente da conversa para manter o contexto. "model" é a IA.'),
});
export type ContextualAIGuideInput = z.infer<typeof ContextualAIGuideInputSchema>;


// Schema para a saída do flow do Guia de IA Contextual
export const ContextualAIGuideOutputSchema = z.object({
  aiResponseText: z.string().describe('A resposta textual da IA para o usuário.'),
  suggestedActions: z.array(SuggestedActionSchema).optional().describe('Uma lista de ações que o usuário pode tomar, apresentadas como botões clicáveis.'),
});
export type ContextualAIGuideOutput = z.infer<typeof ContextualAIGuideOutputSchema>;
