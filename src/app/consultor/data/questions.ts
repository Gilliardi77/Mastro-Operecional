
console.log("[questions.ts] File execution started. Attempting to load and process consultor_maestro.json.");

import type {
  MaestroData,
  MaestroEtapaFormularioJson,
  MaestroEtapaPerguntasJson,
  InitialFormConfig,
  InitialFormField,
  Question,
  BlockConfig,
  FinalDiagnosisDisplayConfig,
  FinalDiagnosisPartStructure,
} from '../types';
import { setDerivedConfig } from '../types';
import consultorMaestroDataJson from './consultor_maestro.json';

console.log("[questions.ts] consultor_maestro.json raw import:", consultorMaestroDataJson);

const maestroData: MaestroData = consultorMaestroDataJson as MaestroData;

if (!maestroData || Object.keys(maestroData).length === 0) {
  console.error("[questions.ts] ERRO FATAL: Não foi possível carregar consultor_maestro.json ou o arquivo está vazio.");
  throw new Error("ERRO FATAL: consultor_maestro.json não carregado ou vazio. Verifique o arquivo e os logs do servidor.");
}
console.log("[questions.ts] maestroData seems loaded, proceeding with parsing...");

// --- Process Initial Form ---
if (!maestroData.etapas_consulta || !Array.isArray(maestroData.etapas_consulta)) {
  console.error("[questions.ts] ERRO FATAL: 'etapas_consulta' está ausente ou não é um array em consultor_maestro.json.", maestroData);
  throw new Error("'etapas_consulta' está ausente ou não é um array em consultor_maestro.json.");
}

const initialFormJson = maestroData.etapas_consulta.find(
  (etapa) : etapa is MaestroEtapaFormularioJson => etapa.id === 'inicio' && etapa.tipo === 'formulario'
) as MaestroEtapaFormularioJson | undefined;

if (!initialFormJson) {
  console.error("[questions.ts] ERRO FATAL: Configuração para o formulário inicial (id: 'inicio', tipo: 'formulario') não encontrada em consultor_maestro.json. Etapas encontradas:", maestroData.etapas_consulta);
  throw new Error("Configuração para o formulário inicial (id: 'inicio', tipo: 'formulario') não encontrada. Verifique consultor_maestro.json e os logs do servidor.");
}
console.log("[questions.ts] initialFormJson found:", initialFormJson);

if (!initialFormJson.campos_formulario_ids || !Array.isArray(initialFormJson.campos_formulario_ids)) {
    console.error("[questions.ts] ERRO FATAL: 'campos_formulario_ids' está ausente ou não é um array na configuração do formulário inicial em consultor_maestro.json.", initialFormJson);
    throw new Error("'campos_formulario_ids' está ausente ou não é um array na configuração do formulário inicial. Verifique consultor_maestro.json.");
}
if (typeof initialFormJson.titulo_formulario !== 'string') {
    console.error("[questions.ts] ERRO FATAL: 'titulo_formulario' está ausente ou não é uma string na configuração do formulário inicial.", initialFormJson);
    throw new Error("'titulo_formulario' ausente/inválido na configuração do formulário inicial.");
}
if (typeof initialFormJson.descricao_formulario !== 'string') {
    console.error("[questions.ts] ERRO FATAL: 'descricao_formulario' está ausente ou não é uma string na configuração do formulário inicial.", initialFormJson);
    throw new Error("'descricao_formulario' ausente/inválida na configuração do formulário inicial.");
}


const camposFormulario: InitialFormField[] = initialFormJson.campos_formulario_ids.map((id) => {
  switch (id) {
    case 'nome_negocio':
      return { id, pergunta: 'Qual o nome do seu negócio?', tipo: 'texto' };
    case 'tipo_negocio':
      return { id, pergunta: 'Seu negócio é focado em?', tipo: 'opcoes', opcoes: ['Produtos', 'Serviços', 'Produtos e Serviços'] };
    case 'tempo_mercado':
      return { id, pergunta: 'Há quanto tempo seu negócio está no mercado?', tipo: 'texto' }; // ou 'opcoes' dependendo da granularidade
    case 'formalizado':
      return { id, pergunta: 'Seu negócio é formalizado (possui CNPJ)?', tipo: 'opcoes', opcoes: ['Sim', 'Não', 'Em processo'] };
    case 'trabalha_sozinho_ou_equipe':
      return { id, pergunta: 'Você trabalha mais sozinho(a) ou conta com uma equipe/apoio familiar?', tipo: 'opcoes', opcoes: ['Sozinho(a)', 'Com equipe/sócios', 'Com apoio familiar/freelancers'] };
    case 'tentou_consultoria_apoio_antes':
      return { id, pergunta: 'Você já buscou algum tipo de consultoria ou apoio especializado para o seu negócio antes?', tipo: 'opcoes', opcoes: ['Sim, e ajudou', 'Sim, mas não resolveu', 'Não, primeira vez'] };
    case 'faturamento_medio_opcional':
      return { id, pergunta: 'Qual é o faturamento médio mensal do seu negócio? (opcional)', tipo: 'numero' };
    case 'desafios_principais_percebidos':
      return { id, pergunta: 'Em poucas palavras, qual você considera o seu maior desafio no negócio atualmente?', tipo: 'texto' };
    default:
      console.warn(`[questions.ts] ID de campo de formulário não mapeado: ${id}. Usando fallback.`);
      return { id, pergunta: `Detalhe sobre ${id.replace(/_/g, ' ')}:`, tipo: 'texto' };
  }
});

const generatedInitialFormConfig: InitialFormConfig = {
  id: initialFormJson.id,
  titulo: initialFormJson.titulo_formulario,
  descricao: initialFormJson.descricao_formulario,
  campos: camposFormulario,
};
console.log("[questions.ts] generatedInitialFormConfig:", generatedInitialFormConfig);

// --- Process Main Consultation Questions and Blocks ---
const questionBlocksJson = maestroData.etapas_consulta.filter(
  (etapa): etapa is MaestroEtapaPerguntasJson => etapa.tipo === 'perguntas'
) as MaestroEtapaPerguntasJson[];
console.log("[questions.ts] questionBlocksJson found:", questionBlocksJson);

const generatedBlocksConfig: BlockConfig[] = [];
const generatedMainQuestionsFlat: Question[] = [];
let कुलप्रश्नसंख्या = 0;

// Defina as 15 perguntas aqui, 5 para cada bloco, baseadas nos temas do JSON.
// Certifique-se que os IDs dos blocos (bloco_1, bloco_2, bloco_3) correspondem aos IDs no JSON.
const allDefinedQuestions: { [blockId: string]: { text: string, intencao?: string, replica_guia?: string, ajuste_de_tom?: Record<string, string>, reacoes_possiveis?: string[] }[] } = {
  bloco_1: [
    { text: "Pensando no seu dia a dia, qual é a tarefa que mais consome seu tempo e energia atualmente no negócio?" },
    { text: "Se você pudesse descrever o principal sentimento que seu negócio te causa hoje, qual seria e por quê?" },
    { text: "Olhando para os últimos 6 meses, qual foi o maior obstáculo que impediu seu negócio de crescer como você gostaria?" },
    { text: "Com que frequência você consegue parar para analisar seus resultados financeiros e o que eles te dizem?" },
    { text: "Qual decisão importante sobre seu negócio você tem adiado e qual o receio por trás dela?" },
  ],
  bloco_2: [
    { text: "Qual é aquela habilidade ou conhecimento que você tem, mas que sente que seu negócio ainda não aproveita totalmente?" },
    { text: "Se você tivesse um 'clone' seu por uma semana para trabalhar no negócio, qual tarefa crucial você delegaria a ele imediatamente?" },
    { text: "Descreva o tipo de cliente que mais se beneficia do que você oferece e que te dá mais satisfação em atender." },
    { text: "Imagine que você recebeu um investimento inesperado para uma única melhoria no seu negócio. Onde você aplicaria esse recurso?" },
    { text: "Qual pequena mudança na sua forma de trabalhar ou na sua oferta você acredita que poderia trazer um grande impacto positivo?" },
  ],
  bloco_3: [
    { text: "Pensando no seu 'eu' ideal como empreendedor(a), qual característica ou comportamento você mais gostaria de desenvolver?" },
    { text: "Qual processo ou atividade no seu negócio você sente que poderia ser muito mais simples ou automatizado?" },
    { text: "Se você pudesse ter um mentor especialista por um dia, qual a principal pergunta ou desafio que você levaria para ele?" },
    { text: "Defina uma meta clara e ousada que você gostaria de alcançar com seu negócio nos próximos 90 dias." },
    { text: "Qual o primeiro passo prático, por menor que seja, que você pode dar HOJE para começar a organizar melhor seu negócio ou suas ideias?" },
  ],
};

questionBlocksJson.forEach((blockJson, blockIndex) => {
  if (typeof blockJson.id !== 'string' || typeof blockJson.tema !== 'string' || typeof blockJson.numero_perguntas !== 'number' || typeof blockJson.comentario_final_bloco !== 'string') {
    console.error("[questions.ts] ERRO FATAL: Estrutura inválida para um bloco de perguntas em consultor_maestro.json.", blockJson);
    throw new Error("Estrutura de bloco de perguntas inválida. Verifique consultor_maestro.json.");
  }

  const blockQuestions: Question[] = [];
  const questionDefinitionsForBlock = allDefinedQuestions[blockJson.id];

  if (!questionDefinitionsForBlock) {
    console.error(`[questions.ts] ERRO FATAL: Perguntas não definidas para o bloco com ID '${blockJson.id}' em 'allDefinedQuestions' no arquivo questions.ts.`);
    throw new Error(`Perguntas não definidas para o bloco '${blockJson.id}'. Verifique questions.ts.`);
  }
  
  if (questionDefinitionsForBlock.length !== blockJson.numero_perguntas) {
    console.warn(`[questions.ts] Aviso: O número de perguntas definido para o bloco '${blockJson.id}' (${questionDefinitionsForBlock.length}) não corresponde ao 'numero_perguntas' no JSON (${blockJson.numero_perguntas}). Usando as perguntas definidas em questions.ts.`);
  }

  questionDefinitionsForBlock.forEach((qDef, indexInBlock) => {
    कुलप्रश्नसंख्या++;
    const question: Question = {
      id: `${blockJson.id}_pergunta_${indexInBlock + 1}`,
      blockId: blockJson.id,
      blockIndex: blockIndex,
      blockTheme: blockJson.tema,
      questionNumberInBlock: indexInBlock + 1,
      totalQuestionNumber: कुलप्रश्नसंख्या,
      text: qDef.text,
      inputType: 'text', // Padrão para perguntas principais
      // Adicionando os campos de dicas opcionais
      intencao: qDef.intencao,
      replica_guia: qDef.replica_guia,
      ajuste_de_tom: qDef.ajuste_de_tom,
      reacoes_possiveis: qDef.reacoes_possiveis,
    };
    blockQuestions.push(question);
    generatedMainQuestionsFlat.push(question);
  });

  generatedBlocksConfig.push({
    id: blockJson.id,
    index: blockIndex,
    tema: blockJson.tema,
    numero_perguntas: blockQuestions.length, // Usar o número real de perguntas definidas
    comentario_final_bloco: blockJson.comentario_final_bloco,
    questions: blockQuestions,
  });
});
console.log("[questions.ts] generatedBlocksConfig:", generatedBlocksConfig);
console.log("[questions.ts] generatedMainQuestionsFlat count:", generatedMainQuestionsFlat.length);
console.log("[questions.ts] कुलप्रश्नसंख्या (total questions):", कुलप्रश्नसंख्या);

// --- Process Final Diagnosis Structure ---
const diagnosisJson = maestroData.diagnostico_final_estrutura;
if (!diagnosisJson) {
  console.error("[questions.ts] ERRO FATAL: Configuração para 'diagnostico_final_estrutura' não encontrada em consultor_maestro.json.", maestroData);
  throw new Error("Configuração para 'diagnostico_final_estrutura' não encontrada em consultor_maestro.json.");
}
if (typeof diagnosisJson.id !== 'string' || typeof diagnosisJson.titulo_geral !== 'string' || typeof diagnosisJson.descricao_geral !== 'string') {
    console.error("[questions.ts] ERRO FATAL: Campos 'id', 'titulo_geral' ou 'descricao_geral' ausentes/inválidos em 'diagnostico_final_estrutura'.", diagnosisJson);
    throw new Error("Campos 'id', 'titulo_geral' ou 'descricao_geral' ausentes/inválidos em 'diagnostico_final_estrutura'.");
}
if (!diagnosisJson.partes_estrutura || !Array.isArray(diagnosisJson.partes_estrutura)) {
    console.error("[questions.ts] ERRO FATAL: 'partes_estrutura' está ausente ou não é um array na configuração 'diagnostico_final_estrutura' em consultor_maestro.json.", diagnosisJson);
    throw new Error("'partes_estrutura' está ausente ou não é um array em 'diagnostico_final_estrutura'. Verifique consultor_maestro.json.");
}

const generatedFinalDiagnosisDisplayConfig: FinalDiagnosisDisplayConfig = {
  id: diagnosisJson.id,
  titulo_geral: diagnosisJson.titulo_geral,
  descricao_geral: diagnosisJson.descricao_geral,
  partes_estrutura: diagnosisJson.partes_estrutura.map((p: FinalDiagnosisPartStructure) => {
    if (typeof p.id_parte !== 'string' || typeof p.titulo_parte !== 'string' || typeof p.descricao_orientadora_para_ia !== 'string') {
        console.error("[questions.ts] ERRO FATAL: Estrutura inválida para um item em 'partes_estrutura'.", p);
        throw new Error("Estrutura inválida para um item em 'partes_estrutura'. Verifique consultor_maestro.json.");
    }
    return {
      id_parte: p.id_parte,
      titulo_parte: p.titulo_parte,
      descricao_orientadora_para_ia: p.descricao_orientadora_para_ia,
    };
  }),
};
console.log("[questions.ts] generatedFinalDiagnosisDisplayConfig:", generatedFinalDiagnosisDisplayConfig);

// --- Set Derived Config for Global Access ---
console.log("[questions.ts] About to call setDerivedConfig with fully processed data.");
setDerivedConfig({
  rawMaestroData: maestroData,
  initialForm: generatedInitialFormConfig,
  mainQuestionsFlat: generatedMainQuestionsFlat,
  blocksConfig: generatedBlocksConfig,
  totalMainQuestions: कुलप्रश्नसंख्या,
  finalDiagnosisDisplayConfig: generatedFinalDiagnosisDisplayConfig,
});
console.log("[questions.ts] setDerivedConfig called. APP_INITIAL_FORM_CONFIG should now be set.");
console.log("[questions.ts] File execution completed.");


// Export for direct import if needed, though types.ts is preferred for accessing derived config
export const INITIAL_FORM_CFG = generatedInitialFormConfig;
export const MAIN_QUESTIONS_FLAT_CFG = generatedMainQuestionsFlat;
export const BLOCKS_CFG = generatedBlocksConfig;
export const TOTAL_MAIN_QUESTIONS_CFG = कुलप्रश्नसंख्या;
export const FINAL_DIAGNOSIS_DISPLAY_CFG = generatedFinalDiagnosisDisplayConfig;
export const RAW_MAESTRO_DATA_CFG = maestroData;
