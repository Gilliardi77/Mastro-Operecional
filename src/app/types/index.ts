
// Representa a estrutura do JSON principal (consultor_maestro.json)
export interface MaestroData {
  modulo: string;
  identidade: {
    nome: string;
    missao: string;
    estilo: string;
    tom_de_voz_detalhado: string;
  };
  modo_de_interacao: {
    abertura: string;
    replica_dinamica: boolean;
    analise_contextual: boolean;
    intensidade_personalizavel: string[];
  };
  etapas_consulta: (MaestroEtapaFormularioJson | MaestroEtapaPerguntasJson)[];
  diagnostico_final_estrutura: MaestroDiagnosticoEstruturadoJson;
  finalizacao_geral: {
    mensagem_parabens: string;
    mensagem_proximos_passos: string;
    call_to_action_app: string;
  };
}

export interface MaestroEtapaFormularioJson {
  id: string; // e.g., "inicio"
  tipo: 'formulario';
  titulo_formulario: string;
  descricao_formulario: string;
  campos_formulario_ids: string[]; // IDs dos campos que serão definidos em InitialFormField
}

export interface MaestroEtapaPerguntasJson {
  id: string; // e.g., "bloco_1"
  tipo: 'perguntas';
  tema: string;
  numero_perguntas: number;
  comentario_final_bloco: string;
}

export interface MaestroDiagnosticoParteJson {
  id_parte: string;
  titulo_parte: string;
  descricao_orientadora_para_ia: string;
}
export interface MaestroDiagnosticoEstruturadoJson {
  id: string; // e.g., "diagnostico"
  tipo: 'diagnostico_estruturado';
  titulo_geral: string;
  descricao_geral: string;
  partes_estrutura: MaestroDiagnosticoParteJson[];
}


// Tipos para a aplicação (derivados do JSON)

export interface InitialFormField {
  id: string; // e.g., "nome_negocio"
  pergunta: string;
  tipo: 'texto' | 'opcoes' | 'numero';
  opcoes?: string[];
}

export interface InitialFormConfig {
  id: string; // e.g., "inicio"
  titulo: string;
  descricao: string;
  campos: InitialFormField[];
}

export interface Question {
  id: string; // e.g., bloco_1_pergunta_0
  blockId: string; // e.g., "bloco_1"
  blockIndex: number; // 0, 1, 2 for the three blocks
  blockTheme: string; // "Onde você está e por que chegou até aqui"
  questionNumberInBlock: number; // 1 to 5
  totalQuestionNumber: number; // 1 to 15
  text: string;
  inputType: 'text'; // Default for main questions
  // Campos de dicas de IA são opcionais, pois as perguntas principais não os terão mais no JSON
  intencao?: string;
  replica_guia?: string;
  ajuste_de_tom?: Record<string, string>;
  reacoes_possiveis?: string[];
}

export interface UserAnswer {
  questionId: string;
  answer: string;
}

export interface AiFeedback {
  questionId: string;
  text: string;
}

// Representa uma das 3 partes do diagnóstico final gerado pela IA
// Anteriormente era importado de schema/consultationSchema.ts,
// mas para uso interno em types/index.ts, é melhor definir aqui.
export interface FinalDiagnosisPart {
  partId?: string; // Opcional: ID da parte, se houver no JSON/estrutura
  title: string;
  content: string;
}


export interface ConsultationState {
  initialFormCompleted: boolean;
  initialFormData: Record<string, string | string[]>; // field_id: answer
  currentBlockIndex: number; // 0, 1, 2 (for bloco_1, bloco_2, bloco_3)
  currentQuestionIndexInBlock: number; // 0-4 for questions within a block
  userAnswers: Record<string, string>; // questionId: answer
  aiFeedbacks: Record<string, string>; // questionId: feedback
  finalDiagnosisParts: FinalDiagnosisPart[]; // Array to hold the 3 generated parts
  isLoading: boolean;
  currentView: 'welcome' | 'initial_form' | 'question' | 'block_comment' | 'generating_final_diagnosis' | 'final_summary' | 'module_recommendation';
  showTypingIndicator: boolean;
  typingIndicatorText: string;
}

export type ConsultationAction =
  | { type: 'GO_TO_INITIAL_FORM' }
  | { type: 'SUBMIT_INITIAL_FORM'; payload: Record<string, string | string[]> }
  | { type: 'START_MAIN_CONSULTATION' }
  | { type: 'SUBMIT_ANSWER'; payload: { questionId: string; answer: string } }
  | { type: 'RECEIVE_AI_FEEDBACK'; payload: { questionId: string; feedback: string } }
  | { type: 'PROCEED_TO_NEXT_QUESTION'; currentBlockConfigForAction?: BlockConfig }
  | { type: 'SHOW_BLOCK_COMMENT' } // Removido payload não utilizado
  | { type: 'PROCEED_TO_NEXT_BLOCK'; blocksConfigForAction?: BlockConfig[] }
  | { type: 'REQUEST_FINAL_DIAGNOSIS' }
  | { type: 'ALL_DIAGNOSIS_PARTS_RECEIVED'; payload: { parts: FinalDiagnosisPart[] } }
  | { type: 'PROCEED_TO_MODULE_RECOMMENDATION' }
  // | { type: 'COMPLETE_CONSULTATION' } // Removida, redundante com PROCEED_TO_MODULE_RECOMMENDATION
  | { type: 'RESTART_CONSULTATION' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_TYPING_INDICATOR'; payload: { show: boolean; text?: string } };

// Configuração para cada bloco de perguntas
export interface BlockConfig {
  id: string; // e.g., "bloco_1"
  index: number; // 0, 1, 2
  tema: string;
  numero_perguntas: number;
  comentario_final_bloco: string;
  questions: Question[]; // As perguntas deste bloco
}

// Configuração para a estrutura do diagnóstico final (para UI)
export interface FinalDiagnosisDisplayConfig {
  id: string;
  titulo_geral: string;
  descricao_geral: string;
  partes_estrutura: {
    id_parte: string;
    titulo_parte: string;
    descricao_orientadora_para_ia: string;
  }[];
}

export interface FinalDiagnosisPartStructure {
    id_parte: string;
    titulo_parte: string;
    descricao_orientadora_para_ia: string;
}


// --- Global derived config (populated by data/questions.ts) ---
// Estas variáveis ainda são populadas por src/data/questions.ts e podem ser úteis
// para acesso fora do React context, ou em cenários server-side puros.
// No entanto, ConsultationContext agora prioriza props para sua inicialização.
export let CONSULTOR_MAESTRO_RAW_DATA: MaestroData | null = null;
export let APP_INITIAL_FORM_CONFIG: InitialFormConfig | null = null;
export let APP_MAIN_QUESTIONS_FLAT: Question[] = [];
export let APP_BLOCKS_CONFIG: BlockConfig[] = [];
export let APP_TOTAL_MAIN_QUESTIONS: number = 0;
export let APP_FINAL_DIAGNOSIS_DISPLAY_CONFIG: FinalDiagnosisDisplayConfig | null = null;

export const setDerivedConfig = (config: {
  rawMaestroData: MaestroData;
  initialForm: InitialFormConfig;
  mainQuestionsFlat: Question[];
  blocksConfig: BlockConfig[];
  totalMainQuestions: number;
  finalDiagnosisDisplayConfig: FinalDiagnosisDisplayConfig;
}) => {
  CONSULTOR_MAESTRO_RAW_DATA = config.rawMaestroData;
  APP_INITIAL_FORM_CONFIG = config.initialForm;
  APP_MAIN_QUESTIONS_FLAT = config.mainQuestionsFlat;
  APP_BLOCKS_CONFIG = config.blocksConfig;
  APP_TOTAL_MAIN_QUESTIONS = config.totalMainQuestions;
  APP_FINAL_DIAGNOSIS_DISPLAY_CONFIG = config.finalDiagnosisDisplayConfig;
};


// --- Tipos para os fluxos de IA ---

// Para generateConsultantFeedback
export interface GenerateConsultantFeedbackInput {
  questionText: string;
  userAnswer: string;
  blockTheme: string; // Tema do bloco atual
  initialFormData?: Record<string, string | string[]>; // Dados do formulário inicial
  // Campos de dicas de IA são opcionais, pois nem todas as perguntas os terão
  intencao?: string;
  replica_guia?: string;
  ajuste_de_tom?: Record<string, string>;
  reacoes_possiveis?: string[];
}
export interface GenerateConsultantFeedbackOutput {
  feedback: string;
}

// Para generateFinalDiagnosisPart (anteriormente generateStageSummary)
export interface GenerateFinalDiagnosisPartInput {
  partId: string;
  partTitle: string;
  partGuidanceForAI: string;
  userResponses: Record<string, string>; // Todas as respostas do usuário
  initialFormData?: Record<string, string | string[]>; // Dados do formulário inicial
}

// Reutilizando o tipo definido no schema
export type GenerateFinalDiagnosisPartOutput = FinalDiagnosisPart;


export const FALLBACK_MAESTRO_DATA: MaestroData = {
  modulo: '',
  identidade: {
    nome: '',
    missao: '',
    estilo: '',
    tom_de_voz_detalhado: '',
  },
  modo_de_interacao: {
    abertura: '',
    replica_dinamica: false,
    analise_contextual: false,
    intensidade_personalizavel: [],
  },
  etapas_consulta: [],
  diagnostico_final_estrutura: {
    id: '',
    tipo: 'diagnostico_estruturado',
    titulo_geral: '',
    descricao_geral: '',
    partes_estrutura: [],
  },
  finalizacao_geral: {
    mensagem_parabens: '',
    mensagem_proximos_passos: '',
    call_to_action_app: '',
  },
};
