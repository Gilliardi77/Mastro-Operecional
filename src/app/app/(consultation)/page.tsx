"use client";

import Link from "next/link";
import React from "react";
import Image from "next/image";
import {
  LogIn,
  UserPlus,
  UserCircle,
  LogOut,
  LayoutDashboard,
  MessageSquareText,
  HelpCircle,
  Settings
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle"; // Caminho correto e único
import { useAuth } from "@/hooks/useAuth"; // Importação correta do hook de autenticação

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md md:px-6">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="https://placehold.co/160x40.png"
          alt="Gestor Maestro Logo"
          width={160}
          height={40}
          priority
          data-ai-hint="gestor maestro logo"
        />
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        {loading ? (
          <Button variant="ghost" size="icon" disabled>
            <UserCircle className="h-5 w-5 animate-pulse" />
          </Button>
        ) : user ? (
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
                <a href="mailto:feedback@gestormaestro.app?subject=Feedback sobre o Gestor Maestro">
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
                // onClick={handleSignOut} // Lógica de SignOut a ser implementada
                className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:text-red-400 dark:focus:text-red-500 dark:focus:bg-red-900/30"
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
