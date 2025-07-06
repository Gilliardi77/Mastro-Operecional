
"use client";

import type { User as FirebaseUser, Auth as FirebaseAuthType } from 'firebase/auth'; // Adicionado Auth
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { firebaseApp, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  hasCompletedConsultation: boolean | null; 
  checkingConsultationStatus: boolean;
  setAuthConsultationCompleted: (status: boolean) => Promise<void>; 
  firebaseAuth: FirebaseAuthType | null; 
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedConsultation, setHasCompletedConsultation] = useState<boolean | null>(null);
  const [checkingConsultationStatus, setCheckingConsultationStatus] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const authInstance = firebaseApp ? getAuth(firebaseApp) : null;

  const checkConsultationStatus = useCallback(async (uid: string) => {
    if (!db) {
      console.warn("[AuthContext] Firestore (db) não está disponível. Não é possível verificar o status da consulta.");
      setHasCompletedConsultation(false); 
      setCheckingConsultationStatus(false);
      return;
    }
    setCheckingConsultationStatus(true);
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", uid); 
      const docSnap = await getDoc(consultationDocRef);
      if (docSnap.exists() && docSnap.data().completed) {
        setHasCompletedConsultation(true);
      } else {
        setHasCompletedConsultation(false);
      }
    } catch (error) {
      console.error("Erro ao verificar status da consulta:", error);
      setHasCompletedConsultation(false); 
      toast({ title: "Erro ao verificar dados", description: "Não foi possível verificar o status da sua consulta.", variant: "destructive" });
    } finally {
      setCheckingConsultationStatus(false);
    }
  }, [toast]);

  const setAuthConsultationCompleted = useCallback(async (status: boolean) => {
    if (!user || !user.uid || !db) {
      console.warn("[AuthContext] Usuário não logado ou Firestore não disponível. Não é possível atualizar o status da consulta.");
      return;
    }
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", user.uid);
      await setDoc(consultationDocRef, { completed: status, completedAt: serverTimestamp() }, { merge: true });
      setHasCompletedConsultation(status);
    } catch (error) {
      console.error("Erro ao atualizar status da consulta no AuthContext:", error);
      toast({ title: "Erro ao atualizar dados", description: "Não foi possível registrar a conclusão da sua consulta.", variant: "destructive" });
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authInstance) {
      setLoading(false);
      setCheckingConsultationStatus(false);
      console.warn("[AuthContext] Firebase Auth não inicializado porque firebaseApp é undefined.");
      return () => {}; 
    }

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser: FirebaseUser | null) => {
      // Envolve o processamento em uma função async para lidar com a lógica de estado
      const processAuthState = async () => {
        if (firebaseUser) {
          const currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          };
          setUser(currentUser);
          // Inicia a verificação do status da consulta, mas não bloqueia setLoading(false)
          // checkConsultationStatus gerencia seu próprio estado 'checkingConsultationStatus'
          checkConsultationStatus(firebaseUser.uid); 
        } else {
          setUser(null);
          setHasCompletedConsultation(null);
          setCheckingConsultationStatus(false); // Se não há usuário, não estamos verificando
        }
        setLoading(false); // Estado de autenticação básico foi determinado
      };

      processAuthState();
    });

    return () => unsubscribe();
  }, [authInstance, checkConsultationStatus]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      await signInWithEmailAndPassword(authInstance, email, pass);
      toast({ title: "Login bem-sucedido!", description: "Bem-vindo de volta!" });
      router.push('/dashboard'); 
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential') {
        toast({ 
          title: "Credenciais Inválidas", 
          description: "Email ou senha incorretos. Verifique seus dados ou crie uma conta se ainda não tiver.", 
          variant: "destructive" 
        });
      } else {
        console.error("Erro no login:", error); 
        toast({ 
          title: "Erro no Login", 
          description: error.message || "Ocorreu um erro desconhecido ao tentar fazer login.", 
          variant: "destructive" 
        });
      }
      setUser(null);
    }
  }, [authInstance, router, toast]);

  const signUp = useCallback(async (name: string, email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, pass);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        
        if (db) {
             const consultationDocRef = doc(db, "consultationsMetadata", userCredential.user.uid);
             await setDoc(consultationDocRef, { completed: false, createdAt: serverTimestamp() });
        }
        
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: name,
        });
        setHasCompletedConsultation(false); 
        
        toast({ title: "Registro bem-sucedido!", description: "Sua conta foi criada. Vamos começar seu diagnóstico!" });
        router.push('/consultation'); 
      }
    } catch (error: any) {
      console.error("Erro no registro:", error);
      let description = "Ocorreu um erro desconhecido. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este email já está cadastrado. Por favor, tente fazer login ou use um email diferente.";
      } else if (error.message) {
        description = error.message;
      }
      toast({ title: "Erro no Registro", description, variant: "destructive" });
      setUser(null); 
      setHasCompletedConsultation(null); 
    }
  }, [authInstance, router, toast]);

  const logout = useCallback(async () => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      await signOut(authInstance);
      toast({ title: "Logout realizado", description: "Até logo!" });
      router.push('/login');
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast({ title: "Erro no Logout", description: error.message || "Ocorreu um erro.", variant: "destructive" });
    } finally {
      setUser(null);
      setHasCompletedConsultation(null); 
    }
  }, [authInstance, router, toast]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!authInstance || !authInstance.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      throw new Error("Usuário não autenticado.");
    }
    // Não é necessário gerenciar o estado de carregamento global aqui
    try {
      await updateProfile(authInstance.currentUser, { displayName: newName });
      setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } : null);
      toast({ title: "Sucesso!", description: "Seu nome foi atualizado." });
    } catch (error: any) {
      console.error("Erro ao atualizar nome de exibição:", error);
      toast({ title: "Erro ao atualizar nome", description: error.message || "Não foi possível atualizar seu nome.", variant: "destructive" });
      throw error;
    }
  }, [authInstance, toast]);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
    updateUserDisplayName, 
    hasCompletedConsultation,
    checkingConsultationStatus,
    setAuthConsultationCompleted,
    firebaseAuth: authInstance, 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
