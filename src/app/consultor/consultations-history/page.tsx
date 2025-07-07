'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ConsultationsHistoryPage() {
    return (
        <div className="space-y-8">
            <section>
                <h1 className="text-3xl font-bold">Histórico de Consultas</h1>
                <p className="text-muted-foreground">Página em construção.</p>
            </section>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History /> Histórico</CardTitle>
                    <CardDescription>Aqui você poderá ver seus diagnósticos e planejamentos salvos.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-48">
                    <Alert>
                        <History className="h-4 w-4" />
                        <AlertTitle>Em Breve!</AlertTitle>
                        <AlertDescription>
                           Seu histórico de consultas aparecerá aqui assim que a funcionalidade estiver disponível.
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
