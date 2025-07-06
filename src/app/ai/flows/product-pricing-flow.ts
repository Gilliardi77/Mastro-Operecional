
'use server';
/**
 * @fileOverview Flow para sugestão de preço de produtos/serviços usando IA para justificativa.
 * Incorpora diferentes tipos de precificação: unitário/personalizado e por meta periódica.
 *
 * - productPricingFlow - Calcula um preço de venda sugerido e usa IA para gerar a justificativa.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  ProductPricingInputSchema,
  type ProductPricingInput,
  ProductPricingOutputSchema,
  type ProductPricingOutput,
  PricingAnalysisPromptOutputSchema,
  PromptTemplateInputSchemaInternal, 
  type PromptTemplateInputInternal as PromptTemplateInput 
} from '@/ai/schemas/product-pricing-schema'; 


// Função interna para calcular o preço (TypeScript)
function calculateSuggestedPriceInternal(input: ProductPricingInput): { price: number; baseCost: number; marginAmount: number } {
  let baseCostPerUnit: number;

  const directCost = input.directCost || 0; 
  const indirectCost = input.indirectCost || 0; 
  const custoFixoTotalPeriodo = input.custoFixoTotalPeriodo || 0;
  const vendasEstimadasPeriodo = input.vendasEstimadasPeriodo || 1; 

  if (input.tipoPrecificacao === 'meta_periodica') {
    const fixedCostComponent = custoFixoTotalPeriodo / vendasEstimadasPeriodo;
    baseCostPerUnit = directCost + fixedCostComponent;
  } else { 
    baseCostPerUnit = directCost + indirectCost;
  }
  
  let calculatedPrice: number;
  let marginAmountValue: number;
  const profitMarginValue = input.profitMarginValue || 0; 

  if (input.profitMarginType === 'percentage') {
    const marginDecimal = profitMarginValue / 100;
    marginAmountValue = baseCostPerUnit * marginDecimal;
    calculatedPrice = baseCostPerUnit + marginAmountValue; // Preço = CustoBase + (CustoBase * MargemDecimal)
  } else { 
    marginAmountValue = profitMarginValue;
    calculatedPrice = baseCostPerUnit + marginAmountValue;
  }
  
  const finalPrice = parseFloat(calculatedPrice.toFixed(2));
  const finalBaseCost = parseFloat(baseCostPerUnit.toFixed(2));
  const finalMarginAmount = parseFloat(marginAmountValue.toFixed(2));

  return { price: finalPrice, baseCost: finalBaseCost, marginAmount: finalMarginAmount };
}


// Define o Prompt Genkit para a Justificativa da IA
const pricingAnalysisPrompt = ai.definePrompt({
  name: 'productPricingAnalysisPrompt',
  input: { schema: PromptTemplateInputSchemaInternal },
  output: { schema: PricingAnalysisPromptOutputSchema },
  prompt: `Você é um consultor de negócios experiente, especialista em finanças e precificação para pequenas e médias empresas. Seu tom é direto, humano e prático.

Analise os seguintes dados de precificação para o produto/serviço "{{productName}}":

DADOS FORNECIDOS PELO USUÁRIO:
- Método de Precificação: {{tipoPrecificacao}}
{{#if (eq tipoPrecificacao "unitario")}}
- Custo Direto Unitário: R$ {{directCostFormatted}}
- Custo Indireto Unitário (Rateio de Fixos): R$ {{indirectCostFormatted}}
{{else}}
- Custos Fixos Totais (Período): R$ {{custoFixoTotalPeriodoFormatted}}
- Vendas Estimadas (Período): {{vendasEstimadasPeriodo}} unidades
{{#if tempoProducaoHoras}}- Tempo de Produção (Período): {{tempoProducaoHoras}} horas{{/if}}
{{/if}}
- Margem Desejada: {{profitMarginValueInput}}{{#if (eq profitMarginType "percentage")}}% (sobre o custo){{else}} (valor fixo){{/if}}

RESULTADOS CALCULADOS:
- Custo Base por Unidade: R$ {{baseCostPerUnitFormatted}}
- Valor da Margem Aplicada: R$ {{profitMarginValueInCurrencyFormatted}}
- PREÇO DE VENDA SUGERIDO: R$ {{calculatedSuggestedPriceFormatted}}
{{#if (gt profitMarginValueInCurrency 0)}}- Lucro Bruto por Unidade: R$ {{profitMarginValueInCurrencyFormatted}}{{/if}}
{{#if (gt tempoProducaoHoras 0)}}- Lucro por Hora de Produção: R$ {{lucroPorHoraFormatted}}{{/if}}

Com base nisso, forneça uma análise clara e acionável, preenchendo os seguintes campos no formato JSON:

1.  **humanExplanation (Explicação Humanizada):**
    *   Comece com a fórmula principal de forma simples: **Preço de Venda (R$ {{calculatedSuggestedPriceFormatted}}) = Custo Base Unitário (R$ {{baseCostPerUnitFormatted}}) + Margem de Lucro (R$ {{profitMarginValueInCurrencyFormatted}}).**
    *   Explique em 1-2 frases como o "Custo Base Unitário" foi calculado, usando os dados do método de precificação escolhido.
    *   Se for "meta_periodica", mencione que os custos fixos totais foram divididos pela estimativa de vendas para encontrar a parcela de custo fixo por unidade.
    *   Se for "unitario", mencione que é a soma do custo direto e do rateio de indiretos.
    *   Finalize explicando que a margem desejada foi aplicada sobre esse custo base para chegar ao preço final.

2.  **keyConsiderations (Pontos de Atenção):**
    *   Forneça 2-3 pontos de atenção em formato de lista (bullet points, usando '- ' no início de cada linha).
    *   Se "meta_periodica", OBRIGATORIAMENTE alerte sobre o risco da estimativa de vendas: "- Sua estimativa de vendas ({{vendasEstimadasPeriodo}} unidade(s)) é o fator mais crítico. Se vender menos, seu lucro será menor, pois os custos fixos se diluem em menos unidades."
    *   Se "unitario", questione se o rateio de custo indireto (R$ {{indirectCostFormatted}}) é realista para cobrir os custos fixos do negócio.
    *   Sempre sugira comparar o preço final com o mercado para ver se é competitivo.
    {{#if (gt tempoProducaoHoras 0)}}*   Seu tempo é valioso. As {{tempoProducaoHoras}} horas de produção não estão no cálculo financeiro. Avalie se o lucro por hora de R$ {{lucroPorHoraFormatted}} remunera adequadamente seu esforço.{{/if}}

3.  **alternativeScenariosOrAdvice (Ações Recomendadas):**
    *   Forneça 1-2 conselhos práticos e acionáveis em formato de lista (bullet points, usando '- ' no início de cada linha).
    *   Se o lucro por unidade parecer baixo, sugira: "- Para aumentar seu lucro sem mudar o preço, o foco deve ser reduzir o Custo Direto de R$ {{directCostFormatted}}."
    *   Se o preço final parecer alto para o mercado, sugira: "- Se o preço final parece alto, tente aumentar sua estimativa de vendas (se for realista) para diluir os custos fixos ou reduza sua margem de lucro."
    *   Se o produto parecer artesanal/customizado (use o nome "{{productName}}" como dica), sugira focar na percepção de valor: "- Para um produto como '{{productName}}', comunique o valor agregado e a qualidade para justificar o preço, em vez de competir apenas por custo."
    *   Se o lucro por hora for baixo, sugira: "- Para melhorar o lucro por hora, avalie otimizar processos para reduzir o tempo de produção ou ajuste o preço para refletir o valor do seu tempo."

Responda SEMPRE no formato JSON especificado. Mantenha a linguagem simples e focada em ajudar um pequeno empresário a tomar uma decisão.
`,
});


// Define o Flow Genkit principal
const internalProductPricingFlow = ai.defineFlow(
  {
    name: 'internalProductPricingFlow',
    inputSchema: ProductPricingInputSchema, 
    outputSchema: ProductPricingOutputSchema,
  },
  async (input: ProductPricingInput): Promise<ProductPricingOutput> => {
    
    const productName = input.productName;
    const tipoPrecificacao = input.tipoPrecificacao;
    const directCost = input.directCost || 0;
    const indirectCost = input.indirectCost || 0;
    const custoFixoTotalPeriodo = input.custoFixoTotalPeriodo || 0;
    const vendasEstimadasPeriodo = input.vendasEstimadasPeriodo || 1;
    const tempoProducaoHoras = input.tempoProducaoHoras;
    const profitMarginType = input.profitMarginType;
    const profitMarginValueInput = input.profitMarginValue || 0;

    const { price: suggestedPrice, baseCost: baseCostPerUnit, marginAmount: profitMarginValueInCurrency } = calculateSuggestedPriceInternal(input);
    
    const grossProfitPerUnit = suggestedPrice - baseCostPerUnit;
    const lucroPorHora = (tempoProducaoHoras && tempoProducaoHoras > 0)
      ? grossProfitPerUnit / tempoProducaoHoras
      : 0;

    const promptInputData: PromptTemplateInput = {
      productName,
      tipoPrecificacao,
      directCostFormatted: directCost.toFixed(2),
      indirectCostFormatted: tipoPrecificacao === 'unitario' ? indirectCost.toFixed(2) : undefined,
      custoFixoTotalPeriodoFormatted: tipoPrecificacao === 'meta_periodica' ? custoFixoTotalPeriodo.toFixed(2) : undefined,
      vendasEstimadasPeriodo: tipoPrecificacao === 'meta_periodica' ? vendasEstimadasPeriodo : undefined,
      tempoProducaoHoras: tempoProducaoHoras,
      baseCostPerUnitFormatted: baseCostPerUnit.toFixed(2),
      profitMarginType,
      profitMarginValueInput, 
      profitMarginValueInCurrencyFormatted: profitMarginValueInCurrency.toFixed(2),
      calculatedSuggestedPriceFormatted: suggestedPrice.toFixed(2),
      lucroPorHoraFormatted: lucroPorHora.toFixed(2),
    };

    let analysisOutput: PricingAnalysisPromptOutput = { 
        humanExplanation: `Preço de R$ ${suggestedPrice.toFixed(2)} calculado para "${productName}".`,
        keyConsiderations: "A análise de IA não pôde ser gerada. Verifique se o preço cobre todos os custos e expectativas de lucro.",
        alternativeScenariosOrAdvice: "Ajuste os custos ou a margem conforme necessário.",
        customProductAdvice: undefined
    };

    try {
      const { output: aiOutputFromPrompt } = await pricingAnalysisPrompt(promptInputData);

      if (aiOutputFromPrompt) {
        analysisOutput = {
            humanExplanation: aiOutputFromPrompt.humanExplanation || analysisOutput.humanExplanation,
            keyConsiderations: aiOutputFromPrompt.keyConsiderations || analysisOutput.keyConsiderations,
            alternativeScenariosOrAdvice: aiOutputFromPrompt.alternativeScenariosOrAdvice || analysisOutput.alternativeScenariosOrAdvice,
            customProductAdvice: aiOutputFromPrompt.customProductAdvice, 
        };
      }
    } catch (e) {
      console.error("[productPricingFlow] Erro ao chamar IA para análise de preço:", e);
      analysisOutput.humanExplanation += " (Análise detalhada por IA indisponível no momento devido a um erro.)";
    }

    return {
      suggestedPrice: suggestedPrice,
      baseCostPerUnit: baseCostPerUnit,
      analysis: analysisOutput,
    };
  }
);

// Função wrapper exportada para ser usada pelo frontend
export async function productPricingFlow(input: ProductPricingInput): Promise<ProductPricingOutput> {
  return internalProductPricingFlow(input);
}
