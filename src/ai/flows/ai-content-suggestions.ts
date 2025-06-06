'use server';

/**
 * @fileOverview An AI agent that provides content suggestions for a module based on its purpose and context.
 *
 * - getContentSuggestions - A function that generates content suggestions for a module.
 * - ContentSuggestionsInput - The input type for the getContentSuggestions function.
 * - ContentSuggestionsOutput - The return type for the getContentSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentSuggestionsInputSchema = z.object({
  modulePurpose: z
    .string()
    .describe('The intended purpose of the module, e.g., user profile, data visualization, settings panel.'),
  moduleContext: z
    .string()
    .describe(
      'The context in which the module will be used, including the application name (Business Maestro), target audience, and any relevant data domains.'
    ),
  desiredContentLength: z
    .string()
    .describe(
      'The desired length of the content suggestions.  Examples: Short (a few sentences), Medium (a paragraph), Long (several paragraphs).'
    ),
});
export type ContentSuggestionsInput = z.infer<typeof ContentSuggestionsInputSchema>;

const ContentSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of content suggestions for the module.'),
  reasoning: z.string().describe('A brief explanation of why these suggestions are appropriate.'),
});
export type ContentSuggestionsOutput = z.infer<typeof ContentSuggestionsOutputSchema>;

export async function getContentSuggestions(input: ContentSuggestionsInput): Promise<ContentSuggestionsOutput> {
  return getContentSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentSuggestionsPrompt',
  input: {schema: ContentSuggestionsInputSchema},
  output: {schema: ContentSuggestionsOutputSchema},
  prompt: `You are an AI assistant designed to provide content suggestions for modules within the Business Maestro application.

  Given the module's purpose, context, and desired content length, generate a set of content suggestions that align with the application's style and branding.

  Module Purpose: {{{modulePurpose}}}
  Module Context: {{{moduleContext}}}
  Desired Content Length: {{{desiredContentLength}}}

  Instructions:

  1.  Adhere to the Business Maestro application's tech stack, including Next.js, TypeScript, ShadCN UI, and Tailwind CSS.
  2.  Maintain the application's modern, clean, and professional design aesthetic, including rounded corners and subtle shadows.
  3.  Use the 'Poppins' font for all text.
  4.  Ensure that the content suggestions are relevant, informative, and engaging for the target audience.
  5.  Provide a brief explanation of why these suggestions are appropriate for the module.

  Output Format:
  {
    "suggestions": ["suggestion 1", "suggestion 2", ...],
    "reasoning": "Explanation of why these suggestions are appropriate."
  }

  Ensure that the response is valid JSON.
  `,
});

const getContentSuggestionsFlow = ai.defineFlow(
  {
    name: 'getContentSuggestionsFlow',
    inputSchema: ContentSuggestionsInputSchema,
    outputSchema: ContentSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
