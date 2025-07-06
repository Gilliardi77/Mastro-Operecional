
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes/dist/types";

// Renomeando a função exportada para ClientThemeProvider para evitar confusão
// com o ThemeProvider exportado por next-themes.
export function ClientThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
