
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Manter para uso direto
import Link from "next/link";
import { UserPlus, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

const RegisterFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Por favor, insira um email válido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"], // Path to show error on confirmPassword field
});

type RegisterFormValues = z.infer<typeof RegisterFormSchema>;

export default function RegisterPage() {
  const { signUp, loading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: RegisterFormValues) {
    setIsSubmitting(true);
    try {
      await signUp(data.name, data.email, data.password);
      // O redirecionamento é tratado dentro da função signUp do AuthContext
    } catch (error) {
      // O tratamento de erro (toast) é feito dentro da função signUp do AuthContext
      console.error("Falha no registro pela página:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center bg-gradient-to-b from-background to-secondary/30 pt-16 pb-24 px-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">Criar Conta</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            Junte-se ao Gestor Maestro e impulsione seu negócio.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Seu nome completo" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      <Input type="password" placeholder="Crie uma senha (mín. 6 caracteres)" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirme sua senha" {...field} disabled={isLoading} />
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
                  <UserPlus className="mr-2 h-5 w-5" />
                )}
                Registrar-se
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Já tem uma conta?{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
