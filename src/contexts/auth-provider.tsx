
"use client";

import type { User as FirebaseUser } from 'firebase/auth';
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
} from 'firebase/auth';
import { getFirebaseInstances } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, Timestamp } from "firebase/firestore";
import type { Assinatura } from '@/schemas/assinaturaSchema';
import { getUserProfile } from "@/services/userProfileService";
import { Loader2 } from 'lucide-react';

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin' | 'vip';
}

type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'privileged';

interface AuthContextType {
  user: User | null;
  isAuthenticating: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  subscriptionStatus: SubscriptionStatus;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Centralized access check function
const performAccessCheck = async (uid: string, db: any): Promise<{ status: SubscriptionStatus }> => {
    if (!uid || !db) return { status: 'inactive' };

    try {
        const profile = await getUserProfile(uid);
        if (profile?.role === 'admin' || profile?.role === 'vip') {
            return { status: 'privileged' };
        }
    } catch (e) {
        console.error("Error checking user role, proceeding as standard user.", e);
    }
    
    try {
        const subRef = doc(db, "assinaturas", uid);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
            const subData = subSnap.data() as Assinatura;
            const isExpired = (subData.expiracao as Timestamp).toDate() < new Date();
            if (subData.status === 'ativa' && !isExpired) {
                return { status: 'active' };
            }
        }
    } catch (e) {
        console.error("Error checking subscription status.", e);
    }

    return { status: 'inactive' };
};


export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const router = useRouter();
  const { toast } = useToast();
  const { auth: authInstance, db } = getFirebaseInstances();

  const logout = useCallback(async (showToast = true) => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      if (showToast) {
        toast({ title: "Sessão encerrada", description: "Você foi desconectado." });
      }
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast({ title: "Erro no Logout", description: error.message || "Ocorreu um erro.", variant: "destructive" });
    } finally {
       router.push('/login');
    }
  }, [authInstance, router, toast]);

  useEffect(() => {
    if (!authInstance) {
      setIsAuthenticating(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser: FirebaseUser | null) => {
      setIsAuthenticating(true);
      if (firebaseUser) {
        const { status } = await performAccessCheck(firebaseUser.uid, db);
        setSubscriptionStatus(status);
        
        if (status === 'inactive') {
          toast({
            title: "Acesso Negado",
            description: "Sua assinatura não está ativa ou você não tem permissão. Faça login novamente se acredita que isso é um erro.",
            variant: "destructive",
            duration: 8000,
          });
          await logout(false);
        } else {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: profile?.role || 'user',
          });
        }
      } else {
        setUser(null);
        setSubscriptionStatus('inactive');
      }
      setIsAuthenticating(false);
    });
    return () => unsubscribe();
  }, [authInstance, db, toast, logout]);
  
  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      if (userCredential.user) {
        // onAuthStateChanged will handle the access check and redirect/logout flow.
        toast({ title: "Autenticado", description: "Verificando seu acesso..." });
        // The useEffect above will trigger automatically.
        // If successful, the user will be authenticated and stay on the app.
        // If not, they will be logged out and redirected to /login by the effect.
      } else {
         throw new Error("Não foi possível obter os dados do usuário após o login.");
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        throw new Error("Email ou senha incorretos.");
      } else {
        throw new Error("Ocorreu um erro desconhecido durante o login.");
      }
    }
  }, [authInstance, toast]);

  const value = {
    user,
    isAuthenticating,
    signIn,
    logout,
    subscriptionStatus
  };

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Verificando acesso...</p>
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
