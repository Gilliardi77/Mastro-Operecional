"use client";

import Link from "next/link";
import React from "react";
import { LogIn, UserPlus, UserCircle, LogOut, LayoutDashboard, MessageSquareText, HelpCircle, Settings, Loader2, ChevronLeft, Server, LineChart } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/hooks/useAuth"; 
import { useRouter, usePathname } from "next/navigation";

export function Header() {
  const { user, loading, logout } = useAuth(); 
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Falha no logout pelo header:", error);
    }
  };

  const showBackButton = pathname !== '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-sand px-4 shadow-sm md:px-6">
      <div className="flex items-center gap-2">
        {showBackButton && (
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary hover:text-primary/90 transition-colors">Gestor Maestro</span>
        </Link>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {loading ? (
          <Button variant="ghost" size="icon" disabled>
            <Loader2 className="h-5 w-5 animate-spin" />
          </Button>
        ) : user ? (
          <>
            <div className="hidden md:flex items-center gap-2">
                <Button variant="outline" size="sm" asChild>
                <a href="https://studio--maestro-operacional.us-central1.hosted.app" target="_blank" rel="noopener noreferrer">
                    <Server className="mr-1.5 h-4 w-4" /> Operacional
                </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                <a href="https://studio--financeflow-ywslc.us-central1.hosted.app" target="_blank" rel="noopener noreferrer">
                    <LineChart className="mr-1.5 h-4 w-4" /> Financeiro
                </a>
                </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Menu do Usuário">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
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
                  <Link href="/dashboard">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Meu Painel</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href={`mailto:feedback@gestormaestro.app?subject=Feedback sobre o Gestor Maestro`}>
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
                  className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-500 dark:focus:bg-red-900/30"
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">
                <LogIn className="mr-1.5 h-4 w-4" /> Entrar
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register"> 
                <UserPlus className="mr-1.5 h-4 w-4" /> Registrar-se
              </Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
