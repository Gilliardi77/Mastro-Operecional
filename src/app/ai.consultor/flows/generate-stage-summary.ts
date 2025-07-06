
'use server';

/**
 * @fileOverview Generates one part of the 3-part final diagnosis for the "Diagnóstico Maestro".
 *
 * - generateFinalDiagnosisPart - A function that generates a part of the diagnosis.
 * - GenerateFinalDiagnosisPartInput - The input type.
 * - GenerateFinalDiagnosisPartOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateFinalDiagnosisPartInput, GenerateFinalDiagnosisPartOutput, MaestroData } from '@/types';
import consultorMaestroDataJson from '@/data/consultor_maestro.json';

// Schema para a entrada da FUNÇÃO/FLUXO EXPORTADO
const FlowInputSchema = z.object({
  partId: z.string().describe('The ID of the diagnosis part to generate (e.g., "parte_1_onde_voce_esta").'),
  partTitle: z.string().describe('The title of this diagnosis part (e.g., "Diagnóstico Parte 1: Onde Você Está e o Que Te Trava").'),
  partGuidanceForAI: z.string().describe('Specific instructions for the AI on what to focus on for this part, alinhado com os Pilares de Análise.'),
  userResponses: z
    .record(z.string()) // questionId: answer
    .describe('A record of all user responses from the main consultation blocks.'),
  initialFormData: z.record(z.union([z.string(), z.array(z.string())])).optional().describe('Data from the initial form, if available.'),
});


// Schema para o payload que será efetivamente passado PARA O PROMPT
const PromptPayloadSchema = FlowInputSchema.extend({
  identidadeNome: z.string().describe('The AI consultant name (e.g., Maestro).'),
  identidadeMissao: z.string().describe('The AI consultant mission.'),
  identidadeEstilo: z.string().describe('The AI consultant communication style.'),
  identidadeTomDetalhado: z.string().describe('Detailed description of the AI consultant tone of voice (Pai mentor).'),
});

// Schema para o output do PROMPT e do FLUXO (que é FinalDiagnosisPart)
const OutputSchema = z.object({
  partId: z.string(),
  title: z.string(),
  content: z.string().describe('The AI-generated content for this part of the diagnosis, following the specific guidance, user responses, and adhering to the "Pai mentor" persona. Should be direct, revelatory, and strategic.'),
});


export async function generateFinalDiagnosisPart(
  input: GenerateFinalDiagnosisPartInput
): Promise<GenerateFinalDiagnosisPartOutput> {
  // Garantir que o input do fluxo corresponda ao FlowInputSchema antes de passar para o prompt
  return generateFinalDiagnosisPartFlow(input as z.infer<typeof FlowInputSchema>);
}

const prompt = ai.definePrompt({
  name: 'generateFinalDiagnosisPartPrompt',
  input: {schema: PromptPayloadSchema},
  // A IA só precisa gerar o 'content'. partId e title são passados adiante do input.
  output: {schema: OutputSchema.pick({ content: true })},
  prompt: `
Você é {{identidadeNome}}, um consultor AI especialista. Seu tom central é de "Pai mentor": firme, direto, honesto, mas com profundo interesse no sucesso do usuário.
Sua Missão: "{{identidadeMissao}}"
Seu Estilo de Comunicação: "{{identidadeEstilo}}"
Seu Tom de Voz Detalhado: "{{identidadeTomDetalhado}}"

Seu objetivo é gerar o conteúdo para uma parte específica do diagnóstico final para o usuário, agindo como um "Pai mentor".
Esta parte do diagnóstico é: "{{partTitle}}".
A orientação específica para esta parte (Pilar de Análise) é: "{{partGuidanceForAI}}"

Respostas do Usuário na Consultoria Principal (ID da Pergunta: Resposta):
{{#each userResponses}}
  - {{@key}}: {{this}}
{{/each}}

{{#if initialFormData}}
Dados do Formulário Inicial do Usuário (ID do Campo: Resposta):
{{#each initialFormData}}
  - {{@key}}: {{this}}
{{/each}}
{{/if}}

Com base EXCLUSIVAMENTE nas respostas do usuário (e dados do formulário inicial, se fornecidos), e seguindo RIGOROSAMENTE a orientação ("{{partGuidanceForAI}}") para a parte "{{partTitle}}":
1.  **Foco no Pilar de Análise**: Sua resposta DEVE abordar o que foi pedido na "descricao_orientadora_para_ia" ("{{partGuidanceForAI}}").
2.  **Profundidade e Clareza**: Demonstre análise profunda das respostas do usuário para extrair insights relevantes para esta parte do diagnóstico. Seja revelador.
3.  **Tom "Pai Mentor"**: Mantenha o tom "{{identidadeTomDetalhado}}". Seja direto, humano, com autoridade respeitosa, sincero, sem rodeios, mas nunca agressivo. Misture diagnóstico técnico com provocação emocional construtiva.
4.  **Conteúdo Estratégico**: Elabore um texto de alguns parágrafos (geralmente 2-4 parágrafos concisos) que resuma suas descobertas e análises. Destaque os pontos mais cruciais. Ofereça visão e direção.
5.  **Linguagem**: Português brasileiro claro, profissional, mas com peso emocional e intelectual. Evite jargões desnecessários.
6.  **Exclusividade**: Não adicione informações que não foram fornecidas pelo usuário ou que não se alinhem com as diretrizes desta parte específica.

Gere o conteúdo para a parte "{{partTitle}}".
`,
});

const generateFinalDiagnosisPartFlow = ai.defineFlow(
  {
    name: 'generateFinalDiagnosisPartFlow',
    inputSchema: FlowInputSchema, // O fluxo recebe o input sem os campos de identidade
    outputSchema: OutputSchema, // O fluxo retorna o OutputSchema completo
  },
  async (input: z.infer<typeof FlowInputSchema>) => {
    const maestro = consultorMaestroDataJson as MaestroData;
    if (!maestro || !maestro.identidade) {
      throw new Error("CONSULTOR_MAESTRO_RAW_DATA (consultor_maestro.json) is not loaded correctly or is missing identity.");
    }
    
    const promptPayload: z.infer<typeof PromptPayloadSchema> = {
      ...input, // Inclui partId, partTitle, partGuidanceForAI, userResponses, initialFormData
      identidadeNome: maestro.identidade.nome,
      identidadeMissao: maestro.identidade.missao,
      identidadeEstilo: maestro.identidade.estilo,
      identidadeTomDetalhado: maestro.identidade.tom_de_voz_detalhado,
    };

    const { output } = await prompt(promptPayload);

    if (!output || !output.content) {
        throw new Error(`AI failed to generate content for diagnosis part: ${input.partTitle}`);
    }
    
    // Monta o output completo do fluxo, incluindo partId e title do input original.
    return {
      partId: input.partId,
      title: input.partTitle,
      content: output.content,
    };
  }
);
