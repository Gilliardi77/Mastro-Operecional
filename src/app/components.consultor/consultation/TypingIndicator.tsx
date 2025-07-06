"use client";

import { useConsultationContext } from "@/contexts/ConsultationContext";

export function TypingIndicator() {
  const { state } = useConsultationContext();
  const { showTypingIndicator, typingIndicatorText } = state;

  if (!showTypingIndicator) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center space-x-2 self-start rounded-lg bg-secondary p-3 shadow-sm">
      <div className="text-sm font-medium text-secondary-foreground">{typingIndicatorText}</div>
      <div className="flex space-x-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
      </div>
    </div>
  );
}
