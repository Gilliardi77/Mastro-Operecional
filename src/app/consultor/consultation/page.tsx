'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wand2 } from 'lucide-react';

export default function ConsultationPage() {
    return (
        <div className="space-y-8">
            <section>
                <h1 className="text-3xl font-bold">Novo Diagnóstico</h1>
                <p className="text-muted-foreground">Página em construção.</p>
            </section>
            <Card>
                <CardHeader>
                    <CardTitle>Consultoria Interativa</CardTitle>
                    <CardDescription>Esta funcionalidade está sendo implementada e estará disponível em breve.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-48">
                     <Alert>
                        <Wand2 className="h-4 w-4" />
                        <AlertTitle>Em Breve!</AlertTitle>
                        <AlertDescription>
                            Estamos preparando uma experiência de diagnóstico interativo incrível para você. Volte em breve!
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        </div>
    );
}
