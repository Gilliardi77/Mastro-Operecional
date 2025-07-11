
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CompanyInfoFormSchema, PersonalInfoFormSchema, defaultCompanyValues } from "./schemas";
import { fetchUserProfileServerAction, saveCompanyProfileServerAction, savePersonalDisplayNameServerAction } from "./actions";
import type { UserProfileUpsertData } from "@/schemas/userProfileSchema";
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Building, User, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type PersonalInfoFormValues = z.infer<typeof PersonalInfoFormSchema>;
type CompanyInfoFormValues = z.infer<typeof CompanyInfoFormSchema>;

export default function ProfilePage() {
  const { user, isAuthenticating, isSessionReady, logout } = useAuth();
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const { toast } = useToast();
  const [pageError, setPageError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const companyForm = useForm<CompanyInfoFormValues>({
    resolver: zodResolver(CompanyInfoFormSchema),
    defaultValues: defaultCompanyValues,
  });

  const personalForm = useForm<PersonalInfoFormValues>({
    resolver: zodResolver(PersonalInfoFormSchema),
    defaultValues: {
      displayName: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    if (!user || !isSessionReady) { // Gated by session readiness
      if (isMountedRef.current) setProfileLoading(false);
      return;
    }
    if (isMountedRef.current) {
        setProfileLoading(true);
        setPageError(null);
        setIsAuthError(false);
    }
    try {
      const profileData = await fetchUserProfileServerAction();
      if (isMountedRef.current) {
        if (profileData) {
          companyForm.reset(profileData);
        } else {
          companyForm.reset(defaultCompanyValues);
        }
        personalForm.reset({ displayName: user.displayName || "" });
      }
    } catch (err: any) {
      console.error("[ProfilePage] Erro ao buscar perfil:", err);
      const errorMessage = err.message || "Não foi possível carregar os dados do seu perfil.";
      if (isMountedRef.current) {
        if (
            errorMessage.includes("Sessão não encontrada") ||
            errorMessage.includes("Sua sessão expirou") ||
            errorMessage.includes("Sua sessão foi revogada")
        ) {
           setIsAuthError(true);
           setPageError("Sua sessão de autenticação parece estar inválida. Por favor, saia e entre novamente para continuar.");
        } else {
           setPageError(errorMessage);
        }
        
        toast({
          title: "Erro ao Carregar Perfil",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) setProfileLoading(false);
    }
  }, [user, isSessionReady, companyForm, personalForm, toast]);

  const onCompanySubmit = async (data: CompanyInfoFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    setIsSavingCompany(true);
    if (isMountedRef.current) setPageError(null);
    try {
      const dataToSave: UserProfileUpsertData = data;
      const result = await saveCompanyProfileServerAction(dataToSave);
      if (isMountedRef.current) {
        if (result.success) {
          toast({ title: "Sucesso", description: result.message || "Perfil da empresa atualizado." });
          fetchProfile(); 
        } else {
          throw new Error(result.message || "Falha ao salvar o perfil da empresa.");
        }
      }
    } catch (err: any) {
      console.error("[ProfilePage] Erro ao salvar perfil da empresa:", err);
      const errorMessage = err.message || "Ocorreu um erro inesperado ao salvar.";
      if (isMountedRef.current) {
        setPageError(errorMessage);
        toast({ title: "Erro ao Salvar", description: errorMessage, variant: "destructive" });
        if (errorMessage.includes("Sessão")) {
           setIsAuthError(true);
        }
      }
    } finally {
      if (isMountedRef.current) setIsSavingCompany(false);
    }
  };

  const onPersonalInfoSubmit = async (data: PersonalInfoFormValues) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Usuário não autenticado.", variant: "destructive" });
      return;
    }
    setIsSavingPersonal(true);
    if (isMountedRef.current) setPageError(null);
    try {
      const result = await savePersonalDisplayNameServerAction(data);
      if (isMountedRef.current) {
        if (result.success) {
          toast({ title: "Sucesso", description: result.message || "Nome de exibição atualizado." });
           if (user) {
             user.displayName = data.displayName;
          }
        } else {
          throw new Error(result.message || "Falha ao atualizar o nome de exibição.");
        }
      }
    } catch (err: any) {
      console.error("[ProfilePage] Erro ao salvar nome de exibição:", err);
      const errorMessage = err.message || "Ocorreu um erro inesperado ao salvar o nome.";
      if (isMountedRef.current) {
        setPageError(errorMessage);
        toast({ title: "Erro ao Salvar", description: errorMessage, variant: "destructive" });
        if (errorMessage.includes("Sessão")) {
           setIsAuthError(true);
        }
      }
    } finally {
      if (isMountedRef.current) setIsSavingPersonal(false);
    }
  };

  useEffect(() => {
    if (user && !isAuthenticating && isSessionReady) { // <-- Added isSessionReady check
      fetchProfile();
    } else if (!isAuthenticating && !user && isMountedRef.current) {
      setProfileLoading(false);
      companyForm.reset(defaultCompanyValues);
      personalForm.reset({ displayName: "" });
    }
  }, [user, isAuthenticating, isSessionReady, fetchProfile]);


  if (isAuthenticating && !user) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !isAuthenticating) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Acesso Negado</CardTitle>
            <CardDescription>Você precisa estar logado para ver seu perfil.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/login?redirect=/profile">Fazer Login</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const isLoadingContent = profileLoading && user;

  if (isAuthError) {
    return (
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4">
            <Card className="w-full max-w-lg text-center">
                 <CardHeader>
                    <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                    <CardTitle className="text-destructive">Erro de Sessão</CardTitle>
                    <CardDescription>{pageError || "Ocorreu um erro com sua autenticação."}</CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={() => logout(false)} className="w-full">
                        Sair e Tentar Novamente
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-background to-secondary/10 flex flex-col items-center pt-16 pb-24 px-4">
      <div className="w-full max-w-2xl space-y-8">

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <User className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl font-bold text-primary">Informações Pessoais</CardTitle>
            </div>
            <CardDescription>Seu nome de exibição no sistema.</CardDescription>
          </CardHeader>
          {isLoadingContent ? (
             <CardContent className="space-y-6 pt-6">
              <Skeleton className="h-10 w-full" />
            </CardContent>
          ) : (
            <Form {...personalForm}>
              <form onSubmit={personalForm.handleSubmit(onPersonalInfoSubmit)}>
                <CardContent className="space-y-6 pt-6">
                  <FormField
                    control={personalForm.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome de Exibição</FormLabel>
                        <FormControl>
                          <Input placeholder="Seu nome" {...field} disabled={isSavingPersonal || profileLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSavingPersonal || profileLoading} className="w-full sm:w-auto">
                    {isSavingPersonal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSavingPersonal ? "Salvando..." : "Salvar Nome"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Building className="h-7 w-7 text-primary" />
              <CardTitle className="text-2xl font-bold text-primary">Perfil da Empresa</CardTitle>
            </div>
            <CardDescription>Gerencie as informações do seu negócio.</CardDescription>
          </CardHeader>
          
          {pageError && !isLoadingContent && !isAuthError && ( 
            <CardContent>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{pageError}</AlertDescription>
              </Alert>
            </CardContent>
           )}

          {isLoadingContent ? (
            <CardContent className="space-y-6 pt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </CardContent>
          ) : (
            <Form {...companyForm}>
              <form onSubmit={companyForm.handleSubmit(onCompanySubmit)}>
                <CardContent className="space-y-6 pt-6">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: ACME Ltda" {...field} disabled={isSavingCompany || profileLoading} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="companyCnpj"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CNPJ</FormLabel>
                        <FormControl>
                          <Input placeholder="00.000.000/0000-00 (opcional)" {...field} disabled={isSavingCompany || profileLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Negócio/Segmento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Comércio, Serviços, Consultoria de TI" {...field} disabled={isSavingCompany || profileLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="companyPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="(XX) XXXXX-XXXX (opcional)" {...field} disabled={isSavingCompany || profileLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="companyEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email da Empresa</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="contato@suaempresa.com (opcional)" {...field} disabled={isSavingCompany || profileLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="personalPhoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone Pessoal/WhatsApp (Contato Principal)</FormLabel>
                        <FormControl>
                          <Input placeholder="(XX) XXXXX-XXXX (opcional)" {...field} disabled={isSavingCompany || profileLoading}/>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isSavingCompany || profileLoading} className="w-full sm:w-auto">
                    {isSavingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isSavingCompany ? "Salvando..." : "Salvar Informações da Empresa"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
        </Card>
      </div>
    </div>
  );
}
