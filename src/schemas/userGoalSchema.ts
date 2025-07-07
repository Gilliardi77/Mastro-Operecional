
import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';

// Based on generate-goals-analysis-flow.ts
export const GenerateGoalsAnalysisInputSchema = z.object({
  currentRevenue: z.number().describe('A receita mensal atual do negócio.'),
  currentExpenses: z.number().describe('As despesas mensais atuais do negócio.'),
  targetRevenueGoal: z.number().describe('A meta de receita mensal desejada pelo usuário.'),
  userQuestion: z.string().min(10).describe('Uma pergunta ou descrição do cenário/objetivo específico do usuário (mínimo 10 caracteres).'),
  businessSegment: z.string().optional().describe("Segmento ou tipo de negócio, se informado pelo usuário."),
  ticketMedioAtual: z.number().optional().describe("Ticket médio atual das vendas (opcional)."),
  taxaConversaoOrcamentos: z.number().optional().describe("Taxa de conversão de orçamentos em vendas, em porcentagem (ex: 30 para 30%) (opcional)."),
  principaisFontesReceita: z.string().optional().describe("Principais produtos/serviços que geram receita (opcional)."),
  maioresCategoriasDespesa: z.string().optional().describe("Maiores categorias de despesa do negócio (opcional)."),
  saldoCaixaAtual: z.number().optional().describe("Saldo em caixa atual disponível para o negócio (opcional)."),
});

export const GenerateGoalsAnalysisOutputSchema = z.object({
  currentProfit: z.number().describe('Lucro mensal atual (calculado pelo fluxo).'),
  targetProfit: z.number().describe('Lucro mensal estimado na meta (calculado pelo fluxo).'),
  revenueGap: z.number().describe('Diferença para atingir a meta de receita (calculado pelo fluxo).'),
  businessDiagnosis: z.string().describe("Diagnóstico conciso do negócio com base nos dados fornecidos."),
  goalJustification: z.string().describe("Justificativa da IA sobre a viabilidade da meta e a classificação de dificuldade."),
  goalDifficulty: z.enum(['Fácil', 'Moderado', 'Difícil', 'Desafiador']).describe("Classificação da dificuldade para atingir a meta."),
  weeklyBreakdown: z.array(z.object({
    week: z.string().describe("O número ou período da semana (ex: 'Semana 1')."),
    tasks: z.array(z.string()).describe("Lista de tarefas e metas para a semana."),
  })).describe("Plano de ação detalhado dividido por semanas para o mês corrente."),
  costReductionSuggestions: z.array(z.string()).describe("Sugestões específicas para redução de custos e despesas."),
  strategicSuggestions: z.array(z.string()).describe("Sugestões estratégicas de alto nível para crescimento (marketing, vendas, processos)."),
  preventiveAlerts: z.array(z.string()).optional().describe("Lista de possíveis alertas preventivos identificados pela IA."),
});

export const UserGoalSchema = BaseSchema.extend({
  inputData: GenerateGoalsAnalysisInputSchema.optional(),
  analysisResult: GenerateGoalsAnalysisOutputSchema.optional(),
  status: z.string().optional(),
  type: z.string().optional(),
});
export type UserGoal = z.infer<typeof UserGoalSchema>;
