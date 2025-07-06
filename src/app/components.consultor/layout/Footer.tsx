
"use client";

import React from "react";

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 p-4 shadow-sm backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Gestor Maestro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
