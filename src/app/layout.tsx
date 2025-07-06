
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/contexts/AppProviders';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Gestor Maestro',
  description: 'Soluções inteligentes para gestão de negócios: Diagnóstico, Operacional e Financeiro.',
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
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Gestor Maestro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gestor Maestro" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#FA711D" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#FA711D" />
      </head>
      <body className="font-body antialiased flex flex-col min-h-screen bg-background">
        <AppProviders>
          <Header />
          <div className="flex-1 overflow-y-auto pt-20 pb-16 print:hidden">
            <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
          <Footer />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
