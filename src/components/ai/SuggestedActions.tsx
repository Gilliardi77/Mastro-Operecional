
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { SuggestedAction } from '@/ai/schemas/contextual-ai-guide-operacional-schema';

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onActionClick: (actionLabel: string, actionId: string, payload?: any) => void;
  isLoading: boolean;
  selectedActionId: string | null;
}

export default function SuggestedActions({ actions, onActionClick, isLoading, selectedActionId }: SuggestedActionsProps) {
  return (
    <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
      {actions.map((action, index) => {
        const uniqueKey = action.actionId + JSON.stringify(action.payload) + index;
        const isCurrentActionLoading = isLoading && selectedActionId === (action.actionId + JSON.stringify(action.payload));
        
        return (
          <Button
            key={uniqueKey}
            variant="outline"
            size="sm"
            className="w-full justify-start text-left h-auto py-1.5 text-xs"
            onClick={() => onActionClick(action.label, action.actionId, action.payload)}
            disabled={isLoading} // Disable all if any AI action is loading
          >
            {isCurrentActionLoading ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : null}
            {action.label}
          </Button>
        );
      })}
    </div>
  );
}
