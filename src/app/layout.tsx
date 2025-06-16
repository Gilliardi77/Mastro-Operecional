
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/components/auth/auth-provider';
import { AIGuideProvider } from '@/contexts/AIGuideContext';
import ContextualAIGuide from '@/components/ai/ContextualAIGuide';

export const metadata: Metadata = {
  title: 'Maestro Operacional',
  description: 'Gerado pelo Firebase Studio para Maestro Operacional',
  icons: {
    icon: [
      { url: '/logos/192.png', type: 'image/png', sizes: '192x192' }, // Favicon PNG principal
      { url: '/logos/512.png', type: 'image/png', sizes: '512x512' }  // Favicon PNG maior
      // Você pode adicionar um /favicon.ico aqui se tiver um, ou um SVG
      // { url: '/favicon.ico', sizes: 'any', rel: 'icon' },
    ],
    apple: [
      { url: '/logos/180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <AuthProvider>
          <AIGuideProvider>
            <Header />
            <div className="flex-1 overflow-y-auto pt-20 pb-16">
              <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
                {children}
              </main>
            </div>
            <Footer />
            <Toaster />
            <ContextualAIGuide />
          </AIGuideProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
