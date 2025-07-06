"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronLeft,
  History,
  FileText,
  CalendarDays,
  Inbox,
  AlertTriangle,
} from "lucide-react";
import {
  ConsultationHistoryItemSchema,
  type ConsultationHistoryItem,
} from "@/schemas/consultationSchema";
import { ZodError } from "zod";
import type { FinalDiagnosisPart } from "@/types";

export default function ConsultationsHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [consultations, setConsultations] = useState<ConsultationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    const fetchConsultations = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const timestamp = Timestamp.fromDate(thirtyDaysAgo);

        const q = query(
 collection(db!, "consultations"),
          where("userId", "==", user.uid),
          where("consultationCompletedAt", ">=", timestamp),
          orderBy("consultationCompletedAt", "desc")
        );

        const snapshot = await getDocs(q);
        const results: ConsultationHistoryItem[] = [];

        snapshot.forEach((doc: QueryDocumentSnapshot<DocumentData>) => {
          const raw = doc.data();
          const parsed = ConsultationHistoryItemSchema.safeParse({
            id: doc.id,
            consultationCompletedAt: raw.consultationCompletedAt,
            finalDiagnosisParts: raw.finalDiagnosisParts || [],
          });

          if (parsed.success) {
            results.push(parsed.data);
          } else {
            console.warn(`Validação falhou para doc ${doc.id}:`, parsed.error.flatten());
          }
        });

        setConsultations(results);
      } catch (e: any) {
        console.error("Erro ao buscar histórico:", e);
        let msg = "Falha ao carregar o histórico.";

        if (e instanceof ZodError) {
          msg = `Dados inválidos: ${e.flatten().formErrors.join(", ")}`;
        } else if (e?.message) {
          msg += ` Detalhes: ${e.message}`;
        }

        if (e.code === "failed-precondition" && e.message?.includes("index")) {
          msg += " Verifique se há índices pendentes no Firestore.";
        }

        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultations();
  }, [user, authLoading]);

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "Data desconhecida";
    return timestamp.toDate().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || (isLoading && user && !error)) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center pt-16 pb-24 px-4 bg-gradient-to-b from-background to-secondary/10">
        <div className="w-full max-w-4xl">
          <Skeleton className="h-9 w-48 mb-6" />
          <Card className="shadow-xl">
            <CardHeader className="items-center text-center border-b pb-4">
              <Skeleton className="h-12 w-12 rounded-full mb-3" />
              <Skeleton className="h-8 w-64 mb-2" />
              <Skeleton className="h-5 w-80" />
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {[1, 2, 3].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center pt-16 pb-24 px-4 text-center bg-gradient-to-b from-background to-secondary/10">
        <Card className="w-full max-w-md shadow-lg p-8">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-destructive mb-2">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground mb-6">
            Você precisa estar logado para ver seu histórico de consultas.
          </CardDescription>
          <Button asChild size="lg">
            <Link href="/login?redirect=/consultations-history">Fazer Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center pt-16 pb-24 px-4 bg-gradient-to-b from-background to-secondary/10">
      <div className="w-full max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para o Dashboard
            </Link>
          </Button>
        </div>
        <Card className="shadow-xl">
          <CardHeader className="items-center text-center border-b pb-6">
            <History className="h-12 w-12 text-primary mb-3" />
            <CardTitle className="text-3xl font-bold text-primary">
              Histórico de Consultas
            </CardTitle>
            <CardDescription className="text-md text-muted-foreground mt-1">
              Diagnósticos dos últimos 30 dias.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Erro ao Carregar Histórico</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && consultations.length === 0 && (
              <div className="text-center py-10">
                <Inbox className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-xl text-muted-foreground font-semibold">
                  Nenhuma consulta encontrada.
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Você ainda não realizou diagnósticos nos últimos 30 dias ou eles não puderam ser carregados.
                </p>
                <Button asChild className="mt-6">
                  <Link href="/consultation">Iniciar Novo Diagnóstico</Link>
                </Button>
              </div>
            )}
            {!isLoading && !error && consultations.length > 0 && (
              <Accordion type="single" collapsible className="w-full space-y-4">
                {consultations.map((consultation, index) => (
                  <AccordionItem key={consultation.id} value={`item-${index}`} className="border bg-card shadow-sm rounded-lg">
                    <AccordionTrigger className="p-4 hover:no-underline">
                      <div className="flex items-center gap-3 w-full">
                        <CalendarDays className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-md text-primary">
                          Diagnóstico de {formatDate(consultation.consultationCompletedAt)}
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 border-t">
                      {consultation.finalDiagnosisParts.length > 0 ? (
                        consultation.finalDiagnosisParts.map((part: FinalDiagnosisPart, partIndex: number) => (
                          <div key={part.partId || `part-${partIndex}`} className="mb-4 p-3 border rounded-md bg-background last:mb-0">
                            <h4 className="font-semibold text-primary mb-1 flex items-center">
                              <FileText size={18} className="mr-2 text-primary/80" />
                              {part.title}
                            </h4>
                            <p className="text-sm text-foreground whitespace-pre-wrap">{part.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma parte do diagnóstico disponível para esta consulta.
                        </p>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
