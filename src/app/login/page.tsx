
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getFirebaseInstances } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/components/auth/auth-provider';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { auth: firebaseAuth } = getFirebaseInstances();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.replace('/'); // Redireciona se o usuário já estiver logado
    }
  }, [user, isAuthLoading, router]);

  const onSubmit = async (data: LoginFormValues) => {
    if (!firebaseAuth) {
      toast({
        title: 'Erro de Configuração',
        description: 'O sistema de autenticação não está pronto. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(firebaseAuth, data.email, data.password);
      toast({
        title: 'Login Bem-Sucedido!',
        description: 'Redirecionando...',
      });
      router.push('/'); // Redireciona para a página inicial ou desejada após o login
    } catch (error: any) {
      console.error('Erro de login:', error);
      let errorMessage = 'Falha no login. Verifique suas credenciais.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = 'Email ou senha inválidos.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'O formato do email é inválido.';
      }
      toast({
        title: 'Erro de Login',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || (!isAuthLoading && user)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-2">Carregando...</p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-primary">Maestro Operacional</CardTitle>
        <CardDescription>Acesse o Maestro Operacional.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input id="email" type="email" placeholder="seu@email.com" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input id="password" type="password" placeholder="Sua senha" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Não tem uma conta?{' '}
          <Link href="#" className="font-medium text-primary hover:underline">
            Registre-se
          </Link>
          {' (Funcionalidade de registro a ser implementada)'}
        </p>
         <p className="mt-2 text-center text-sm text-muted-foreground">
          <Link href="#" className="font-medium text-primary hover:underline">
            Esqueceu sua senha?
          </Link>
           {' (Funcionalidade a ser implementada)'}
        </p>
      </CardContent>
    </Card>
  );
}
