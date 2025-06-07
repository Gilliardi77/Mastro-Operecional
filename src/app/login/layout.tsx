
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Business Maestro',
  description: 'Acesse sua conta Business Maestro.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {children}
    </div>
  );
}
