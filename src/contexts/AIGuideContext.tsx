
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { contextualAIGuideFlow, type ContextualAIGuideInput, type ContextualAIGuideOutput } from '@/ai/flows/contextual-ai-guide-flow';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  suggestedActions?: ContextualAIGuideOutput['suggestedActions'];
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
  updateAICurrentPageContext: (pageName: string) => void; // Simplified for now
  sendQueryToAIGuide: (userQuery: string) => Promise<void>;
  isAILoading: boolean;
  // TODO: Add methods for proactive AI, context updates from forms, etc.
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

  useEffect(() => {
    // Update pageName context when route changes
    setCurrentAppContext(prev => ({ ...prev, pageName: pathname || 'unknown' }));
     // Optionally, clear chat or send a "new page" message to AI here
    if (isAIGuideOpen) {
        // setChatMessages([]); // Example: clear chat on page change
    }
  }, [pathname, isAIGuideOpen]);


  const toggleAIGuide = useCallback(() => {
    setIsAIGuideOpen(prev => !prev);
  }, []);

  const closeAIGuide = useCallback(() => {
    setIsAIGuideOpen(false);
  }, []);

  const updateAICurrentPageContext = useCallback((pageName: string) => {
    setCurrentAppContext(prev => ({ ...prev, pageName }));
  }, []);

  const addMessage = (sender: 'user' | 'ai', text: string, suggestedActions?: ContextualAIGuideOutput['suggestedActions']) => {
    setChatMessages(prev => [...prev, { id: Date.now().toString(), sender, text, timestamp: new Date(), suggestedActions }]);
  };

  const sendQueryToAIGuide = async (userQuery: string) => {
    if (!userQuery.trim()) return;
    addMessage('user', userQuery);
    setIsAILoading(true);

    try {
      const input: ContextualAIGuideInput = {
        pageName: currentAppContext.pageName,
        userQuery: userQuery,
        // currentAction and formSnapshotJSON can be added later
      };
      const aiResponse = await contextualAIGuideFlow(input);
      addMessage('ai', aiResponse.aiResponseText, aiResponse.suggestedActions);
    } catch (error) {
      console.error("Error calling contextual AI guide flow:", error);
      addMessage('ai', "Desculpe, não consegui processar sua solicitação no momento.");
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <AIGuideContext.Provider
      value={{
        isAIGuideOpen,
        toggleAIGuide,
        closeAIGuide,
        chatMessages,
        currentAppContext,
        updateAICurrentPageContext,
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
