
// ModulePromptGenerator.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating module prompts 
 * that adhere to the Maestro Operacional application's design and technical specifications.
 *
 * - generateModulePrompt - A function that generates module prompts based on input specifications.
 * - ModulePromptInput - The input type for the generateModulePrompt function.
 * - ModulePromptOutput - The return type for the generateModulePrompt function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ModulePromptInputSchema = z.object({
  moduleDescription: z
    .string()
    .describe('A detailed description of the module to be generated.'),
});
export type ModulePromptInput = z.infer<typeof ModulePromptInputSchema>;

const ModulePromptOutputSchema = z.object({
  modulePrompt: z
    .string()
    .describe(
      'A detailed prompt for generating the new module, including UI components, layout, and functionality, tailored for consistency with the Maestro Operacional application.'
    ),
});
export type ModulePromptOutput = z.infer<typeof ModulePromptOutputSchema>;

export async function generateModulePrompt(
  input: ModulePromptInput
): Promise<ModulePromptOutput> {
  return modulePromptGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'modulePromptGeneratorPrompt',
  input: {schema: ModulePromptInputSchema},
  output: {schema: ModulePromptOutputSchema},
  prompt: `You are an AI assistant specialized in generating detailed module prompts for the Maestro Operacional application.

The goal is to create prompts that will guide developers in building new modules that seamlessly integrate with the existing application, maintaining a consistent look and feel, architecture, and tech stack.

Consider the following specifications when generating the prompt:

- **Tech Stack**:
  - Framework: Next.js 15+ with App Router (Server Components by default).
  - Language: TypeScript.
  - UI Library: React 18+.
- **UI Components and Styling**:
  - Component Library: ShadCN UI (available in @/components/ui).
  - CSS Styling: Tailwind CSS.
  - Theme: Defined in src/app/globals.css using CSS HSL variables.
  - Key Colors (Light Mode):
    - Background: hsl(0 0% 95%) (Light Gray)
    - Foreground: hsl(0 0% 10%) (Dark Gray)
    - Primary: hsl(190 60% 35%) (Petroleum Blue)
    - Primary Foreground: hsl(0 0% 98%) (Light text on primary)
    - Accent: hsl(96 46% 82%) (Light Olive) 
  - Aesthetics: Modern, clean, professional design with rounded corners and subtle shadows.
  - Font: 'Poppins' from Google Fonts.
- **Layout and Structure**:
  - Layout: Fixed Header and Footer, scrollable main content area with padding.
  - Components: Functional React components, reusable and well-organized.
  - Icons: lucide-react library.
- **Quality and Standards**:
  - Responsiveness: Fully responsive on all devices.
  - Accessibility: ARIA attributes for accessibility.
  - Code: Clean, readable, well-organized, and performant.
  - Images: next/image for optimization, https://placehold.co/ for placeholders with data-ai-hint.
- **AI Integration**:
  - Genkit for AI functionalities (if applicable).

Based on the following module description, generate a detailed prompt that covers the UI components, layout, functionality, and any AI-related aspects needed for the new module. The prompt should be specific and actionable, enabling a developer to start building the module immediately.

Module Description: {{{moduleDescription}}}
`,
});

const modulePromptGeneratorFlow = ai.defineFlow(
  {
    name: 'modulePromptGeneratorFlow',
    inputSchema: ModulePromptInputSchema,
    outputSchema: ModulePromptOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
