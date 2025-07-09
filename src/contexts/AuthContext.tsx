
"use client";

import type { User as FirebaseUser, Auth as FirebaseAuthType } from 'firebase/auth';
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { 
  getAuth, 
  onIdTokenChanged,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { getFirebaseInstances } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { Assinatura } from '@/schemas/assinaturaSchema';
import { getUserProfile } from "@/services/userProfileService";
import { Loader2 } from 'lucide-react';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin' | 'vip';
  accessibleModules: string[];
}

type SubscriptionStatus = 'loading' | 'active' | 'inactive' | 'privileged';

interface AuthContextType {
  user: User | null;
  isAuthenticating: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  logout: (showToast?: boolean) => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  hasCompletedConsultation: boolean | null; 
  checkingConsultationStatus: boolean;
  setAuthConsultationCompleted: (status: boolean) => Promise<void>; 
  firebaseAuth: FirebaseAuthType | null; 
  subscriptionStatus: SubscriptionStatus;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const performAccessCheck = async (
  uid: string,
  email: string | null,
  db: any
): Promise<{ status: SubscriptionStatus; role: User['role']; accessibleModules: string[] }> => {
    if (!uid || !db) return { status: 'inactive', role: 'user', accessibleModules: [] };
    
    // 1. Check for privileged users via environment variables (highest priority)
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').filter(e => e.trim());
    if (email && adminEmails.includes(email)) {
        return { status: 'privileged', role: 'admin', accessibleModules: ['operacional', 'financeiro', 'consultor'] };
    }
    
    // 2. Check for roles in Firestore database
    let profileRole: User['role'] = 'user';
    let profileModules: string[] | undefined;
    try {
        const profile = await getUserProfile(uid);
        if (profile) {
            profileRole = profile.role || 'user';
            profileModules = profile.accessibleModules;
        }
        if (profileRole === 'admin' || profileRole === 'vip') {
            return { status: 'privileged', role: profileRole, accessibleModules: ['operacional', 'financeiro', 'consultor'] };
        }
    } catch (e) {
        console.error("Error checking user role from Firestore.", e);
    }
    
    // 3. Check for active subscription
    try {
        const subRef = doc(db, "assinaturas", uid);
        const subSnap = await getDoc(subRef);
        if (subSnap.exists()) {
            const subData = subSnap.data() as Assinatura;
            const isExpired = (subData.expiracao as Timestamp).toDate() < new Date();
            if (subData.status === 'ativa' && !isExpired) {
                const modules = profileModules || ['operacional', 'financeiro', 'consultor'];
                return { status: 'active', role: profileRole, accessibleModules: modules };
            }
        }
    } catch (e) {
        console.error("Error checking subscription status.", e);
    }

    // 4. Default to inactive
    return { status: 'inactive', role: profileRole, accessibleModules: profileModules || [] };
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [hasCompletedConsultation, setHasCompletedConsultation] = useState<boolean | null>(null);
  const [checkingConsultationStatus, setCheckingConsultationStatus] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('loading');
  const router = useRouter();
  const { toast } = useToast();

  const { auth: authInstance, db } = getFirebaseInstances();

  const logout = useCallback(async (showToast = true) => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      // The onIdTokenChanged listener will handle clearing the cookie.
      if (showToast) {
        toast({ title: "Sessão encerrada", description: "Você foi desconectado." });
      }
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast({ title: "Erro no Logout", description: error.message || "Ocorreu um erro.", variant: "destructive" });
    } finally {
       setUser(null);
       setSubscriptionStatus('inactive');
       setHasCompletedConsultation(null);
       router.push('/login');
    }
  }, [authInstance, router, toast]);

  const checkConsultationStatus = useCallback(async (uid: string) => {
    if (!db) {
      setHasCompletedConsultation(false);
      setCheckingConsultationStatus(false);
      return;
    }
    setCheckingConsultationStatus(true);
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", uid);
      const docSnap = await getDoc(consultationDocRef);
      setHasCompletedConsultation(docSnap.exists() && docSnap.data().completed);
    } catch (error) {
      console.error("Erro ao verificar status da consulta:", error);
      setHasCompletedConsultation(false);
      toast({ title: "Erro ao verificar dados", description: "Não foi possível verificar o status da sua consulta.", variant: "destructive" });
    } finally {
      setCheckingConsultationStatus(false);
    }
  }, [toast, db]);

  useEffect(() => {
    if (!authInstance) {
      setIsAuthenticating(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(authInstance, async (firebaseUser) => {
      setIsAuthenticating(true);
      if (firebaseUser) {
        // User is signed in, or the token has been refreshed.
        const token = await firebaseUser.getIdToken();
        await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        const { status, role, accessibleModules } = await performAccessCheck(firebaseUser.uid, firebaseUser.email, db);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          role,
          accessibleModules,
        });
        setSubscriptionStatus(status);
        await checkConsultationStatus(firebaseUser.uid);
      } else {
        // User is signed out.
        await fetch('/api/auth/session', { method: 'DELETE' });
        setUser(null);
        setSubscriptionStatus('inactive');
        setHasCompletedConsultation(null);
      }
      setIsAuthenticating(false);
    });

    return () => unsubscribe();
  }, [authInstance, db, checkConsultationStatus]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      await signInWithEmailAndPassword(authInstance, email, pass);
      // The onIdTokenChanged listener will handle setting the cookie and user state.
      toast({ title: "Autenticado", description: "Login realizado com sucesso." });
      const redirectPath = new URLSearchParams(window.location.search).get('redirect') || '/';
      router.push(redirectPath);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      let errorMessage = "Ocorreu um erro desconhecido durante o login.";
      
      if (error.code === 'auth/api-key-not-valid') {
        errorMessage = "A chave de API do Firebase é inválida. Verifique sua configuração no arquivo .env.local.";
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "Email ou senha incorretos.";
      }
      
      toast({ title: "Falha no Login", description: errorMessage, variant: "destructive", duration: 7000 });
      throw new Error(errorMessage);
    }
  }, [authInstance, router, toast]);

  const signUp = useCallback(async (name: string, email: string, pass: string) => {
    if (!authInstance || !db) throw new Error("Firebase Auth ou Firestore não inicializado.");
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      const newUser = userCredential.user;
      if (newUser) {
        await updateProfile(newUser, { displayName: name });
        // The onIdTokenChanged listener will handle setting the user and cookie.
        const timestamp = serverTimestamp();
        await setDoc(doc(db, "consultationsMetadata", newUser.uid), { completed: false, createdAt: timestamp });
        await setDoc(doc(db, "usuarios", newUser.uid), { createdAt: timestamp, updatedAt: timestamp, role: 'user', accessibleModules: [] }, { merge: true });
        toast({ title: "Registro bem-sucedido!", description: "Sua conta foi criada. Faça login para continuar." });
        await signOut(authInstance); // Force sign out to ensure they log in and create a session
        router.push('/login'); 
      }
    } catch (error: any) {
      let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este email já está cadastrado. Tente fazer login.";
      }
      toast({ title: "Erro no Registro", description, variant: "destructive" });
    }
  }, [authInstance, router, toast, db]);

  const setAuthConsultationCompleted = useCallback(async (status: boolean) => {
    if (!user || !user.uid || !db) return;
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", user.uid);
      await setDoc(consultationDocRef, { completed: status, completedAt: serverTimestamp() }, { merge: true });
      setHasCompletedConsultation(status);
    } catch (error) {
      toast({ title: "Erro ao atualizar dados", variant: "destructive" });
    }
  }, [user, toast, db]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!authInstance?.currentUser) throw new Error("Usuário não autenticado.");
    try {
      await updateProfile(authInstance.currentUser, { displayName: newName });
      setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } : null);
      toast({ title: "Sucesso!", description: "Seu nome foi atualizado." });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar nome", description: "Não foi possível atualizar seu nome.", variant: "destructive" });
      throw error;
    }
  }, [authInstance, toast]);
  

  const value = {
    user,
    isAuthenticating,
    signIn,
    signUp,
    logout,
    updateUserDisplayName,
    hasCompletedConsultation,
    checkingConsultationStatus,
    setAuthConsultationCompleted,
    firebaseAuth: authInstance,
    subscriptionStatus,
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
