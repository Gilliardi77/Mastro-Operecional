
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ClientThemeProvider } from '@/components/layout/ClientThemeProvider';

export const metadata: Metadata = {
  title: 'Gestor Maestro',
  description: 'Soluções inteligentes para gestão de negócios: Diagnóstico, Operacional e Financeiro.',
  manifest: '/manifest.json', // Adicionado para PWA
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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Gestor Maestro" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Gestor Maestro" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#064651" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#064651" />
        {/* Fim PWA Meta Tags */}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col">
        <ClientThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <Header />
            <div className="flex-grow">{children}</div>
            <Footer />
            <Toaster />
          </AuthProvider>
        </ClientThemeProvider>
      </body>
    </html>
  );
}
