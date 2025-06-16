// src/ai/schemas/contextual-ai-guide-schema.ts
import {z} from 'genkit';

export const ContextualAIGuideInputSchema = z.object({
  pageName: z.string().describe('O nome ou rota da página atual que o usuário está visualizando. Ex: "/produtos-servicos/agenda", "HomePage", "PrecificacaoPage".'),
  userQuery: z.string().min(1, {message: 'A consulta do usuário não pode estar vazia.'}).describe('A pergunta ou comando do usuário para a IA Guia.'),
  currentAction: z.string().optional().describe('A ação específica que o usuário está tentando realizar. Ex: "criando_novo_atendimento", "cadastrando_cliente", "editando_os".'),
  formSnapshotJSON: z.string().optional().describe('Um JSON stringificado do estado atual de um formulário que o usuário pode estar preenchendo. Inclui campos e seus valores.'),
  chatHistory: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      text: z.string(),
    })
  ).optional().describe('Histórico das últimas mensagens da conversa para manter o contexto (opcional). Role "model" é a IA, "user" é o usuário.'),
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
