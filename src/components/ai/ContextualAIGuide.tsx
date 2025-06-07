
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, Send, X, Loader2 } from 'lucide-react'; // Alterado aqui
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'; // SheetClose removido se não usado
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
// Badge removido se não usado
import { useAIGuide } from '@/contexts/AIGuideContext';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isAILoading) return;
    const query = userInput;
    setUserInput('');
    await sendQueryToAIGuide(query);
  };
  
  const handleSuggestedAction = async (actionLabel: string, actionId: string, payload?: any) => {
    setUserInput(''); 
    await sendQueryToAIGuide(`O que acontece se eu clicar em: "${actionLabel}"? (Contexto da ação: ${actionId})`);
  };


  if (!currentAppContext.pageName) {
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-primary hover:bg-primary/90 text-primary-foreground"
        onClick={toggleAIGuide}
        aria-label="Abrir Guia de IA"
      >
        {isAIGuideOpen ? <X className="h-7 w-7" /> : <MessageCircleQuestion className="h-7 w-7" />} {/* Alterado aqui */}
      </Button>

      <Sheet open={isAIGuideOpen} onOpenChange={(open) => { if (!open) closeAIGuide(); else toggleAIGuide();}}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-2 border-b">
            <SheetTitle className="text-xl flex items-center gap-2">
              <MessageCircleQuestion className="h-6 w-6 text-primary" /> {/* Alterado aqui */}
              Guia Inteligente Business Maestro
            </SheetTitle>
            <SheetDescription>
              Precisa de ajuda com a página "{currentAppContext.pageName}"? Pergunte-me!
            </SheetDescription>
          </SheetHeader>
          
          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            <div className="space-y-4 mb-4">
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
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                      {msg.suggestedActions.map(action => (
                        <Button
                          key={action.actionId}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-1.5 text-xs"
                          onClick={() => handleSuggestedAction(action.label, action.actionId, action.payload)}
                          disabled={isAILoading}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isAILoading && chatMessages.length > 0 && chatMessages[chatMessages.length -1].sender === 'user' && (
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
                placeholder="Digite sua pergunta..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-grow"
                disabled={isAILoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAILoading && userInput.trim()) {
                    e.preventDefault(); // Prevenir nova linha no Enter
                    handleSendMessage();
                  }
                }}
              />
              <Button type="submit" size="icon" disabled={isAILoading || !userInput.trim()} aria-label="Enviar mensagem">
                {isAILoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
