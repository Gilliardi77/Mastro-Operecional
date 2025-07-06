'use server';

/**
 * @fileOverview A financial trend prediction AI agent.
 *
 * - predictFinancialTrends - A function that handles the financial trend prediction process.
 * - PredictFinancialTrendsInput - The input type for the predictFinancialTrends function.
 * - PredictFinancialTrendsOutput - The return type for the predictFinancialTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PredictFinancialTrendsInputSchema = z.object({
  historicalData: z
    .string()
    .describe(
      'Historical financial data, such as revenue, expenses, and profits, in CSV format.'
    ),
  industry: z.string().describe('The industry the business operates in.'),
  economicConditions: z
    .string()
    .optional()
    .describe('Optional: Current economic conditions that may affect trends.'),
});
export type PredictFinancialTrendsInput = z.infer<typeof PredictFinancialTrendsInputSchema>;

const PredictFinancialTrendsOutputSchema = z.object({
  predictedTrends: z.string().describe('A detailed prediction of future financial trends based on the provided data.'),
  confidenceLevel: z.string().describe('The confidence level of the prediction (e.g., High, Medium, Low).'),
  recommendations: z.string().describe('Actionable recommendations based on the predicted trends.'),
});
export type PredictFinancialTrendsOutput = z.infer<typeof PredictFinancialTrendsOutputSchema>;

export async function predictFinancialTrends(input: PredictFinancialTrendsInput): Promise<PredictFinancialTrendsOutput> {
  return predictFinancialTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'predictFinancialTrendsPrompt',
  input: {schema: PredictFinancialTrendsInputSchema},
  output: {schema: PredictFinancialTrendsOutputSchema},
  prompt: `You are an expert financial analyst specializing in predicting financial trends.

  Based on the historical financial data, industry, and current economic conditions, predict future financial trends and provide actionable recommendations.

  Historical Data: {{{historicalData}}}
  Industry: {{{industry}}}
  Economic Conditions: {{{economicConditions}}}

  Consider all factors and provide a comprehensive analysis.
  Format the output as a JSON object matching the PredictFinancialTrendsOutputSchema.
  `,
});

const predictFinancialTrendsFlow = ai.defineFlow(
  {
    name: 'predictFinancialTrendsFlow',
    inputSchema: PredictFinancialTrendsInputSchema,
    outputSchema: PredictFinancialTrendsOutputSchema,
  },
  async (input): Promise<PredictFinancialTrendsOutput> => {
    const {output} = await prompt(input);
    if (!output) {
      // Return a default error-like structure matching the schema
      // This allows the client to handle the error gracefully.
      return {
        predictedTrends: "Análise indisponível no momento. A IA não conseguiu gerar uma previsão válida.",
        confidenceLevel: "N/A",
        recommendations: "Tente refinar seus dados históricos ou tente novamente mais tarde. Se o problema persistir, pode haver um problema com o modelo de IA.",
      };
    }
    return output; // No longer using output!
  }
);
