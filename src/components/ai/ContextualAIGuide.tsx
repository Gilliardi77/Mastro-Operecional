
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Send, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIGuide } from '@/contexts/AIGuideContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast'; 
import SuggestedActions from './SuggestedActions';

const QuickSuggestions = ({ onSuggestionClick }: { onSuggestionClick: (query: string) => void }) => {
  const suggestions = [
    { label: 'Como crio uma Ordem de Serviço?', query: 'Como eu crio uma Ordem de Serviço passo a passo?' },
    { label: 'Para que serve esta página?', query: 'Para que serve esta página?' },
    { label: 'Me dê dicas de como atender um cliente', query: 'Me dê dicas de como atender um cliente' },
  ];

  return (
    <div className="p-4 space-y-2 text-center border-b">
        <p className="text-sm text-muted-foreground">Não sabe por onde começar? Tente uma das opções abaixo.</p>
        <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((s) => (
                <Button key={s.label} variant="outline" size="sm" onClick={() => onSuggestionClick(s.query)}>
                    {s.label}
                </Button>
            ))}
        </div>
    </div>
  );
};


export default function ContextualAIGuide() {
  const {
    isAIGuideOpen,
    toggleAIGuide,
    closeAIGuide,
    chatMessages,
    sendQueryToAIGuide,
    isAILoading,
    currentAppContext,
  } = useAIGuide();
  const [userInput, setUserInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast(); 
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);


  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isAIGuideOpen && chatMessages.length === 0 && !isAILoading) {
      const savedChat = typeof window !== 'undefined' ? sessionStorage.getItem(`chat-${currentAppContext.pageName}`) : null;
      if (savedChat) {
        // Chat is loaded from storage via context, so no need for proactive message if history exists
      } else {
        // No proactive message by default, user will see quick suggestions
      }
    }
  }, [isAIGuideOpen, chatMessages.length, currentAppContext.pageName, sendQueryToAIGuide, isAILoading]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isAILoading) return;
    const query = userInput;
    setUserInput('');
    await sendQueryToAIGuide(query);
  };
  
  const handleQuickSuggestionClick = (query: string) => {
      setUserInput(''); // Clear input in case user was typing
      sendQueryToAIGuide(query);
  };
  
  const handleSuggestedAction = async (actionLabel: string, actionId: string, payload?: any) => {
    setUserInput('');
    setSelectedActionId(actionId + JSON.stringify(payload)); 
  
    const queryForAI = `O usuário clicou na ação sugerida: "${actionLabel}".`;
  
    try {
      switch (actionId) {
        case 'navigate_to_page':
          if (payload && typeof payload.path === 'string') {
            router.push(payload.path);
            closeAIGuide();
          } else {
            toast({ title: "Erro de Navegação", description: "Caminho inválido fornecido pela IA.", variant: "destructive" });
          }
          break;
        case 'preencher_campo_formulario':
          if (payload && payload.formName && payload.fieldName && payload.value !== undefined) {
            const event = new CustomEvent('aiFillFormEvent', {
              detail: {
                formName: payload.formName,
                fieldName: payload.fieldName,
                value: payload.value,
                actionLabel: actionLabel,
                itemIndex: payload.itemIndex,
              }
            });
            window.dispatchEvent(event);
            await sendQueryToAIGuide(`O campo foi preenchido. O que mais posso fazer?`, { asUserMessage: false });
          } else {
            toast({ title: "Erro de Preenchimento", description: "Dados insuficientes da IA para preencher o campo.", variant: "destructive" });
          }
          break;
        case 'abrir_modal_novo_cliente_os':
          if (payload) {
            const event = new CustomEvent('aiOpenNewClientModalOSEvent', {
              detail: {
                ...payload,
                actionLabel: actionLabel,
              }
            });
            window.dispatchEvent(event);
            await sendQueryToAIGuide(`O modal para adicionar o cliente '${payload.suggestedClientName}' foi aberto.`, { asUserMessage: false });
          } else {
            toast({ title: "Erro ao Abrir Modal", description: "Informações insuficientes da IA.", variant: "destructive" });
          }
          break;
        default:
          await sendQueryToAIGuide(queryForAI, { asUserMessage: true });
          break;
      }
    } finally {
      // Resetting is handled by useEffect on isAILoading
    }
  };

  useEffect(() => {
    if (!isAILoading) {
      setSelectedActionId(null);
    }
  }, [isAILoading]);


  if (!currentAppContext.pageName) {
    return null;
  }

  return (
    <>
      <Button
        size="icon"
        className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50",
            "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
            "hover:bg-[hsl(var(--success))]/90" 
          )}
        onClick={toggleAIGuide}
        aria-label="Abrir Guia de IA"
      >
        {isAIGuideOpen ? <X className="h-7 w-7" /> : <Lightbulb className="h-7 w-7 text-yellow-400" />}
      </Button>

      <Sheet open={isAIGuideOpen} onOpenChange={(open) => { if (!open) closeAIGuide(); else toggleAIGuide();}}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-2 border-b">
            <SheetTitle className="text-xl flex items-center gap-2">
              <Lightbulb className="h-6 w-6 text-primary" />
              Guia Inteligente Maestro
            </SheetTitle>
            <SheetDescription>
              Converse comigo para navegar, preencher formulários ou aprender sobre a página "{currentAppContext.pageName}".
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-grow" ref={scrollAreaRef}>
            {chatMessages.length === 0 && !isAILoading && (
                <QuickSuggestions onSuggestionClick={handleQuickSuggestionClick} />
            )}
            <div className="space-y-4 p-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] p-3 rounded-lg",
                    msg.sender === 'user' ? 'bg-primary/10 self-end rounded-br-none' : 'bg-muted self-start rounded-bl-none'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  <span className="text-xs text-muted-foreground self-end mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'ai' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <SuggestedActions
                      actions={msg.suggestedActions}
                      onActionClick={handleSuggestedAction}
                      isLoading={isAILoading}
                      selectedActionId={selectedActionId}
                    />
                  )}
                </div>
              ))}
              {isAILoading && chatMessages[chatMessages.length -1]?.sender === 'user' && !selectedActionId && (
                <div className="flex self-start bg-muted p-3 rounded-lg rounded-bl-none max-w-[85%]">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="p-4 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Digite sua pergunta ou ação..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-grow"
                disabled={isAILoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAILoading && userInput.trim()) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={isAILoading || !userInput.trim()} aria-label="Enviar mensagem">
                {isAILoading && !selectedActionId ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
