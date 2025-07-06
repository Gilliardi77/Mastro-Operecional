
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { contextualAIGuideFlow } from '@/ai/flows/contextual-ai-guide-flow';
import type { ContextualAIGuideInput, ContextualAIGuideOutput, SuggestedAction } from '@/ai/schemas/contextual-ai-guide-schema';


interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestedActions?: SuggestedAction[];
}

interface CurrentAppContext {
  pageName: string; // User-friendly page name
  rawPathname: string; // Actual browser pathname
  currentAction?: string;
  formSnapshotJSON?: string;
}

interface AIGuideContextType {
  isAIGuideOpen: boolean;
  toggleAIGuide: () => void;
  closeAIGuide: () => void;
  chatMessages: ChatMessage[];
  currentAppContext: CurrentAppContext;
  updateAICurrentAppContext: (contextUpdate: Partial<CurrentAppContext>) => void;
  sendQueryToAIGuide: (userQuery: string, isAutomated?: boolean) => Promise<void>;
  isAILoading: boolean;
}

const AIGuideContext = createContext<AIGuideContextType | undefined>(undefined);

function getFriendlyPageName(pathname: string): string {
  if (pathname === '/') return 'Painel de Controle';
  if (pathname.startsWith('/financeiro')) return 'Controle Financeiro';
  if (pathname.startsWith('/analise-metas')) return 'Análise de Metas';
  if (pathname.startsWith('/precificacao')) return 'Precificação Inteligente';
  if (pathname.startsWith('/login')) return 'Login';
  if (pathname.startsWith('/cadastro')) return 'Cadastro';
  if (pathname.startsWith('/recursos')) return 'Central de Recursos';
  if (pathname.startsWith('/profile')) return 'Perfil do Usuário';
  
  const pageTitle = pathname.substring(pathname.lastIndexOf('/') + 1)
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return pageTitle || 'Página Desconhecida';
}


export function AIGuideProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isAIGuideOpen, setIsAIGuideOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const pathname = usePathname();
  const [isAILoading, setIsAILoading] = useState(false);

  const [currentAppContext, setCurrentAppContext] = useState<CurrentAppContext>({
    pageName: getFriendlyPageName(pathname || 'unknown'),
    rawPathname: pathname || 'unknown',
  });

  const currentAppContextRef = useRef(currentAppContext);
  useEffect(() => {
    currentAppContextRef.current = currentAppContext;
  }, [currentAppContext]);

  const stableSendQueryToAIGuide = useCallback(async (userQuery: string, isAutomated: boolean = false) => {
    if (!userQuery.trim()) return;

    if (!isAutomated) {
      setChatMessages(prev => [...prev, {
        id: `user-${Date.now()}-${Math.random()}`, sender: 'user', text: userQuery, timestamp: new Date()
      }]);
    }
    setIsAILoading(true);

    const recentHistory = chatMessages.slice(-5).map(m => ({ sender: m.sender, text: m.text }));

    try {
      const input: ContextualAIGuideInput = {
        pageName: currentAppContextRef.current.pageName,
        userQuery: userQuery,
        currentAction: currentAppContextRef.current.currentAction,
        formSnapshotJSON: currentAppContextRef.current.formSnapshotJSON,
        chatHistory: recentHistory,
      };
      const aiResponse = await contextualAIGuideFlow(input);
      setChatMessages(prev => [...prev, {
        id: `ai-${Date.now()}-${Math.random()}`, sender: 'ai', text: aiResponse.aiResponseText || "Falha no processamento.", timestamp: new Date(), suggestedActions: aiResponse.suggestedActions
      }]);
    } catch (error) {
      console.error("Error calling contextual AI guide flow:", error);
      setChatMessages(prev => [...prev, {
         id: `ai-error-${Date.now()}-${Math.random()}`, sender: 'ai', text: "Desculpe, houve um problema e não consegui processar sua solicitação no momento.", timestamp: new Date()
      }]);
    } finally {
      setIsAILoading(false);
    }
  }, [chatMessages, setIsAILoading]);

  const sendQueryToAIGuide = useCallback((userQuery: string, isAutomated: boolean = false) => {
    return stableSendQueryToAIGuide(userQuery, isAutomated);
  }, [stableSendQueryToAIGuide]);

  useEffect(() => {
    setCurrentAppContext(prev => ({
      ...prev,
      pageName: getFriendlyPageName(pathname || 'unknown'),
      rawPathname: pathname || 'unknown',
      currentAction: undefined,
      formSnapshotJSON: undefined
    }));
  }, [pathname]);

  const initialMessageSentForPath = useRef<string | null>(null);

  useEffect(() => {
    if (isAIGuideOpen && !isAILoading) {
      if (initialMessageSentForPath.current !== currentAppContext.rawPathname) {
        setChatMessages([]);
        sendQueryToAIGuide(`Estou na página "${currentAppContext.pageName}". Sobre o que posso obter ajuda aqui?`, true);
        initialMessageSentForPath.current = currentAppContext.rawPathname;
      }
    }
  }, [isAIGuideOpen, isAILoading, currentAppContext.rawPathname, currentAppContext.pageName, sendQueryToAIGuide]);

  useEffect(() => {
    if (!isAIGuideOpen) {
      initialMessageSentForPath.current = null;
    }
  }, [isAIGuideOpen]);

  const toggleAIGuide = useCallback(() => {
    setIsAIGuideOpen(prev => !prev);
  }, []);

  const closeAIGuide = useCallback(() => {
    setIsAIGuideOpen(false);
  }, []);

  const updateAICurrentAppContext = useCallback((contextUpdate: Partial<CurrentAppContext>) => {
    setCurrentAppContext(prev => ({ ...prev, ...contextUpdate }));
  }, []);

  return (
    <AIGuideContext.Provider
      value={{
        isAIGuideOpen,
        toggleAIGuide,
        closeAIGuide,
        chatMessages,
        currentAppContext,
        updateAICurrentAppContext,
        sendQueryToAIGuide,
        isAILoading,
      }}
    >
      {children}
    </AIGuideContext.Provider>
  );
}

export const useAIGuide = (): AIGuideContextType => {
  const context = useContext(AIGuideContext);
  if (context === undefined) {
    throw new Error('useAIGuide must be used within an AIGuideProvider');
  }
  return context;
};
