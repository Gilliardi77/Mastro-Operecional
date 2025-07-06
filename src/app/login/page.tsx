
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Manter para uso direto, se necessário
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const LoginFormSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(1, { message: "A senha não pode estar vazia." }),
});

type LoginFormValues = z.infer<typeof LoginFormSchema>;

export default function LoginPage() {
  const { signIn, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      // O redirecionamento é tratado dentro da função signIn do AuthContext
    } catch (error) {
      // O tratamento de erro (toast) é feito dentro da função signIn do AuthContext
      console.error("Falha no login pela página:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/30 pt-16 pb-24 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Entrar</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Acesse sua conta Gestor Maestro.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Sua senha" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <LogIn className="mr-2 h-5 w-5" />
                )}
                Entrar
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Não tem uma conta?{" "}
                <Link href="/register" className="font-semibold text-primary hover:underline">
                  Registre-se
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
