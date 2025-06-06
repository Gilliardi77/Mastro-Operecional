import { Briefcase } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          <h1 className="font-headline text-xl font-semibold sm:text-2xl">
            Business Maestro Module Extension
          </h1>
        </Link>
        {/* Navigation items can be added here */}
      </div>
    </header>
  );
}
