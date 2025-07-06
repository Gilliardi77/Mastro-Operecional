import { z } from 'genkit';

export const ProductPricingInputSchema = z.object({
  productName: z.string().describe('Nome do produto ou serviço.'),
  tipoPrecificacao: z.enum(['unitario', 'meta_periodica']).describe("Tipo de precificação: 'unitario' para custo unitário, 'meta_periodica' para atingir meta de lucro em um período."),
  
  directCost: z.number().nonnegative().describe('Custo direto/variável unitário do produto/serviço (matéria-prima, insumos, comissões diretas).'),
  
  // Campos para tipo 'unitario'
  indirectCost: z.number().nonnegative().optional().describe('Custo indireto unitário estimado (rateio de aluguel, luz, etc.). Obrigatório se tipoPrecificacao="unitario".'),

  // Campos para tipo 'meta_periodica'
  custoFixoTotalPeriodo: z.number().nonnegative().optional().describe('Custos fixos totais do período (ex: mensal). Obrigatório se tipoPrecificacao="meta_periodica".'),
  vendasEstimadasPeriodo: z.number().int().positive().optional().describe('Unidades estimadas de venda no período. Obrigatório se tipoPrecificacao="meta_periodica".'),
  tempoProducaoHoras: z.number().nonnegative().optional().describe('Tempo total em horas para produzir as unidades estimadas no período.'),

  profitMarginType: z.enum(['percentage', 'fixed']).describe("Tipo da margem de lucro desejada a ser aplicada sobre o custo base: 'percentage' para percentual, 'fixed' para valor fixo em R$."),
  profitMarginValue: z.number().positive().describe('Valor da margem de lucro desejada (se percentual, ex: 30 para 30%; se fixo, ex: 50 para R$50,00).'),
});
export type ProductPricingInput = z.infer<typeof ProductPricingInputSchema>;

// Schema para a saída do prompt da IA (focado na justificativa e análise)
export const PricingAnalysisPromptOutputSchema = z.object({
    humanExplanation: z.string().describe('Uma explicação clara e simples de como o preço foi formado, o que ele cobre e qual o lucro esperado por unidade com base nos dados fornecidos. DEVE começar com a fórmula: Preço de Venda (R$ X) = Custo Base Unitário (R$ Y) + Margem Aplicada (R$ Z).'),
    keyConsiderations: z.string().describe('Pontos importantes para o usuário pensar, como o impacto do volume de vendas (especialmente para metas periódicas), ou o ponto de equilíbrio específico para este item/preço. Incluir diagnósticos diretos, por exemplo: "Sua estimativa de vendas está baixa, o que aumenta o custo por unidade." ou "Sua margem de X% está abaixo da média do mercado para este tipo de produto."'),
    alternativeScenariosOrAdvice: z.string().describe('Sugestões acionáveis como otimizar custos, ajustar a margem, estratégias de venda, ou outras dicas relevantes para melhorar a rentabilidade ou o posicionamento do preço. Exemplo: "Para atingir sua meta de lucro de R$ Y com a margem atual, você precisaria vender Z unidades."'),
    customProductAdvice: z.string().optional().describe('Conselhos específicos se o produto/serviço parecer ser único, sob medida ou artesanal (ex: considerar tempo de produção, valor percebido, margem de risco). Preenchido apenas se relevante.')
});
export type PricingAnalysisPromptOutput = z.infer<typeof PricingAnalysisPromptOutputSchema>;


// Schema para a entrada do prompt da IA (inclui o preço calculado e o custo base)
// Mantido como está, pois o prompt template input schema será usado para o prompt em si.
export const PricingAnalysisPromptInputSchema = ProductPricingInputSchema.extend({
    calculatedSuggestedPrice: z.number().describe('O preço de venda que foi pré-calculado com base nos custos e margem.'),
    baseCostPerUnit: z.number().describe('O custo base unitário calculado (direto + rateio de fixos/indiretos, dependendo do tipo de precificação).')
});
export type PricingAnalysisPromptInput = z.infer<typeof PricingAnalysisPromptInputSchema>;


// Schema para a saída do flow principal
export const ProductPricingOutputSchema = z.object({
  suggestedPrice: z.number().describe('O preço de venda sugerido calculado.'),
  baseCostPerUnit: z.number().describe('O custo base unitário calculado para o produto.'),
  analysis: PricingAnalysisPromptOutputSchema.describe('Análise detalhada e insights sobre o preço sugerido, gerada por IA.'),
});
export type ProductPricingOutput = z.infer<typeof ProductPricingOutputSchema>;


// Novo Schema para os dados que REALMENTE serão passados para o template do prompt
export const PromptTemplateInputSchemaInternal = z.object({
  productName: z.string(),
  tipoPrecificacao: z.enum(['unitario', 'meta_periodica']),
  directCostFormatted: z.string(),
  indirectCostFormatted: z.string().optional(),
  custoFixoTotalPeriodoFormatted: z.string().optional(),
  vendasEstimadasPeriodo: z.number().optional(),
  tempoProducaoHoras: z.number().optional(),
  baseCostPerUnitFormatted: z.string(),
  profitMarginType: z.enum(['percentage', 'fixed']),
  profitMarginValueInput: z.number(), 
  profitMarginValueInCurrencyFormatted: z.string(),
  calculatedSuggestedPriceFormatted: z.string(),
  lucroPorHoraFormatted: z.string().optional(),
});
export type PromptTemplateInputInternal = z.infer<typeof PromptTemplateInputSchemaInternal>;
