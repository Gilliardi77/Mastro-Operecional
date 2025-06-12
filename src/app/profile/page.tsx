
"use client";

import React from "react";
import { useAuth } from '@/components/auth/auth-provider';
import { useRouter } from "next/navigation";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Avatar, AvatarFallback, AvatarImage
} from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LogOut, UserCircle, Edit3, ShieldCheck,
  Bell, Building, Briefcase, Phone, Mail
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { User as FirebaseUser } from "firebase/auth";
import { getFirebaseInstances, signOut as firebaseSignOutUtil } from "@/lib/firebase";

interface ProfileInfoRowProps {
  icon: React.ElementType;
  label: string;
  value?: string | null;
  action?: React.ReactNode;
  valueClassName?: string;
}

const ProfileInfoRow: React.FC<ProfileInfoRowProps> = ({ icon: Icon, label, value, action, valueClassName }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex items-center">
      <Icon className="mr-3 h-5 w-5 text-muted-foreground" />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </div>
    <div className="flex items-center">
      <span className={`text-sm text-muted-foreground mr-2 ${valueClassName || ""}`}>{value || "Não informado"}</span>
      {action}
    </div>
  </div>
);

export default function ProfilePage() {
  const { user, isLoading: authLoading, isAuthenticating } = useAuth(); // isAuthenticating is true during initial auth check
  const router = useRouter();
  const { toast } = useToast();
  const { auth: firebaseAuthInstance } = getFirebaseInstances();
  
  const firebaseUser = user as FirebaseUser | null; // User from useAuth is already FirebaseUser or null

  React.useEffect(() => {
    // Use isAuthenticating to wait for the initial auth check to complete
    if (!isAuthenticating && !firebaseUser) {
      router.push("/login?redirect=/profile");
    }
  }, [firebaseUser, isAuthenticating, router]);

  const handleSignOut = async () => {
    if (!firebaseAuthInstance) {
      toast({
        title: "Erro de Configuração",
        description: "Sistema de autenticação não está pronto.",
        variant: "destructive",
      });
      return;
    }
    try {
      await firebaseSignOutUtil(firebaseAuthInstance);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
      // router.push('/login'); // Redirect after logout
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro no Logout",
        description: "Não foi possível realizar o logout.",
        variant: "destructive"
      });
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 0 || parts[0] === "") return "U";
    return parts.length > 1 && parts[parts.length -1].length > 0 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
      : parts[0][0].toUpperCase();
  };

  // Use isAuthenticating for the skeleton loader, as it indicates the initial auth check
  if (isAuthenticating || !firebaseUser) {
    return (
      <div className="container mx-auto py-10 px-4 md:px-6 max-w-3xl">
        <Card className="shadow-lg">
          <CardHeader className="items-center text-center">
            <Skeleton className="h-24 w-24 rounded-full mb-4" />
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-6 w-64" />
          </CardHeader>
          <CardContent className="space-y-6">
            {[1, 2].map((i) => (
              <React.Fragment key={i}>
                <Skeleton className="h-6 w-1/3 mb-3" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
                {i === 1 && <Separator className="my-6" />}
              </React.Fragment>
            ))}
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-background to-secondary/10 flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-3xl space-y-8">
        <Card className="shadow-xl w-full">
          <CardHeader>
            <div className="flex items-center space-x-4 mb-4">
              <Avatar className="h-20 w-20 border-2 border-primary shadow-md">
                <AvatarImage
                  src={firebaseUser.photoURL || `https://placehold.co/120x120.png`}
                  alt={firebaseUser.displayName || "User Avatar"}
                  data-ai-hint="profile avatar"
                />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary font-semibold">
                  {getInitials(firebaseUser.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl font-bold text-primary">
                  {firebaseUser.displayName || "Usuário Mestre"}
                </CardTitle>
                <CardDescription className="text-md text-muted-foreground">
                  Gerencie suas informações pessoais e da sua empresa.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <ProfileInfoRow icon={UserCircle} label="Nome Completo" value={firebaseUser.displayName} />
            <ProfileInfoRow icon={Mail} label="Email" value={firebaseUser.email} valueClassName="lowercase" />
            <ProfileInfoRow icon={Phone} label="Telefone" value={firebaseUser.phoneNumber} />
            <ProfileInfoRow icon={ShieldCheck} label="Senha" value="••••••••" />
            <ProfileInfoRow icon={Bell} label="Notificações" value="Ativadas" />
          </CardContent>
          <CardFooter className="pt-6">
            <Button variant="outline" className="w-full" disabled>
              <Edit3 className="mr-2 h-4 w-4" /> Editar Informações Pessoais
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl w-full">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Building className="h-7 w-7 text-primary" />
              <CardTitle className="text-xl font-bold text-primary">
                Informações da Empresa
              </CardTitle>
            </div>
            <CardDescription>
              Dados do seu negócio. Mantenha-os atualizados para melhores insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <ProfileInfoRow icon={Briefcase} label="Nome da Empresa" value="Maestro Corp Ltda." />
            <ProfileInfoRow icon={UserCircle} label="CNPJ" value="12.345.678/0001-99" />
            <ProfileInfoRow icon={Building} label="Tipo de Negócio" value="Consultoria e Serviços" />
            <ProfileInfoRow icon={Phone} label="Telefone Comercial" value="(11) 3344-5566" />
            <ProfileInfoRow icon={Mail} label="Email Comercial" value="contato@maestrocorp.com.br" />
          </CardContent>
          <CardFooter className="pt-6">
            <Button variant="outline" className="w-full" disabled>
              <Edit3 className="mr-2 h-4 w-4" /> Gerenciar Dados da Empresa
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl w-full">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-destructive">Sair da Conta</CardTitle>
            <CardDescription>Desconectar sua sessão atual do Maestro Operacional.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="destructive" className="w-full" size="lg" disabled={isAuthenticating}>
              <LogOut className="mr-2 h-5 w-5" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
