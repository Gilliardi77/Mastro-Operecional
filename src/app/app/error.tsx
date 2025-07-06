
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service in production
    console.error(error);

    // This error is common after a new deployment.
    // The browser might have a cached version of the app's assets.
    // A hard reload will fetch the latest assets from the server.
    if (error.name === 'ChunkLoadError') {
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-4 text-center text-foreground">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h2 className="text-3xl font-bold">Algo deu errado!</h2>
          <p className="max-w-md text-muted-foreground">
            Ocorreu um erro inesperado. Isso pode ser um problema temporário. Por favor, tente recarregar a página ou voltar mais tarde.
          </p>
          <Button onClick={() => reset()} size="lg">
            Tentar novamente
          </Button>
        </div>
      </body>
    </html>
  );
}
