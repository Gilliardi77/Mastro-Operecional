
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Lightbulb, Send, X, Loader2, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIGuide } from '@/contexts/AIGuideContext';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { SuggestedAction } from '@/ai/schemas/contextual-ai-guide-schema';

export default function ContextualAIGuide() {
  const {
    isAIGuideOpen,
    toggleAIGuide,
    closeAIGuide,
    chatMessages,
    sendQueryToAIGuide,
    isAILoading,
    currentAppContext,
    updateAICurrentAppContext,
  } = useAIGuide();
  const [userInput, setUserInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLInputElement>) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isAILoading) return;
    const query = userInput;
    setUserInput('');
    await sendQueryToAIGuide(query);
  };

  const handleSuggestedAction = async (action: SuggestedAction) => {
    setUserInput(''); 

    // Envia uma mensagem simulada do usuário para manter o fluxo da conversa
    await sendQueryToAIGuide(`Ok, vou tentar: "${action.label}"`, true);

    updateAICurrentAppContext({ currentAction: action.actionId });

    switch (action.actionId) {
      case 'navigate_to_page':
        if (action.payload && typeof action.payload.path === 'string') {
          router.push(action.payload.path);
          closeAIGuide();
        } else {
          toast({ title: "Erro de Navegação", description: "Caminho inválido fornecido pela IA.", variant: "destructive"});
          await sendQueryToAIGuide("Ocorreu um erro ao tentar navegar. O caminho fornecido não é válido.", true);
        }
        break;
      
      case 'preencher_campo_formulario':
        if (action.payload && action.payload.formName && action.payload.fieldName && action.payload.value !== undefined) {
          const event = new CustomEvent('aiFillFormEvent', {
            detail: {
              formName: action.payload.formName,
              fieldName: action.payload.fieldName,
              value: action.payload.value,
              actionLabel: action.label
            }
          });
          window.dispatchEvent(event);
          toast({ title: "Ação da IA Executada", description: `Preenchendo '${action.payload.fieldName}'. A página precisa estar preparada para receber este comando.`});
        } else {
           toast({ title: "Erro de Preenchimento", description: "Dados insuficientes da IA para preencher o campo.", variant: "destructive"});
           await sendQueryToAIGuide("Não consegui preencher o campo. Informações faltando no comando da IA.", true);
        }
        break;

      case 'continue_conversation':
        // Nenhuma operação de front-end é necessária aqui.
        // A chamada sendQueryToAIGuide acima já informou a IA sobre a escolha do usuário.
        // A IA irá gerar uma nova resposta. Este case apenas evita a mensagem de "Ação Desconhecida".
        break;

      default:
        toast({ title: "Ação Desconhecida", description: `A ação '${action.label}' ainda não é totalmente suportada para execução automática, mas a IA foi informada.`});
        await sendQueryToAIGuide(`A ação '${action.actionId}' foi recebida, mas não há um manipulador para ela no momento.`, true);
        break;
    }
  };


  if (!currentAppContext.pageName) { 
    return null;
  }

  return (
    <>
      <Button
        variant="default"
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50 bg-chart-1 hover:bg-chart-1/80 text-primary-foreground" 
        onClick={toggleAIGuide}
        aria-label={isAIGuideOpen ? "Fechar Guia de IA" : "Abrir Guia de IA"}
      >
        {isAIGuideOpen ? <X className="h-7 w-7" /> : <Lightbulb className="h-7 w-7" />}
      </Button>

      <Sheet open={isAIGuideOpen} onOpenChange={(open) => { if (!open) closeAIGuide(); }}>
        <SheetContent side="right" className="w-[90vw] max-w-[450px] sm:w-[540px] p-0 flex flex-col shadow-2xl">
          <SheetHeader className="p-4 pb-2 border-b">
            <SheetTitle className="text-lg flex items-center gap-2 font-headline">
              <Lightbulb className="h-5 w-5 text-primary" />
              Guia Inteligente
            </SheetTitle>
            <SheetDescription className="text-xs">
              Estou aqui para ajudar na página: <strong className="text-primary">{currentAppContext.pageName}</strong>.
              Como posso te auxiliar?
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
            <div className="space-y-3 mb-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col max-w-[85%] p-2.5 rounded-lg shadow-sm",
                    msg.sender === 'user'
                      ? 'bg-primary/10 self-end rounded-br-none text-primary-foreground items-end'
                      : 'bg-muted self-start rounded-bl-none text-foreground items-start'
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                  <span className={cn("text-xs mt-1", msg.sender === 'user' ? 'text-primary/60' : 'text-muted-foreground')}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {msg.sender === 'ai' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50 space-y-1.5 w-full">
                      {msg.suggestedActions.map((action, index) => (
                        <Button
                          key={`${action.actionId}-${index}`}
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-auto py-1.5 text-xs leading-snug bg-background hover:bg-accent/80"
                          onClick={() => handleSuggestedAction(action)}
                          disabled={isAILoading}
                        >
                          <CornerDownLeft className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="flex-1 whitespace-normal break-words text-left">
                            {action.label}
                          </span>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isAILoading && (!chatMessages.length || chatMessages[chatMessages.length -1].sender === 'user') && (
                <div className="flex self-start bg-muted p-3 rounded-lg rounded-bl-none max-w-[85%] shadow-sm">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </div>
          </ScrollArea>

          <SheetFooter className="p-3 border-t bg-background">
            <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
              <Input
                type="text"
                placeholder="Sua pergunta ou comando..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                className="flex-grow h-9"
                disabled={isAILoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !isAILoading && userInput.trim()) {
                    handleSendMessage(e as React.KeyboardEvent<HTMLInputElement>);
                  }
                }}
              />
              <Button type="submit" size="icon" className="h-9 w-9" disabled={isAILoading || !userInput.trim()} aria-label="Enviar mensagem">
                {isAILoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
