'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ModuleAccessGuardProps {
  children: React.ReactNode;
  moduleName: 'operacional' | 'financeiro' | 'consultor';
}

export default function ModuleAccessGuard({ children, moduleName }: ModuleAccessGuardProps) {
  const { user, isAuthenticating, subscriptionStatus } = useAuth();

  if (isAuthenticating || subscriptionStatus === 'loading') {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verificando permissões...</p>
      </div>
    );
  }

  const hasAccess = user?.accessibleModules?.includes(moduleName);

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center p-4">
        <Card className="w-full max-w-lg text-center shadow-lg border-destructive">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="mt-4 text-2xl text-destructive">Acesso Negado</CardTitle>
            <CardDescription className="text-md">
              Você não tem permissão para acessar o módulo '{moduleName}'.
              Fale com o administrador do sistema para solicitar acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Voltar ao Painel Principal</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
