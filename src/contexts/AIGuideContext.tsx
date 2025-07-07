
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

import { contextualAIGuideFlow } from '@/ai/flows/contextual-ai-guide-operacional-flow';
// As schemas são compatíveis, então usamos a do operacional como a fonte da verdade.
import type { ContextualAIGuideInput, SuggestedAction, ContextualAIGuideOutput } from '@/ai/schemas/contextual-ai-guide-operacional-schema';


interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestedActions?: SuggestedAction[];
}

interface CurrentAppContext {
  pageName: string;
  currentAction?: string;
  formSnapshotJSON?: string; // JSON string of current form data
}

interface AIGuideContextType {
  isAIGuideOpen: boolean;
  toggleAIGuide: () => void;
  closeAIGuide: () => void;
  chatMessages: ChatMessage[];
  currentAppContext: CurrentAppContext;
  updateAICurrentPageContext: (context: Partial<CurrentAppContext>) => void;
  sendQueryToAIGuide: (userQuery: string, options?: { asUserMessage?: boolean }) => Promise<void>;
  isAILoading: boolean;
}

const AIGuideContext = createContext<AIGuideContextType | undefined>(undefined);

export function AIGuideProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isAIGuideOpen, setIsAIGuideOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const pathname = usePathname();
  const [isAILoading, setIsAILoading] = useState(false);

  const [currentAppContext, setCurrentAppContext] = useState<CurrentAppContext>({
    pageName: pathname || 'unknown',
  });

  // Load chat from sessionStorage when guide opens for a specific page
  useEffect(() => {
    if (isAIGuideOpen && typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(`chat-${pathname}`);
      if (saved) {
        try {
          const parsedMessages = JSON.parse(saved).map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp) // Ensure timestamp is a Date object
          }));
          setChatMessages(parsedMessages);
        } catch (e) {
          console.error("Failed to parse chat from session storage", e);
          sessionStorage.removeItem(`chat-${pathname}`); // Clear corrupted data
        }
      } else {
        setChatMessages([]); // Start with empty chat if nothing saved for this path
      }
    }
  }, [isAIGuideOpen, pathname]);

  // Save chat to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && chatMessages.length > 0) {
      sessionStorage.setItem(`chat-${pathname}`, JSON.stringify(chatMessages));
    } else if (typeof window !== 'undefined' && chatMessages.length === 0) {
      // If chatMessages becomes empty (e.g. cleared), remove from storage
      sessionStorage.removeItem(`chat-${pathname}`);
    }
  }, [chatMessages, pathname]);


  useEffect(() => {
    setCurrentAppContext(prev => ({ ...prev, pageName: pathname || 'unknown', formSnapshotJSON: undefined, currentAction: undefined }));
    // Não limpar chatMessages aqui, pois o effect acima lida com carregar/resetar baseado em isAIGuideOpen e pathname
  }, [pathname]);


  const toggleAIGuide = useCallback(() => {
    setIsAIGuideOpen(prev => !prev);
  }, []);

  const closeAIGuide = useCallback(() => {
    setIsAIGuideOpen(false);
  }, []);

  const updateAICurrentPageContext = useCallback((context: Partial<CurrentAppContext>) => {
    setCurrentAppContext(prev => ({ ...prev, ...context, pageName: context.pageName || prev.pageName || pathname || 'unknown' }));
  }, [pathname]);

  const addMessage = useCallback((sender: 'user' | 'ai', text: string, suggestedActions?: SuggestedAction[]) => {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender,
      text: text || 'Sem resposta.', // Fallback for empty text
      timestamp: new Date(),
      suggestedActions,
    }]);
  }, []);

  const sendQueryToAIGuide = async (userQuery: string, options: { asUserMessage?: boolean } = { asUserMessage: true }) => {
    if (!userQuery.trim()) return;
    
    let currentMessages = [...chatMessages];

    if (options.asUserMessage) {
        const newUserMessage: ChatMessage = {
          id: `user-${Date.now()}`,
          sender: 'user',
          text: userQuery,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, newUserMessage]);
        currentMessages.push(newUserMessage);
    }
    
    setIsAILoading(true);

    const historyForAI = currentMessages
      .slice(-6) // Pega as últimas 6 mensagens
      .map(msg => ({
        role: msg.sender === 'ai' ? 'model' : 'user', // Standardizing to 'role'
        text: msg.text,
      }));
    
    try {
      const input: ContextualAIGuideInput = {
        pageName: currentAppContext.pageName,
        userQuery: userQuery,
        currentAction: currentAppContext.currentAction,
        formSnapshotJSON: currentAppContext.formSnapshotJSON,
        chatHistory: options.asUserMessage ? historyForAI.slice(0, -1) : historyForAI,
      };
      
      // Chamada para o fluxo unificado
      const aiResponse: ContextualAIGuideOutput = await contextualAIGuideFlow(input);

      addMessage('ai', aiResponse.aiResponseText, aiResponse.suggestedActions);
    } catch (error) {
      console.error("Error calling contextual AI guide flow:", error);
      addMessage('ai', "Desculpe, não consegui processar sua solicitação no momento.");
    } finally {
      setIsAILoading(false);
    }
  };

  const value = {
    isAIGuideOpen,
    toggleAIGuide,
    closeAIGuide,
    chatMessages,
    currentAppContext,
    updateAICurrentPageContext,
    sendQueryToAIGuide,
    isAILoading,
  };

  return (
    <AIGuideContext.Provider value={value}>
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
