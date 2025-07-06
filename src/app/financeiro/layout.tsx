
import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/auth-context';
import { AIGuideProvider } from '@/contexts/AIGuideContext';
import ContextualAIGuide from '@/components/ai/ContextualAIGuide';
import { ThemeProvider } from "next-themes";


export const metadata: Metadata = {
  title: 'Visão Clara Financeira',
  description: 'Sua plataforma inteligente para gestão financeira e previsões.',
  // manifest: '/manifest.json', // Removido para evitar erro de CORS em Cloud Workstations
  icons: {
    icon: [
      { url: '/192.png', type: 'image/png', sizes: '192x192' },
      { url: '/512.png', type: 'image/png', sizes: '512x512' },
      // Adicione um favicon.ico se tiver um na pasta public, ex:
      // { url: '/favicon.ico', type: 'image/x-icon', sizes: 'any' }
    ],
    apple: '/180.png', // Para apple-touch-icon
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
          <AuthProvider>
            <AIGuideProvider>
              <Header />
              <main className="flex-grow container mx-auto px-4 py-8 mt-16"> {/* Added mt-16 for fixed header */}
                {children}
              </main>
              <Footer />
              <Toaster />
              <ContextualAIGuide />
            </AIGuideProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
