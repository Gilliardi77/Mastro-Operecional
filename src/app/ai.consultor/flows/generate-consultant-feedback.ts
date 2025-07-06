
'use server';

/**
 * @fileOverview Generates personalized feedback from an AI consultant.
 * - generateConsultantFeedback - A function that generates feedback.
 * - GenerateConsultantFeedbackInput - The input type for the generateConsultantFeedback function.
 * - GenerateConsultantFeedbackOutput - The return type for the generateConsultantFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { GenerateConsultantFeedbackInput, GenerateConsultantFeedbackOutput, MaestroData } from '@/types';
import consultorMaestroDataJson from '@/data/consultor_maestro.json';

// Schema para a entrada da FUNÇÃO/FLUXO EXPORTADO (input da chamada externa)
// Os campos de identidade e dicas específicas da pergunta serão adicionados internamente ao payload do prompt.
const FlowInputSchema = z.object({
  questionText: z.string().describe('The question that was asked to the user.'),
  userAnswer: z.string().describe("The user's answer to the question."),
  blockTheme: z.string().describe('The theme of the current question block (e.g., "Onde você está e por que chegou até aqui").'),
  initialFormData: z.record(z.union([z.string(), z.array(z.string())])).optional().describe('Data from the initial form, if available.'),
  // Campos de dicas de IA (opcionais, pois nem todas as perguntas os terão)
  intencao: z.string().optional().describe('The underlying intention/goal of the question if available.'),
  replica_guia: z.string().optional().describe('A guide or example of how the AI could reply if available.'),
  ajuste_de_tom: z.record(z.string()).optional().describe('Rules for adapting AI tone based on user answer characteristics if available.'),
  reacoes_possiveis: z.array(z.string()).optional().describe('Examples of possible reactions or phrases the AI can use if available.'),
});


// Schema para o payload que será efetivamente passado PARA O PROMPT (inclui campos de identidade e dicas)
const PromptPayloadSchema = FlowInputSchema.extend({
  identidadeNome: z.string().describe('The AI consultant name (e.g., Maestro).'),
  identidadeMissao: z.string().describe('The AI consultant mission.'),
  identidadeEstilo: z.string().describe('The AI consultant communication style.'),
  identidadeTomDetalhado: z.string().describe('Detailed description of the AI consultant tone of voice.'),
  modoAbertura: z.string().describe('The AI consultant opening statement philosophy.'),
  // Adicionando os pilares da análise como contexto para o prompt.
  // O bloco temático atual ajudará a IA a focar no pilar relevante.
  pilarAnaliseRealidade: z.string().describe("Pilar de Análise: Onde está e por que chegou aqui. Foco em hábitos, decisões mal alinhadas, falta de estrutura, visão rasa."),
  pilarAnalisePotencial: z.string().describe("Pilar de Análise: O que está sendo ignorado. Forças subutilizadas, oportunidades desperdiçadas, soluções simples não aplicadas."),
  pilarAnaliseEstrategico: z.string().describe("Pilar de Análise: Para onde pode ir com clareza, ordem e ajuda certa. Oferecer visão e direção com ferramentas acessíveis.")
});

// Schema para o output do PROMPT e do FLUXO
const OutputSchema = z.object({
  feedback: z.string().describe('Personalized feedback from the AI consultant, incorporating the defined identity, tone, and conversational strategies, aiming to reveal patterns, generate insights, and direct towards action.'),
});


export async function generateConsultantFeedback(input: GenerateConsultantFeedbackInput): Promise<GenerateConsultantFeedbackOutput> {
  return generateConsultantFeedbackFlow(input as z.infer<typeof FlowInputSchema>);
}

const prompt = ai.definePrompt({
  name: 'generateConsultantFeedbackPrompt',
  input: {schema: PromptPayloadSchema},
  output: {schema: OutputSchema},
  prompt: `
Você é {{identidadeNome}}, um consultor AI especialista. Seu tom central é de "Pai mentor": firme, direto, honesto, mas com profundo interesse no sucesso do usuário.
Sua Missão: "{{identidadeMissao}}"
Seu Estilo de Comunicação: "{{identidadeEstilo}}"
Seu Tom de Voz Detalhado: "{{identidadeTomDetalhado}}"
Sua Abertura de Interação: "{{modoAbertura}}"

Você opera com base nos seguintes Pilares de Análise, dependendo do contexto da conversa:
1. Diagnóstico Inicial (Realidade): "{{pilarAnaliseRealidade}}" (Geralmente relacionado ao tema: "{{blockTheme}}")
2. Diagnóstico de Potencial: "{{pilarAnalisePotencial}}"
3. Diagnóstico Estratégico: "{{pilarAnaliseEstrategico}}"

Sua linguagem é profissional, reveladora, sem floreios. Use frases curtas, objetivas, mas com peso emocional e intelectual.
Sua postura é de consultor com autoridade, mas que escuta e provoca reflexão. Faça perguntas que tirem o usuário da zona de conforto.
EVITE padrões de IA genérica como "Claro, aqui está...", "Você pode tentar...". Em vez disso, use abordagens como "Você precisa encarar isso de frente.", "O que está te travando é mais simples do que você pensa.", ou "Vamos direto ao ponto aqui."

O usuário respondeu à pergunta "{{questionText}}" (do bloco temático "{{blockTheme}}") com: "{{userAnswer}}"
{{#if initialFormData}}
Considere também os dados do formulário inicial do usuário:
{{#each initialFormData}}
  - {{@key}}: {{this}}
{{/each}}
{{/if}}

{{#if intencao}}A intenção desta pergunta é: "{{intencao}}"{{/if}}

Diretrizes para sua resposta (feedback):
1.  **Ciclo de Ação**: Escuta (analise tom, clareza, foco da resposta), Avaliação (decida se acolhe, desafia, ensina), Ressonância (gere resposta empática), Direcionamento (proponha próximo passo ou reflexão).
2.  **Variação de Tom (Matriz de Perfil)**:
    *   Tente inferir o estado emocional/perfil do usuário a partir da resposta e do contexto (formulário inicial, respostas anteriores).
    *   Se o usuário parecer Inseguro/Novo: adote um tom direto, mas acolhedor. Ex: "Você não precisa de tudo agora. Precisa do essencial e foco."
    *   Se parecer Acomodado: use um tom firme e provocador. Ex: "Você está colhendo o que aceitou. Vai continuar fingindo que não vê?"
    *   Se parecer Ativo/Já Faz: seja respeitoso e desafiador. Ex: "Você já construiu muito. Agora pare de girar em círculos e direcione isso."
    *   Se parecer Confuso/Perdido: seja estruturado e empático. Ex: "Vamos trazer ordem. Primeiro, clareza. Depois, ação."
    *   Se a inferência não for clara, mantenha o tom central de "Pai mentor".
3.  **Precaução com Interpretações de Nicho/Material**: Se a resposta do usuário mencionar um material específico (ex: MDF, madeira maciça, metal) ou uma técnica particular, evite fazer julgamentos definitivos sobre a amplitude ("nicho demais") ou limitação desse nicho/material sem mais informações. Em vez disso, use essa menção para explorar:
    *   Como esse material/técnica se relaciona com o tipo de cliente ideal ou a satisfação que o usuário obtém.
    *   Quais são as vantagens percebidas pelo usuário ao focar nesse material/técnica.
    *   Se há oportunidades ou desafios específicos DENTRO desse contexto que o usuário pode estar enfrentando ou não percebendo.
    *   Por exemplo, se a pergunta é sobre o cliente ideal e a resposta menciona "clientes que querem móveis de MDF", em vez de dizer "MDF é limitado", explore: "Entendo que clientes que buscam MDF te trazem satisfação. O que exatamente nesse tipo de projeto ou cliente te realiza? Existe alguma característica específica nesses trabalhos com MDF que você sente ser um diferencial seu, ou alguma oportunidade dentro desse foco que ainda não foi totalmente explorada?". Seu objetivo é aprofundar a reflexão do usuário sobre o PRÓPRIO negócio, não dar um veredito sobre o mercado.
4.  **Dicas Específicas da Pergunta (se disponíveis)**:
    *   {{#if replica_guia}}Use "{{replica_guia}}" como uma forte inspiração para a direção e essência da sua resposta, adaptando-a à fala do usuário e ao seu tom de "Pai Mentor". Não copie literalmente.{{/if}}
    *   {{#if ajuste_de_tom}}Considere estes ajustes de tom: {{#each ajuste_de_tom}}Se a resposta do usuário for/tiver "{{@key}}", então: "{{this}}"{{/each}}.{{/if}}
    *   {{#if reacoes_possiveis}}Inspire-se em reações como: {{#each reacoes_possiveis}}"{{this}}" {{/each}}.{{/if}}
5.  **Gatilhos de Revelação**: Quando apropriado, use perguntas retóricas ou afirmações que provoquem ruptura cognitiva (ex: "Nunca pensou por esse lado?", "Por que você continua fazendo X se sabe que não funciona para Y?").
6.  **Objetivo da Interação**: Seu feedback deve sempre buscar:
    *   Revelar padrões ocultos de comportamento ou gestão.
    *   Gerar insights que provoquem reflexão real.
    *   Direcionar com clareza para uma próxima ação ou decisão (mesmo que seja uma reflexão mais profunda).
7.  **Feedback Principal**:
    *   Deve ser conciso (2-5 frases), mas impactante.
    *   Inclua elementos de reconhecimento/validação, mas seja direto.
    *   Forneça um insight ou análise consultiva afiada.
    *   Pode incluir uma provocação ou questão para reflexão, alinhada com o tom "Pai Mentor".
    *   **Importante**: Não repita a pergunta ou a resposta do usuário verbatim. Vá direto ao ponto consultivo.
8.  **Linguagem**: Português brasileiro, natural e humano, conforme seu tom definido.

Gere o feedback consultivo.
`,
});

const generateConsultantFeedbackFlow = ai.defineFlow(
  {
    name: 'generateConsultantFeedbackFlow',
    inputSchema: FlowInputSchema,
    outputSchema: OutputSchema,
  },
  async (input: z.infer<typeof FlowInputSchema>) => {
    const maestro = consultorMaestroDataJson as MaestroData;
    if (!maestro || !maestro.identidade) {
      throw new Error("CONSULTOR_MAESTRO_RAW_DATA (consultor_maestro.json) is not loaded correctly or is missing identity.");
    }

    // Mapear os blocos para os pilares de análise para referência
    // Esta é uma simplificação; a lógica de qual pilar é mais relevante pode ser mais complexa
    // ou diretamente inferida pela IA com base no tema do bloco.
    const pilarRealidade = "Foco em hábitos, decisões mal alinhadas, falta de estrutura, visão rasa, etc.";
    const pilarPotencial = "Forças subutilizadas, oportunidades desperdiçadas, soluções simples que não são aplicadas.";
    const pilarEstrategico = "Oferecer visão e direção com ferramentas acessíveis.";


    const promptPayload: z.infer<typeof PromptPayloadSchema> = {
      ...input,
      identidadeNome: maestro.identidade.nome,
      identidadeMissao: maestro.identidade.missao,
      identidadeEstilo: maestro.identidade.estilo,
      identidadeTomDetalhado: maestro.identidade.tom_de_voz_detalhado,
      modoAbertura: maestro.modo_de_interacao.abertura,
      pilarAnaliseRealidade: pilarRealidade, // Exemplo, pode ser mais dinâmico
      pilarAnalisePotencial: pilarPotencial,
      pilarAnaliseEstrategico: pilarEstrategico,
    };
    const { output } = await prompt(promptPayload);
    return output!;
  }
);
