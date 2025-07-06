"use client";
import React, {
  createContext, useContext, useReducer, useMemo,
  useCallback, useEffect, ReactNode,
} from "react";
import {
  ConsultationState, ConsultationAction, Question,
  InitialFormConfig, BlockConfig, FinalDiagnosisDisplayConfig,
  MaestroData, GenerateConsultantFeedbackInput,
} from "@/types";
import { FALLBACK_MAESTRO_DATA } from "@/types";
import { generateConsultantFeedback } from "@/ai/flows/generate-consultant-feedback";
import { generateFinalDiagnosisPart } from "@/ai/flows/generate-stage-summary";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const initialBaseState: Omit<ConsultationState, "typingIndicatorText"> = {
  initialFormCompleted: false,
  initialFormData: {},
  currentBlockIndex: 0,
  currentQuestionIndexInBlock: 0,
  userAnswers: {},
  aiFeedbacks: {},
  finalDiagnosisParts: [],
  isLoading: false,
  currentView: "welcome",
  showTypingIndicator: false,
};

function consultationReducer(
  state: ConsultationState,
  action: ConsultationAction,
  maestroName: string
): ConsultationState {
  switch (action.type) {
    case "GO_TO_INITIAL_FORM":
      return { ...state, currentView: "initial_form" };

    case "SUBMIT_INITIAL_FORM":
      return {
        ...state,
        initialFormData: action.payload,
        initialFormCompleted: true,
        currentView: "question",
        currentBlockIndex: 0,
        currentQuestionIndexInBlock: 0,
        isLoading: false,
      };

    case "START_MAIN_CONSULTATION":
      return {
        ...state,
        initialFormCompleted: true,
        currentView: "question",
        isLoading: false,
        currentBlockIndex: 0,
        currentQuestionIndexInBlock: 0,
        userAnswers: {},
        aiFeedbacks: {},
        finalDiagnosisParts: [],
        showTypingIndicator: false,
      };

    case "SUBMIT_ANSWER":
      return {
        ...state,
        userAnswers: {
          ...state.userAnswers,
          [action.payload.questionId]: action.payload.answer,
        },
        isLoading: true,
        showTypingIndicator: true,
        typingIndicatorText: `${maestroName} está analisando sua resposta...`,
      };

    case "RECEIVE_AI_FEEDBACK":
      return {
        ...state,
        aiFeedbacks: {
          ...state.aiFeedbacks,
          [action.payload.questionId]: action.payload.feedback,
        },
        isLoading: false,
        showTypingIndicator: false,
      };

    case "PROCEED_TO_NEXT_QUESTION": {
      if (!action.currentBlockConfigForAction) return state;
      const canProceed = state.currentQuestionIndexInBlock < action.currentBlockConfigForAction.numero_perguntas - 1;
      return canProceed
        ? { ...state, currentQuestionIndexInBlock: state.currentQuestionIndexInBlock + 1 }
        : state;
    }

    case "SHOW_BLOCK_COMMENT":
      return {
        ...state,
        isLoading: false,
        showTypingIndicator: false,
        currentView: "block_comment",
      };

    case "PROCEED_TO_NEXT_BLOCK": {
      if (!action.blocksConfigForAction) return state;
      const nextIdx = state.currentBlockIndex + 1;
      const hasNextBlock = nextIdx < action.blocksConfigForAction.length;
      return hasNextBlock
        ? {
            ...state,
            currentBlockIndex: nextIdx,
            currentQuestionIndexInBlock: 0,
            currentView: "question",
          }
        : state;
    }

    case "REQUEST_FINAL_DIAGNOSIS":
      return {
        ...state,
        isLoading: true,
        showTypingIndicator: true,
        typingIndicatorText: `${maestroName} está preparando seu diagnóstico final...`,
        currentView: "generating_final_diagnosis",
        finalDiagnosisParts: [],
      };

    case "ALL_DIAGNOSIS_PARTS_RECEIVED":
      return {
        ...state,
        finalDiagnosisParts: action.payload.parts,
        isLoading: false,
        showTypingIndicator: false,
        currentView: "final_summary",
      };

    case "PROCEED_TO_MODULE_RECOMMENDATION":
      return {
        ...state,
        currentView: "module_recommendation",
        isLoading: false,
        showTypingIndicator: false,
      };

    case "RESTART_CONSULTATION":
      return {
        ...initialBaseState,
        currentView: "welcome",
        typingIndicatorText: `${maestroName} está digitando...`,
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_TYPING_INDICATOR":
      return {
        ...state,
        showTypingIndicator: action.payload.show,
        typingIndicatorText: action.payload.text ?? `${maestroName} está digitando...`,
      };

    default:
      return state;
  }
}

interface ConsultationProviderProps {
  children: ReactNode;
  initialFormConfigData: InitialFormConfig;
  maestroDataConfig: MaestroData;
  blocksConfigData: BlockConfig[];
  totalMainQuestionsData: number;
  finalDiagnosisDisplayConfigData: FinalDiagnosisDisplayConfig;
}

interface ConsultationContextType {
  state: ConsultationState;
  dispatch: React.Dispatch<ConsultationAction>;
  initialFormConfig: InitialFormConfig;
  currentQuestion: Question | null;
  currentBlockConfig: BlockConfig | null;
  blocksConfig: BlockConfig[];
  totalMainQuestions: number;
  finalDiagnosisDisplayConfig: FinalDiagnosisDisplayConfig;
  consultorMaestroData: MaestroData;
  handleInitialFormSubmit: (formData: Record<string, string | string[]>) => void;
  handleAnswerSubmit: (answer: string) => Promise<void>;
  proceedToNextStep: () => Promise<void>;
  isLastQuestionInBlock: boolean;
  isLastBlock: boolean;
  consultantName: string;
  isConfigReady: boolean;
}

const ConsultationContext = createContext<ConsultationContextType | undefined>(undefined);

export const ConsultationProvider = ({
  children,
  initialFormConfigData,
  maestroDataConfig,
  blocksConfigData,
  totalMainQuestionsData,
  finalDiagnosisDisplayConfigData,
}: ConsultationProviderProps) => {
  const { toast } = useToast();
  const { user, setAuthConsultationCompleted } = useAuth();

  const consultantName = useMemo(() =>
    maestroDataConfig?.identidade?.nome ?? FALLBACK_MAESTRO_DATA.identidade.nome,
    [maestroDataConfig]
  );

  const initialState: ConsultationState = useMemo(() => ({
    ...initialBaseState,
    typingIndicatorText: `${consultantName} está digitando...`,
  }), [consultantName]);

  const [state, dispatchBase] = useReducer(
    (s: ConsultationState, a: ConsultationAction) => consultationReducer(s, a, consultantName),
    initialState
  );

  const dispatch = useCallback((action: ConsultationAction) => {
    dispatchBase(action);
  }, []);

  const isConfigReady = useMemo(() => (
    !!initialFormConfigData &&
    !!maestroDataConfig &&
    blocksConfigData?.length > 0 &&
    totalMainQuestionsData >= 0 &&
    !!finalDiagnosisDisplayConfigData
  ), [
    initialFormConfigData,
    maestroDataConfig,
    blocksConfigData,
    totalMainQuestionsData,
    finalDiagnosisDisplayConfigData
  ]);

  const currentBlockConfig = useMemo(() => (
    isConfigReady && state.initialFormCompleted && state.currentBlockIndex < blocksConfigData.length
      ? blocksConfigData[state.currentBlockIndex]
      : null
  ), [isConfigReady, state.initialFormCompleted, state.currentBlockIndex, blocksConfigData]);

  const currentQuestion = useMemo(() => (
    state.currentView === "question" && currentBlockConfig?.questions
      ? currentBlockConfig.questions[state.currentQuestionIndexInBlock] ?? null
      : null
  ), [state.currentView, currentBlockConfig, state.currentQuestionIndexInBlock]);

  const isLastQuestionInBlock = useMemo(() =>
    !!currentBlockConfig &&
    !!currentQuestion &&
    state.currentQuestionIndexInBlock === currentBlockConfig.numero_perguntas - 1,
    [currentBlockConfig, currentQuestion, state.currentQuestionIndexInBlock]
  );

  const isLastBlock = useMemo(() =>
    isConfigReady &&
    state.currentBlockIndex === blocksConfigData.length - 1,
    [isConfigReady, state.currentBlockIndex, blocksConfigData]
  );

  const handleInitialFormSubmit = useCallback((formData: Record<string, string | string[]>) => {
    dispatch({ type: "SUBMIT_INITIAL_FORM", payload: formData });
  }, [dispatch]);

  const handleAnswerSubmit = useCallback(async (answer: string) => {
    if (!currentQuestion || !currentBlockConfig || !maestroDataConfig) return;

    dispatch({ type: "SUBMIT_ANSWER", payload: { questionId: currentQuestion.id, answer } });

    const input: GenerateConsultantFeedbackInput = {
      questionText: currentQuestion.text,
      userAnswer: answer,
      blockTheme: currentBlockConfig.tema,
      initialFormData: state.initialFormData,
      intencao: currentQuestion.intencao,
      replica_guia: currentQuestion.replica_guia,
      ajuste_de_tom: currentQuestion.ajuste_de_tom,
      reacoes_possiveis: currentQuestion.reacoes_possiveis,
    };

    try {
      const output = await generateConsultantFeedback(input);
      dispatch({
        type: "RECEIVE_AI_FEEDBACK",
        payload: { questionId: currentQuestion.id, feedback: output.feedback },
      });
    } catch (error) {
      console.error("Erro ao gerar feedback:", error);
      dispatch({
        type: "RECEIVE_AI_FEEDBACK",
        payload: {
          questionId: currentQuestion.id,
          feedback: "Desculpe, não consegui processar sua resposta no momento.",
        },
      });
      toast({
        title: "Erro de IA",
        description: "Falha ao gerar feedback.",
        variant: "destructive",
      });
    }
  }, [currentQuestion, currentBlockConfig, maestroDataConfig, state.initialFormData, dispatch, toast]);

  const proceedToNextStep = useCallback(async () => {
    if (!blocksConfigData?.length || !finalDiagnosisDisplayConfigData || !maestroDataConfig) return;

    if (state.currentView === "question") {
      if (!currentBlockConfig) return;
      if (isLastQuestionInBlock) {
        dispatch({ type: "SHOW_BLOCK_COMMENT" });
      } else {
        dispatch({ type: "PROCEED_TO_NEXT_QUESTION", currentBlockConfigForAction: currentBlockConfig });
      }
    } else if (state.currentView === "block_comment") {
      if (isLastBlock) {
        dispatch({ type: "REQUEST_FINAL_DIAGNOSIS" });

        try {
          const parts = await Promise.all(
            finalDiagnosisDisplayConfigData.partes_estrutura.map((p) =>
              generateFinalDiagnosisPart({
                partId: p.id_parte,
                partTitle: p.titulo_parte,
                partGuidanceForAI: p.descricao_orientadora_para_ia,
                userResponses: state.userAnswers,
                initialFormData: state.initialFormData,
              })
            )
          );
          dispatch({ type: "ALL_DIAGNOSIS_PARTS_RECEIVED", payload: { parts } });
        } catch (error) {
          console.error("Erro ao gerar diagnóstico:", error);
          const fallback = finalDiagnosisDisplayConfigData.partes_estrutura.map((p) => ({
            partId: p.id_parte,
            title: p.titulo_parte,
            content: "Não foi possível gerar esta parte do diagnóstico.",
          }));
          dispatch({ type: "ALL_DIAGNOSIS_PARTS_RECEIVED", payload: { parts: fallback } });
          toast({ title: "Erro de IA", description: "Falha ao gerar diagnóstico final.", variant: "destructive" });
        }
      } else {
        dispatch({ type: "PROCEED_TO_NEXT_BLOCK", blocksConfigForAction: blocksConfigData });
      }
    } else if (state.currentView === "final_summary") {
      dispatch({ type: "PROCEED_TO_MODULE_RECOMMENDATION" });
    }
  }, [
    blocksConfigData,
    finalDiagnosisDisplayConfigData,
    maestroDataConfig,
    state,
    dispatch,
    currentBlockConfig,
    isLastQuestionInBlock,
    isLastBlock,
    toast,
  ]);

  useEffect(() => {
    if (
      state.currentView !== "module_recommendation" ||
      !db ||
      !state.initialFormCompleted ||
      !user?.uid ||
      !state.finalDiagnosisParts?.length
    ) return;

    const saveConsultation = async () => {
      if (!db) {
        console.error("Firestore not initialized. Cannot save consultation.");
        return;
      }

      try {
        await addDoc(collection(db, "consultations"), {
          userId: user.uid,
          initialFormData: state.initialFormData,
          userAnswers: state.userAnswers,
          aiFeedbacks: state.aiFeedbacks,
          finalDiagnosisParts: state.finalDiagnosisParts,
          consultationCompletedAt: serverTimestamp(),
        });
        toast({ title: "Consulta Salva!", description: "Dados salvos com sucesso." });
        setAuthConsultationCompleted?.(true);
      } catch (err: any) {
        console.error("Erro ao salvar:", err);
        toast({
          title: "Erro ao Salvar",
          description: err.message || "Erro desconhecido.",
          variant: "destructive",
        });
      }
    };

    saveConsultation();
  }, [
    state,
    user,
    db,
    toast,
    setAuthConsultationCompleted,
  ]);

  const contextValue = useMemo(() => ({
    state,
    dispatch,
    initialFormConfig: initialFormConfigData,
    currentQuestion,
    currentBlockConfig,
    blocksConfig: blocksConfigData,
    totalMainQuestions: totalMainQuestionsData,
    finalDiagnosisDisplayConfig: finalDiagnosisDisplayConfigData,
    consultorMaestroData: maestroDataConfig,
    handleInitialFormSubmit,
    handleAnswerSubmit,
    proceedToNextStep,
    isLastQuestionInBlock,
    isLastBlock,
    consultantName,
    isConfigReady,
  }), [
    state,
    dispatch,
    initialFormConfigData,
    currentQuestion,
    currentBlockConfig,
    blocksConfigData,
    totalMainQuestionsData,
    finalDiagnosisDisplayConfigData,
    maestroDataConfig,
    handleInitialFormSubmit,
    handleAnswerSubmit,
    proceedToNextStep,
    isLastQuestionInBlock,
    isLastBlock,
    consultantName,
    isConfigReady,
  ]);

  return (
    <ConsultationContext.Provider value={contextValue}>
      {children}
    </ConsultationContext.Provider>
  );
};

export function useConsultationContext(): ConsultationContextType {
  const ctx = useContext(ConsultationContext);
  if (!ctx) {
    throw new Error("useConsultationContext deve ser usado dentro de um ConsultationProvider");
  }
  return ctx;
}
