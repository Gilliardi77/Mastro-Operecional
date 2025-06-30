
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

// Helper function to check for privileged users (Admins or VIPs)
const isPrivilegedUser = (uid: string): boolean => {
  const adminUids = process.env.NEXT_PUBLIC_ADMIN_UIDS?.split(',').filter(id => id) || [];
  const vipUids = process.env.NEXT_PUBLIC_VIP_UIDS?.split(',').filter(id => id) || [];
  return !!uid && (adminUids.includes(uid) || vipUids.includes(uid));
};


export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const [hasCompletedConsultation, setHasCompletedConsultation] = useState<boolean | null>(null);
  const [checkingConsultationStatus, setCheckingConsultationStatus] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive'>('loading');
  const [checkingSubscriptionStatus, setCheckingSubscriptionStatus] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const { auth: authInstance, db } = getFirebaseInstances();

  const checkConsultationStatus = useCallback(async (uid: string) => {
    if (isPrivilegedUser(uid)) {
      setHasCompletedConsultation(true);
      setCheckingConsultationStatus(false);
      return;
    }

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

    if (isPrivilegedUser(uid)) {
        setSubscriptionStatus('active');
        setCheckingSubscriptionStatus(false);
        return;
    }

    if (!db) {
      console.warn("[AuthContext] Firestore (db) não está disponível. Não é possível verificar o status da assinatura.");
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
  }, [user, toast, db]);

  const logout = useCallback(async () => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      await signOut(authInstance);
      // O onAuthStateChanged vai lidar com o reset dos estados
    } catch (error: any) {
      console.error("Erro no logout:", error);
      toast({ title: "Erro no Logout", description: error.message || "Ocorreu um erro.", variant: "destructive" });
    }
  }, [authInstance, toast]);


  useEffect(() => {
    if (!authInstance) {
      setIsAuthenticating(false);
      setCheckingConsultationStatus(false);
      setCheckingSubscriptionStatus(false);
      console.warn("[AuthContext] Firebase Auth não inicializado.");
      return () => {}; 
    }

    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser: FirebaseUser | null) => {
      const processAuthState = async () => {
        if (firebaseUser) {
          const currentUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
          };
          setUser(currentUser);
          await checkConsultationStatus(firebaseUser.uid); 
          await checkSubscriptionStatus(firebaseUser.uid);
        } else {
          setUser(null);
          setHasCompletedConsultation(null);
          setCheckingConsultationStatus(false);
          setSubscriptionStatus('inactive');
          setCheckingSubscriptionStatus(false);
          router.push('/login'); // Garante redirecionamento no logout
        }
        setIsAuthenticating(false);
      };

      processAuthState();
    });

    return () => unsubscribe();
  }, [authInstance, checkConsultationStatus, checkSubscriptionStatus, router]);
  
  // Efeito para forçar logout se a assinatura se tornar inativa
  useEffect(() => {
    if (!isAuthenticating && user && subscriptionStatus === 'inactive') {
      if (isPrivilegedUser(user.uid)) {
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
  }, [subscriptionStatus, user, isAuthenticating, logout, toast]);


  const checkUserHasActiveSubscription = useCallback(async (uid: string): Promise<boolean> => {
    if (!db) {
      console.warn("[AuthContext] Firestore (db) não está disponível.");
      return false;
    }
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
      console.error("Erro ao verificar status da assinatura no login:", error);
      return false;
    }
  }, [db]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      const loggedInUser = userCredential.user;

      if (loggedInUser) {
        if (isPrivilegedUser(loggedInUser.uid)) {
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
            description: "Você não possui uma assinatura ativa. Por favor, verifique seu plano ou entre em contato com o suporte.", 
            variant: "destructive",
            duration: 7000,
          });
        }
      } else {
         throw new Error("Não foi possível obter os dados do usuário após o login.");
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast({ 
          title: "Credenciais Inválidas", 
          description: "Email ou senha incorretos.", 
          variant: "destructive" 
        });
      } else {
        console.error("Erro no login:", error); 
        toast({ title: "Erro no Login", description: "Ocorreu um erro desconhecido.", variant: "destructive" });
      }
    }
  }, [authInstance, router, toast, checkUserHasActiveSubscription]);

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
        
        toast({ title: "Registro bem-sucedido!", description: "Sua conta foi criada. Verifique seu plano de assinatura para ter acesso." });
        router.push('/'); 
      }
    } catch (error: any) {
      console.error("Erro no registro:", error);
      let description = "Ocorreu um erro desconhecido. Tente novamente.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este email já está cadastrado. Tente fazer login.";
      }
      toast({ title: "Erro no Registro", description, variant: "destructive" });
    }
  }, [authInstance, router, toast, db]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!authInstance || !authInstance.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      throw new Error("Usuário não autenticado.");
    }
    try {
      await updateProfile(authInstance.currentUser, { displayName: newName });
      setUser(prevUser => prevUser ? { ...prevUser, displayName: newName } : null);
      toast({ title: "Sucesso!", description: "Seu nome foi atualizado." });
    } catch (error: any) {
      console.error("Erro ao atualizar nome de exibição:", error);
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
