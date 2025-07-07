
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// This page has been moved to /app/operacional/balcao/page.tsx
export default function MovedPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/operacional/balcao');
  }, [router]);

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Página Movida</CardTitle>
          <CardDescription>Você será redirecionado em breve.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    </div>
  );
}
