// src/app/consultor/types.ts

// Part 1: Type Definitions based on JSON and usage

// From consultor_maestro.json
export interface MaestroIdentidade {
  nome: string;
  missao: string;
  estilo: string;
  tom_de_voz_detalhado: string;
}

export interface MaestroInteracao {
  abertura: string;
  replica_dinamica: boolean;
  analise_contextual: boolean;
  intensidade_personalizavel: string[];
}

export interface FinalDiagnosisPartStructure {
  id_parte: string;
  titulo_parte: string;
  descricao_orientadora_para_ia: string;
}

export interface FinalDiagnosisStructure {
  id: string;
  tipo: string;
  titulo_geral: string;
  descricao_geral: string;
  partes_estrutura: FinalDiagnosisPartStructure[];
}

export interface FinalizacaoGeral {
    mensagem_parabens: string;
    mensagem_proximos_passos: string;
    call_to_action_app: string;
}

export interface MaestroEtapaFormularioJson {
  id: 'inicio';
  tipo: 'formulario';
  titulo_formulario: string;
  descricao_formulario: string;
  campos_formulario_ids: string[];
}

export interface MaestroEtapaPerguntasJson {
  id: string; // "bloco_1", etc.
  tipo: 'perguntas';
  tema: string;
  numero_perguntas: number;
  comentario_final_bloco: string;
}

export interface MaestroData {
  modulo: string;
  identidade: MaestroIdentidade;
  modo_de_interacao: MaestroInteracao;
  etapas_consulta: (MaestroEtapaFormularioJson | MaestroEtapaPerguntasJson)[];
  diagnostico_final_estrutura: FinalDiagnosisStructure;
  finalizacao_geral: FinalizacaoGeral;
}

// From questions.ts processing
export interface InitialFormField {
  id: string;
  pergunta: string;
  tipo: 'texto' | 'numero' | 'opcoes';
  opcoes?: string[];
}

export interface InitialFormConfig {
  id: string;
  titulo: string;
  descricao: string;
  campos: InitialFormField[];
}

export interface Question {
  id: string;
  blockId: string;
  blockIndex: number;
  blockTheme: string;
  questionNumberInBlock: number;
  totalQuestionNumber: number;
  text: string;
  inputType: 'text'; // Can be extended
  // AI hint fields
  intencao?: string;
  replica_guia?: string;
  ajuste_de_tom?: Record<string, string>;
  reacoes_possiveis?: string[];
}

export interface BlockConfig {
  id: string;
  index: number;
  tema: string;
  numero_perguntas: number;
  comentario_final_bloco: string;
  questions: Question[];
}

export interface FinalDiagnosisDisplayConfig extends Omit<FinalDiagnosisStructure, 'tipo'> {}

// Inputs for Genkit flows
export interface GenerateConsultantFeedbackInput {
    questionText: string;
    userAnswer: string;
    blockTheme: string;
    initialFormData?: Record<string, string | string[]>;
    intencao?: string;
    replica_guia?: string;
    ajuste_de_tom?: Record<string, string>;
    reacoes_possiveis?: string[];
}

export interface GenerateConsultantFeedbackOutput {
    feedback: string;
}

export interface GenerateFinalDiagnosisPartInput {
    partId: string;
    partTitle: string;
    partGuidanceForAI: string;
    userResponses: Record<string, string>;
    initialFormData?: Record<string, string | string[]>;
}

export interface GenerateFinalDiagnosisPartOutput {
    partId: string;
    title: string;
    content: string;
}

// Part 2: The singleton config state management
// This pattern allows the questions.ts file to process and set a config
// that can then be used by other parts of the application, like the context.

interface DerivedConfig {
  rawMaestroData: MaestroData | null;
  initialForm: InitialFormConfig | null;
  mainQuestionsFlat: Question[];
  blocksConfig: BlockConfig[];
  totalMainQuestions: number;
  finalDiagnosisDisplayConfig: FinalDiagnosisDisplayConfig | null;
}

// The variables that will hold the config
export let APP_RAW_MAESTRO_DATA: MaestroData | null = null;
export let APP_INITIAL_FORM_CONFIG: InitialFormConfig | null = null;
export let APP_MAIN_QUESTIONS_FLAT: Question[] = [];
export let APP_BLOCKS_CONFIG: BlockConfig[] = [];
export let APP_TOTAL_MAIN_QUESTIONS: number = 0;
export let APP_FINAL_DIAGNOSIS_DISPLAY_CONFIG: FinalDiagnosisDisplayConfig | null = null;

// The function to set the config
export function setDerivedConfig(config: DerivedConfig): void {
  APP_RAW_MAESTRO_DATA = config.rawMaestroData;
  APP_INITIAL_FORM_CONFIG = config.initialForm;
  APP_MAIN_QUESTIONS_FLAT = config.mainQuestionsFlat;
  APP_BLOCKS_CONFIG = config.blocksConfig;
  APP_TOTAL_MAIN_QUESTIONS = config.totalMainQuestions;
  APP_FINAL_DIAGNOSIS_DISPLAY_CONFIG = config.finalDiagnosisDisplayConfig;
}
