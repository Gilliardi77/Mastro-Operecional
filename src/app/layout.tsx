
import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Toaster } from "@/components/ui/toaster";
import ContextualAIGuide from '@/components/ai/ContextualAIGuide';
import { AppProviders } from '@/contexts/AppProviders';

export const metadata: Metadata = {
  title: 'Maestro Operacional',
  description: 'Gerado pelo Firebase Studio para Maestro Operacional',
  icons: {
    icon: '/images/novalogo120x120.png',
    shortcut: '/images/novalogo120x120.png',
    apple: '/images/novalogo120x120.png',
  },
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
        <AppProviders>
          <Header />
          <div className="flex-1 overflow-y-auto pt-20 pb-16 print:hidden">
            <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
              {children}
            </main>
          </div>
          <Footer />
          <Toaster />
          <ContextualAIGuide />
        </AppProviders>
      </body>
    </html>
  );
}
