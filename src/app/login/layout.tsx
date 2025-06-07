
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Maestro Operacional',
  description: 'Acesse sua conta Maestro Operacional.',
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
