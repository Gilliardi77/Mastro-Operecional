
import type { Metadata } from 'next';

// This page has been moved to /app/operacional/balcao/layout.tsx
export const metadata: Metadata = {
  title: 'Página Movida',
  description: 'Esta página foi movida.',
};

export default function MovedLayout({ children }: { children: React.ReactNode; }) {
  return <>{children}</>;
}
