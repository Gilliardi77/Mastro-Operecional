'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getFirebaseInstances } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticating: boolean;
}

// 1. Definir o Contexto aqui
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// 2. Definir o Provider aqui
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  useEffect(() => {
    const { auth: firebaseAuthInstance } = getFirebaseInstances();

    if (!firebaseAuthInstance) {
      console.warn("[AuthProvider] Instância do Firebase Auth não disponível na montagem. Verifique firebase.ts");
      setIsLoading(false);
      setIsAuthenticating(false);
      return;
    }
    
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged(
      (firebaseUser) => {
        setUser(firebaseUser);
        setIsLoading(false);
        setIsAuthenticating(false);
      },
      (error) => {
        console.error("[AuthProvider] Erro no onAuthStateChanged:", error);
        setUser(null);
        setIsLoading(false);
        setIsAuthenticating(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Autenticando...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticating }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Definir e exportar o hook useAuth aqui
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};