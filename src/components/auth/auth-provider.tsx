
"use client";

import type { User as FirebaseUser, Auth as FirebaseAuthType } from 'firebase/auth';
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
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

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticating: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  hasCompletedConsultation: boolean | null; 
  checkingConsultationStatus: boolean;
  setAuthConsultationCompleted: (status: boolean) => Promise<void>; 
  firebaseAuth: FirebaseAuthType | null; 
  subscriptionStatus: 'loading' | 'active' | 'inactive';
  checkingSubscriptionStatus: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'vip' | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [hasCompletedConsultation, setHasCompletedConsultation] = useState<boolean | null>(null);
  const [checkingConsultationStatus, setCheckingConsultationStatus] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive'>('loading');
  const [checkingSubscriptionStatus, setCheckingSubscriptionStatus] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const { auth: authInstance, db } = getFirebaseInstances();

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

  const checkSubscriptionStatus = useCallback(async (uid: string) => {
    setCheckingSubscriptionStatus(true);
    if (!db) {
      setSubscriptionStatus('inactive');
      setCheckingSubscriptionStatus(false);
      return;
    }

    try {
      const subRef = doc(db, "assinaturas", uid);
      const subSnap = await getDoc(subRef);
      
      if (subSnap.exists()) {
        const subData = subSnap.data() as Assinatura;
        const expiracaoTimestamp = subData.expiracao as Timestamp;
        const isExpired = expiracaoTimestamp.toDate() < new Date();

        if (subData.status === 'ativa' && !isExpired) {
          setSubscriptionStatus('active');
        } else {
          setSubscriptionStatus('inactive');
        }
      } else {
        setSubscriptionStatus('inactive');
      }
    } catch (error) {
      console.error("Erro ao verificar status da assinatura:", error);
      setSubscriptionStatus('inactive');
    } finally {
      setCheckingSubscriptionStatus(false);
    }
  }, [toast, db]);

  const setAuthConsultationCompleted = useCallback(async (status: boolean) => {
    if (!user || !user.uid || !db) return;
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", user.uid);
      await setDoc(consultationDocRef, { completed: status, completedAt: serverTimestamp() }, { merge: true });
      setHasCompletedConsultation(status);
    } catch (error) {
      console.error("Erro ao atualizar status da consulta:", error);
      toast({ title: "Erro ao atualizar dados", description: "Não foi possível registrar a conclusão da sua consulta.", variant: "destructive" });
    }
  }, [user, toast, db]);

  const logout = useCallback(async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      router.push('/login');
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast({ title: "Erro no Logout", description: error.message || "Ocorreu um erro.", variant: "destructive" });
    }
  }, [authInstance, router, toast]);

  useEffect(() => {
    if (!authInstance) {
      setIsAuthenticating(false);
      return () => {}; 
    }

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser: FirebaseUser | null) => {
      const processAuthState = async () => {
        setIsAuthenticating(true);
        if (firebaseUser) {
          const currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          };
          setUser(currentUser);
          
          try {
            const profile = await getUserProfile(firebaseUser.uid);
            const actualRole = profile?.role; // Can be 'vip', 'admin', 'user', or undefined
            const isPrivileged = actualRole === 'admin' || actualRole === 'vip';
            
            setUserRole(actualRole ?? 'user');

            if (isPrivileged) {
              setHasCompletedConsultation(true);
              setSubscriptionStatus('active');
              setCheckingConsultationStatus(false);
              setCheckingSubscriptionStatus(false);
            } else {
              await checkConsultationStatus(firebaseUser.uid); 
              await checkSubscriptionStatus(firebaseUser.uid);
            }
          } catch (e) {
             console.error("Error during post-auth checks:", e);
             setUserRole('user');
             setHasCompletedConsultation(false);
             setSubscriptionStatus('inactive');
             setCheckingConsultationStatus(false);
             setCheckingSubscriptionStatus(false);
             toast({ title: "Erro ao carregar perfil", description: "Não foi possível verificar seus dados. O acesso pode ser limitado.", variant: "destructive" });
          }
        } else {
          setUser(null);
          setUserRole(null);
          setHasCompletedConsultation(null);
          setSubscriptionStatus('inactive');
          setCheckingConsultationStatus(false);
          setCheckingSubscriptionStatus(false);
          if (router) router.push('/login');
        }
        setIsAuthenticating(false);
      };
      processAuthState();
    });
    return () => unsubscribe();
  }, [authInstance, checkConsultationStatus, checkSubscriptionStatus, router, toast]);
  
  useEffect(() => {
    if (!isAuthenticating && user && subscriptionStatus === 'inactive') {
      const isPrivileged = userRole === 'admin' || userRole === 'vip';
      if (isPrivileged) {
        return;
      }
      
      toast({
        title: "Acesso Encerrado",
        description: "Sua assinatura não está mais ativa. Por favor, regularize sua situação para acessar o sistema.",
        variant: "destructive",
        duration: 8000,
      });
      logout();
    }
  }, [subscriptionStatus, user, userRole, isAuthenticating, logout, toast]);

  const checkUserHasActiveSubscription = useCallback(async (uid: string): Promise<boolean> => {
    if (!db) return false;
    try {
      const subRef = doc(db, "assinaturas", uid);
      const subSnap = await getDoc(subRef);
      if (subSnap.exists()) {
        const subData = subSnap.data() as Assinatura;
        const isExpired = (subData.expiracao as Timestamp).toDate() < new Date();
        return subData.status === 'ativa' && !isExpired;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, [db]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      const loggedInUser = userCredential.user;

      if (loggedInUser) {
        const profile = await getUserProfile(loggedInUser.uid);
        const actualRole = profile?.role;
        const isPrivileged = actualRole === 'admin' || actualRole === 'vip';

        if (isPrivileged) {
          toast({ title: "Login Liberado", description: "Bem-vindo(a)!" });
          router.push('/'); 
          return;
        }

        const hasAccess = await checkUserHasActiveSubscription(loggedInUser.uid);
        
        if (hasAccess) {
          toast({ title: "Login bem-sucedido!", description: "Bem-vindo de volta!" });
          router.push('/'); 
        } else {
          await signOut(authInstance);
          toast({ 
            title: "Acesso Negado", 
            description: "Você não possui uma assinatura ativa.", 
            variant: "destructive",
            duration: 7000,
          });
        }
      } else {
         throw new Error("Não foi possível obter os dados do usuário após o login.");
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast({ title: "Credenciais Inválidas", description: "Email ou senha incorretos.", variant: "destructive" });
      } else {
        toast({ title: "Erro no Login", description: "Ocorreu um erro desconhecido.", variant: "destructive" });
      }
    }
  }, [authInstance, router, toast, checkUserHasActiveSubscription]);

  const signUp = useCallback(async (name: string, email: string, pass: string) => {
    if (!authInstance || !db) throw new Error("Firebase Auth ou Firestore não inicializado.");
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      const newUser = userCredential.user;
      if (newUser) {
        await updateProfile(newUser, { displayName: name });
        
        const timestamp = serverTimestamp();
        await setDoc(doc(db, "consultationsMetadata", newUser.uid), { completed: false, createdAt: timestamp });
        await setDoc(doc(db, "usuarios", newUser.uid), { createdAt: timestamp, updatedAt: timestamp, role: 'user' }, { merge: true });
        
        router.push('/'); 
      }
    } catch (error: any) {
      let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este email já está cadastrado. Tente fazer login.";
      }
      toast({ title: "Erro no Registro", description, variant: "destructive" });
    }
  }, [authInstance, router, toast, db]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!authInstance || !authInstance.currentUser) {
      throw new Error("Usuário não autenticado.");
    }
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
    checkingSubscriptionStatus,
  };

  if (isAuthenticating) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Autenticando...</p>
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
