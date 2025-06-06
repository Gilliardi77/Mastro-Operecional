
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import React, { createContext, useState, useEffect, type ReactNode } from 'react';
import { auth, getFirebaseInstances } from '@/lib/firebase'; // getFirebaseInstances para garantir init
import { Loader2 } from 'lucide-react';

export interface AuthContextType {
  user: FirebaseUser | null;
  isLoading: boolean;
  isAuthenticating: boolean; // Adicionado para um estado de carregamento mais granular
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Carregamento inicial da verificação do estado de auth
  const [isAuthenticating, setIsAuthenticating] = useState(true); // Estado para quando o Firebase está verificando

  useEffect(() => {
    // Garante que o Firebase seja inicializado antes de tentar usar 'auth'
    const { auth: firebaseAuthInstance } = getFirebaseInstances(); 

    if (!firebaseAuthInstance) {
      console.warn("[AuthProvider] Instância do Firebase Auth não disponível na montagem. Verifique firebase.ts");
      setIsLoading(false);
      setIsAuthenticating(false);
      return;
    }
    
    console.log("[AuthProvider] Configurando onAuthStateChanged listener...");
    const unsubscribe = firebaseAuthInstance.onAuthStateChanged(
      (firebaseUser) => {
        console.log("[AuthProvider] onAuthStateChanged disparado. Usuário:", firebaseUser ? firebaseUser.uid : 'null');
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

    // Cleanup subscription on unmount
    return () => {
      console.log("[AuthProvider] Limpando onAuthStateChanged listener.");
      unsubscribe();
    };
  }, []);

  // Renderiza um loader enquanto o Firebase verifica o estado de autenticação
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
