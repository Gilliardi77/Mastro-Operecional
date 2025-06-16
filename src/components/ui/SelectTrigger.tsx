// src/components/ui/SelectTrigger.tsx
"use client";

import React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from "lucide-react"; // Adicionado para consistência com o Select original
import { cn } from '@/lib/utils';

export const SelectTrigger = React.memo(React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      // Classe base do select.tsx original para manter a aparência, mas você pode simplificar se preferir a sua.
      // Sua classe original: "flex h-10 w-full items-center justify-between rounded border px-3 text-sm",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
)));

SelectTrigger.displayName = 'SelectTrigger';
