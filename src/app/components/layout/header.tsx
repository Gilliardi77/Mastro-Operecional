
"use client";

import Link from "next/link";
import React, { useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  LogIn, UserPlus, UserCircle, LogOut, LayoutDashboard, MessageSquareText, HelpCircle,
  Settings, Loader2, ArrowLeftCircle, Wand2, Briefcase, GanttChartSquare
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { auth as firebaseAuthInstance } from '@/lib/firebase';


export function Header() {
  const { user, loading, logout: authLogout } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      if (authLogout) {
        await authLogout();
      } else {
        await firebaseAuthInstance.signOut();
      }
      router.push('/login');
    } catch (error) {
      console.error("Falha no logout pelo header:", error);
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined") router.back();
  };

  const renderAuthSection = () => {
    if (loading) {
      return (
        <Button variant="ghost" size="icon" disabled className="text-primary-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </Button>
      );
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Menu do Usuário" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground data-[state=open]:bg-primary-foreground/10">
              {user.photoURL ? (
                <Image src={user.photoURL} alt="Foto do usuário" width={24} height={24} className="rounded-full" />
              ) : (
                <UserCircle className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="truncate">
              {user.displayName || user.email || "Meu Perfil"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações do Perfil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="mailto:feedback@visaoclarinanceira.com?subject=Feedback sobre o Visão Clara Financeira">
                <MessageSquareText className="mr-2 h-4 w-4" />
                <span>Enviar Feedback</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Ajuda & Suporte</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
          <Link href="/login">
            <LogIn className="mr-1.5 h-4 w-4" /> Entrar
          </Link>
        </Button>
      </div>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-primary/20 bg-primary px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleGoBack} aria-label="Voltar" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <ArrowLeftCircle className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <a href="https://studio--maestro-operacional.us-central1.hosted.app">
            <Briefcase className="mr-1 h-4 w-4" /> Operacional
          </a>
        </Button>
         <Button variant="ghost" size="icon" asChild className="sm:hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <a href="https://studio--maestro-operacional.us-central1.hosted.app" aria-label="Operacional">
            <Briefcase className="h-4 w-4" />
          </a>
        </Button>

        <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <a href="https://studio--maestro-ia-veiy3.us-central1.hosted.app/">
            <Wand2 className="mr-1 h-4 w-4" /> Consultor
          </a>
        </Button>
        <Button variant="ghost" size="icon" asChild className="sm:hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
          <a href="https://studio--maestro-ia-veiy3.us-central1.hosted.app/" aria-label="Consultor">
            <Wand2 className="h-4 w-4" />
          </a>
        </Button>
        
        {!loading && user && (
          <>
            <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/">
                <LayoutDashboard className="mr-1 h-4 w-4" /> Painel
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="sm:hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/" aria-label="Painel de Controle">
                <LayoutDashboard className="h-5 w-5" />
              </Link>
            </Button>

            <Button variant="ghost" size="sm" asChild className="hidden sm:flex text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/recursos">
                <GanttChartSquare className="mr-1 h-4 w-4" /> Recursos
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild className="sm:hidden text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              <Link href="/recursos" aria-label="Central de Recursos">
                <GanttChartSquare className="h-5 w-5" />
              </Link>
            </Button>
          </>
        )}

        <ThemeToggle />
        {renderAuthSection()}
      </div>
    </header>
  );
}
