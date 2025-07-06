
"use client";

import type { User as FirebaseUser, Auth as FirebaseAuthType } from 'firebase/auth';
import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext } from 'react';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { app as firebaseApp, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import type { Assinatura } from '@/schemas/assinaturaSchema';
import type { UserProfileFirestore } from '@/schemas/userProfileSchema';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  hasCompletedConsultation: boolean | null; 
  checkingConsultationStatus: boolean;
  setAuthConsultationCompleted: (status: boolean) => Promise<void>; 
  firebaseAuth: FirebaseAuthType | null; 
  subscriptionStatus: 'loading' | 'active' | 'inactive';
  checkingSubscriptionStatus: boolean;
  userRole: 'user' | 'admin' | 'vip' | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * The single source of truth for checking user access.
 * It queries Firestore for the user's role and subscription status.
 *
 * @param uid The user's Firebase UID.
 * @returns An object with `hasAccess`, `role`, and `subscription` status.
 */
async function performAccessCheck(uid: string): Promise<{
    hasAccess: boolean;
    role: 'user' | 'admin' | 'vip' | null;
    subscription: 'active' | 'inactive';
    consultationCompleted: boolean;
  }> {
    if (!db) {
      console.warn("Firestore not available for access check.");
      return { hasAccess: false, role: 'user', subscription: 'inactive', consultationCompleted: false };
    }

    try {
      const profileRef = doc(db, "usuarios", uid);
      const subscriptionRef = doc(db, "assinaturas", uid);
      const consultationRef = doc(db, "consultationsMetadata", uid);
      
      const [profileSnap, subscriptionSnap, consultationSnap] = await Promise.all([
        getDoc(profileRef),
        getDoc(subscriptionRef),
        getDoc(consultationRef),
      ]);

      const profileData = profileSnap.exists() ? (profileSnap.data() as UserProfileFirestore) : null;
      const role = profileData?.role || 'user';
      
      // Privileged access: if the role is 'admin' or 'vip', access is granted.
      if (role === 'admin' || role === 'vip') {
        return { hasAccess: true, role, subscription: 'active', consultationCompleted: true }; // VIP/Admin bypasses consultation check and assumes active sub
      }

      // Standard user access: requires an active subscription.
      let subscriptionIsActive = false;
      if (subscriptionSnap.exists()) {
        const subData = subscriptionSnap.data() as Assinatura;
        const expiracao = (subData.expiracao as Timestamp).toDate();
        if (subData.status === 'ativa' && expiracao >= new Date()) {
          subscriptionIsActive = true;
        }
      }

      const hasAccess = subscriptionIsActive;
      const consultationCompleted = consultationSnap.exists() && consultationSnap.data().completed;
      
      return { hasAccess, role, subscription: subscriptionIsActive ? 'active' : 'inactive', consultationCompleted };

    } catch (error) {
      console.error("Critical error during access check:", error);
      return { hasAccess: false, role: 'user', subscription: 'inactive', consultationCompleted: false };
    }
}


export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasCompletedConsultation, setHasCompletedConsultation] = useState<boolean | null>(null);
  const [checkingConsultationStatus, setCheckingConsultationStatus] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'loading' | 'active' | 'inactive'>('loading');
  const [checkingSubscriptionStatus, setCheckingSubscriptionStatus] = useState(true);
  const [userRole, setUserRole] = useState<'user' | 'admin' | 'vip' | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();

  const authInstance = firebaseApp ? getAuth(firebaseApp) : null;

  useEffect(() => {
    if (!authInstance) {
      setLoading(false);
      setCheckingConsultationStatus(false);
      setCheckingSubscriptionStatus(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      setLoading(true);
      setCheckingConsultationStatus(true);
      setCheckingSubscriptionStatus(true);
      
      if (firebaseUser) {
        const accessInfo = await performAccessCheck(firebaseUser.uid);
        
        if (accessInfo.hasAccess) {
          setUser(firebaseUser);
          setUserRole(accessInfo.role);
          setSubscriptionStatus(accessInfo.subscription);
          setHasCompletedConsultation(accessInfo.consultationCompleted);
        } else {
          // If access is denied for a currently signed-in user, sign them out.
          // This handles cases where permissions change while the user is logged in.
          if (authInstance.currentUser) {
            await signOut(authInstance);
          }
          setUser(null);
          setUserRole(null);
          setSubscriptionStatus('inactive');
          setHasCompletedConsultation(false);
        }

      } else {
        setUser(null);
        setHasCompletedConsultation(null);
        setSubscriptionStatus('inactive');
        setUserRole(null);
      }
      setLoading(false);
      setCheckingConsultationStatus(false);
      setCheckingSubscriptionStatus(false);
    });

    return () => unsubscribe();
  }, [authInstance]);

  const setAuthConsultationCompleted = useCallback(async (status: boolean) => {
    if (!user || !user.uid || !db) return;
    try {
      const consultationDocRef = doc(db, "consultationsMetadata", user.uid);
      await setDoc(consultationDocRef, { completed: status, completedAt: serverTimestamp() }, { merge: true });
      setHasCompletedConsultation(status);
    } catch (error) {
      toast({ title: "Erro ao atualizar dados", variant: "destructive" });
    }
  }, [user, toast]);

  const signIn = useCallback(async (email: string, pass: string) => {
    if (!authInstance) throw new Error("Firebase Auth não inicializado.");

    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, pass);
      const authenticatedUser = userCredential.user;

      if (authenticatedUser) {
        const { hasAccess, role, subscription } = await performAccessCheck(authenticatedUser.uid);
        
        if (hasAccess) {
          toast({ title: "Login bem-sucedido!", description: "Bem-vindo(a) de volta!" });
          router.push('/recursos');
        } else {
          await signOut(authInstance);
          console.error(`[Auth] Acesso Negado no Login para UID: ${authenticatedUser.uid}. Papel: '${role}', Assinatura: '${subscription}'.`);
          toast({ 
            title: "Acesso Negado", 
            description: "Sua conta não tem permissão para acessar. Verifique sua assinatura ou entre em contato com o suporte.", 
            variant: "destructive",
            duration: 7000
          });
        }
      }
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        toast({ title: "Credenciais Inválidas", description: "Email ou senha incorretos.", variant: "destructive" });
      } else {
        toast({ title: "Erro no Login", description: error.message || "Ocorreu um erro desconhecido.", variant: "destructive" });
      }
    }
  }, [authInstance, router, toast]);

  const logout = useCallback(async () => {
    if (!authInstance) return;
    try {
      await signOut(authInstance);
      toast({ title: "Logout realizado" });
      router.push('/login');
    } catch (error: any) {
      toast({ title: "Erro no Logout", description: error.message, variant: "destructive" });
    }
  }, [authInstance, router, toast]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!authInstance?.currentUser) {
      toast({ title: "Erro", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    try {
      await updateProfile(authInstance.currentUser, { displayName: newName });
      setUser({ ...authInstance.currentUser }); // Refresh user state
      toast({ title: "Sucesso!", description: "Seu nome foi atualizado." });
    } catch (error: any) {
      toast({ title: "Erro ao atualizar nome", description: error.message, variant: "destructive" });
    }
  }, [authInstance, toast]);

  const value = {
    user,
    loading,
    signIn,
    logout,
    updateUserDisplayName, 
    hasCompletedConsultation,
    checkingConsultationStatus,
    setAuthConsultationCompleted,
    firebaseAuth: authInstance,
    subscriptionStatus,
    checkingSubscriptionStatus,
    userRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
