
"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogIn, UserCircle, LogOut, LayoutDashboard, MessageSquareText, HelpCircle,
  Settings, Loader2, ArrowLeftCircle, Briefcase, TrendingUp, History, Wand2
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger, DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./ThemeToggle";

export default function Header() {
  const { user, isAuthenticating, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await logout();
      toast({
        title: "Logout Realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error("Falha no logout pelo header:", error);
      toast({
        title: "Erro no Logout",
        description: "Não foi possível realizar o logout.",
        variant: "destructive",
      });
    }
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 2) {
       router.back();
    } else {
       router.push('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b border-primary-foreground/30 bg-primary text-primary-foreground px-4 shadow-sm md:px-6 print:hidden">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={handleGoBack} aria-label="Voltar">
          <ArrowLeftCircle className="h-5 w-5" />
        </Button>

        <Link href="/" className="flex items-center gap-2" aria-label="Página Inicial do Gestor Maestro">
          <Image
            src="/images/novalogo120x120.png"
            alt="Gestor Maestro Logo"
            width={36}
            height={36}
            className="object-contain filter brightness-0 invert"
          />
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
          <Link href="/operacional">
            <Briefcase className="mr-1 h-4 w-4" /> Operacional
          </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/financeiro">
                <TrendingUp className="mr-1 h-4 w-4" /> Financeiro
            </Link>
        </Button>
        <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/consultor">
                <Wand2 className="mr-1 h-4 w-4" /> Consultor IA
            </Link>
        </Button>
        
        <ThemeToggle />

        {isAuthenticating ? (
          <Button variant="ghost" size="icon" disabled>
            <Loader2 className="h-5 w-5 animate-spin" />
          </Button>
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Menu do Usuário">
                <UserCircle className="h-5 w-5" />
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
              <DropdownMenuItem asChild>
                <Link href="/">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Painel Principal</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="sm:hidden">
                <Link href="/operacional">
                    <Briefcase className="mr-2 h-4 w-4" /> Operacional
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="sm:hidden">
                <Link href="/financeiro">
                    <TrendingUp className="mr-2 h-4 w-4" /> Financeiro
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="sm:hidden">
                <Link href="/consultor">
                    <Wand2 className="mr-2 h-4 w-4" /> Consultor IA
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="sm:hidden" />
              <DropdownMenuItem asChild>
                <a href="mailto:feedback@gestormaestro.app?subject=Feedback sobre o Gestor Maestro" target="_blank" rel="noopener noreferrer">
                  <MessageSquareText className="mr-2 h-4 w-4" />
                  <span>Enviar Feedback</span>
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Ajuda</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-500 dark:focus:bg-red-900/30 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="mr-1.5 h-4 w-4" /> Entrar
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
