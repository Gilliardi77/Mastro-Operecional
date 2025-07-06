'use server';
/**
 * @fileOverview Um fluxo Genkit para analisar dados de negócios e gerar um plano estratégico completo.
 *
 * - generateGoalsAnalysis - Função principal que executa o fluxo.
 * - GenerateGoalsAnalysisInput - Schema de entrada para o fluxo.
 * - GenerateGoalsAnalysisOutput - Schema de saída para o fluxo.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Schema para a entrada da FUNÇÃO/FLUXO EXPORTADO
const GenerateGoalsAnalysisInputSchema = z.object({
  currentRevenue: z.number().describe('A receita mensal atual do negócio.'),
  currentExpenses: z.number().describe('As despesas mensais atuais do negócio.'),
  targetRevenueGoal: z.number().describe('A meta de receita mensal desejada pelo usuário.'),
  userQuestion: z.string().min(10).describe('Uma pergunta ou descrição do cenário/objetivo específico do usuário (mínimo 10 caracteres).'),
  businessSegment: z.string().optional().describe("Segmento ou tipo de negócio, se informado pelo usuário."),
  // Novos campos opcionais para análise mais rica
  ticketMedioAtual: z.number().optional().describe("Ticket médio atual das vendas (opcional)."),
  taxaConversaoOrcamentos: z.number().optional().describe("Taxa de conversão de orçamentos em vendas, em porcentagem (ex: 30 para 30%) (opcional)."),
  principaisFontesReceita: z.string().optional().describe("Principais produtos/serviços que geram receita (opcional)."),
  maioresCategoriasDespesa: z.string().optional().describe("Maiores categorias de despesa do negócio (opcional)."),
  saldoCaixaAtual: z.number().optional().describe("Saldo em caixa atual disponível para o negócio (opcional)."),
});
export type GenerateGoalsAnalysisInput = z.infer<typeof GenerateGoalsAnalysisInputSchema>;

// Schema para o payload que será efetivamente passado PARA O PROMPT
const PromptPayloadSchema = GenerateGoalsAnalysisInputSchema.extend({
  currentProfit: z.number().describe('Lucro mensal atual calculado (Receita - Despesas).'),
  revenueGap: z.number().describe('A diferença entre a meta de receita e a receita atual.'),
  targetProfit: z.number().describe('Lucro mensal estimado se a meta de receita for atingida (mantendo a mesma proporção de despesas sobre receita).'),
  consultantName: z.string().describe("Nome do consultor IA."),
  consultantPersona: z.string().describe("Persona e tom do consultor IA."),
});

// Schema para o output do PROMPT e do FLUXO
const GenerateGoalsAnalysisOutputSchema = z.object({
  currentProfit: z.number().describe('Lucro mensal atual (calculado pelo fluxo).'),
  targetProfit: z.number().describe('Lucro mensal estimado na meta (calculado pelo fluxo).'),
  revenueGap: z.number().describe('Diferença para atingir a meta de receita (calculado pelo fluxo).'),
  
  // Campos gerados pela IA
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
export type GenerateGoalsAnalysisOutput = z.infer<typeof GenerateGoalsAnalysisOutputSchema>;


export async function generateGoalsAnalysis(
  input: GenerateGoalsAnalysisInput
): Promise<GenerateGoalsAnalysisOutput> {
  return generateGoalsAnalysisFlow(input);
}

const goalsAnalysisPrompt = ai.definePrompt({
  name: 'goalsAnalysisPrompt',
  output: { schema: GenerateGoalsAnalysisOutputSchema.pick({
    businessDiagnosis: true,
    goalJustification: true,
    goalDifficulty: true,
    weeklyBreakdown: true,
    costReductionSuggestions: true,
    strategicSuggestions: true,
    preventiveAlerts: true
  }) },
  input: { schema: PromptPayloadSchema },
  prompt: `
Você é {{consultantName}}, um {{consultantPersona}}.

O usuário forneceu os seguintes dados sobre o negócio:
- Receita Mensal Atual: R$ {{currentRevenue}}
- Despesas Mensais Atuais: R$ {{currentExpenses}}
- Lucro Mensal Atual (calculado): R$ {{currentProfit}}
- Meta de Receita Mensal Desejada: R$ {{targetRevenueGoal}}
- Diferença para Meta de Receita: R$ {{revenueGap}}
- Lucro Estimado na Meta (calculado): R$ {{targetProfit}}
{{#if businessSegment}}- Segmento informado: {{businessSegment}}{{/if}}
{{#if ticketMedioAtual}}- Ticket Médio Atual: R$ {{ticketMedioAtual}}{{/if}}
{{#if taxaConversaoOrcamentos}}- Taxa de Conversão de Orçamentos: {{taxaConversaoOrcamentos}}%{{/if}}
{{#if principaisFontesReceita}}- Principais Fontes de Receita: {{principaisFontesReceita}}{{/if}}
{{#if maioresCategoriasDespesa}}- Maiores Categorias de Despesa: {{maioresCategoriasDespesa}}{{/if}}
{{#if saldoCaixaAtual}}- Saldo em Caixa Atual: R$ {{saldoCaixaAtual}}{{/if}}

O usuário descreveu seu cenário, dores ou pergunta da seguinte forma:
"{{userQuestion}}"

Sua tarefa é atuar como um Consultor IA especialista, fornecendo uma análise estratégica completa, útil e simples. Seja direto, prático e realista.

1.  **Diagnóstico do Negócio (businessDiagnosis):**
    *   Com base em TODOS os dados, faça um diagnóstico conciso (1-2 parágrafos) da situação atual. Destaque pontos fortes e fracos implícitos nos números.

2.  **Análise da Meta (goalDifficulty e goalJustification):**
    *   Avalie a meta de R$ {{targetRevenueGoal}}.
    *   Classifique a dificuldade em alcançá-la como 'Fácil', 'Moderado', 'Difícil' ou 'Desafiador'.
    *   Justifique sua classificação em um texto conciso, explicando por que a meta é atingível (ou não) e o que a torna desafiadora.

3.  **Plano Semanal para o Mês Vigente (weeklyBreakdown):**
    *   Divida a meta de aumento de receita (R$ {{revenueGap}}) em 4 semanas.
    *   Para cada semana, defina um foco claro e liste de 2 a 3 tarefas práticas e mensuráveis.
    *   Exemplo de tarefa para uma semana: "Realizar 5 contatos de acompanhamento com clientes antigos para oferecer um novo serviço, visando gerar R$ XXX em vendas."
    *   O resultado deve ser um array de 4 objetos, um para cada semana, com o campo 'week' (ex: "Semana 1") e 'tasks'.

4.  **Alavancas de Crescimento:**
    *   **Redução de Custos (costReductionSuggestions):** Liste 2-3 sugestões ACIONÁVEIS para reduzir as despesas com base nas categorias informadas ou em custos comuns para o segmento. Seja específico (ex: "Renegociar o plano de telefonia/internet" em vez de "Reduzir custos").
    *   **Sugestões Estratégicas (strategicSuggestions):** Liste 2-3 sugestões de alto impacto para AUMENTAR a receita (ex: "Criar um pacote de serviço básico para atrair novos clientes", "Implementar uma campanha de indicação com desconto de 5%").

5.  **Alertas Preventivos (preventiveAlerts):** (Opcional)
    *   Liste 0-2 riscos ou pontos de atenção críticos com base nos dados (ex: "O baixo saldo em caixa exige cautela com novos investimentos."). Se não houver, retorne uma lista vazia.

Responda em Português do Brasil. Seja objetivo e foque em fornecer valor real e acionável.
`,
});

const generateGoalsAnalysisFlow = ai.defineFlow(
  {
    name: 'generateGoalsAnalysisFlow',
    inputSchema: GenerateGoalsAnalysisInputSchema,
    outputSchema: GenerateGoalsAnalysisOutputSchema,
  },
  async (input: GenerateGoalsAnalysisInput): Promise<GenerateGoalsAnalysisOutput> => {
    const currentProfit = input.currentRevenue - input.currentExpenses;
    const revenueGap = input.targetRevenueGoal > input.currentRevenue ? input.targetRevenueGoal - input.currentRevenue : 0;
    const expenseRatio = input.currentRevenue > 0 ? input.currentExpenses / input.currentRevenue : 0;
    const targetProfit = input.targetRevenueGoal - (input.targetRevenueGoal * expenseRatio);

    const promptPayload: z.infer<typeof PromptPayloadSchema> = {
      ...input,
      currentProfit,
      revenueGap,
      targetProfit,
      consultantName: "Maestro IA",
      consultantPersona: "Consultor de negócios especialista, tom 'Pai mentor': firme, direto, honesto, mas com profundo interesse no sucesso do usuário. Foco em clareza, praticidade e ação.",
    };

    const { output } = await goalsAnalysisPrompt(promptPayload);

    if (!output || !output.businessDiagnosis || !output.goalJustification || !output.weeklyBreakdown) {
      console.error("AI output is missing required fields:", output);
      throw new Error('A IA não conseguiu gerar todas as partes da análise estratégica.');
    }

    return {
      currentProfit,
      targetProfit,
      revenueGap,
      businessDiagnosis: output.businessDiagnosis,
      goalJustification: output.goalJustification,
      goalDifficulty: output.goalDifficulty,
      weeklyBreakdown: output.weeklyBreakdown,
      costReductionSuggestions: output.costReductionSuggestions,
      strategicSuggestions: output.strategicSuggestions,
      preventiveAlerts: output.preventiveAlerts,
    };
  }
);
