
import { Briefcase, LayoutDashboard, AppWindow } from 'lucide-react'; // Adicionado AppWindow
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto flex h-full items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          <h1 className="font-headline text-xl font-semibold sm:text-2xl">
            Maestro Operacional
          </h1>
        </Link>
        <nav>
          <ul className="flex items-center gap-2">
            <li>
              <Button variant="ghost" asChild>
                <Link href="/" className="flex items-center gap-1">
                  <LayoutDashboard className="h-5 w-5" />
                  Início
                </Link>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <Link href="/produtos-servicos" className="flex items-center gap-1">
                  <Briefcase className="h-5 w-5" /> 
                  Operacional
                </Link>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <a 
                  href="https://studio--viso-clara-financeira.us-central1.hosted.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <AppWindow className="h-5 w-5" />
                  Visão Fin.
                </a>
              </Button>
            </li>
            <li>
              <Button variant="ghost" asChild>
                <a 
                  href="https://studio--gestor-maestro.us-central1.hosted.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <AppWindow className="h-5 w-5" />
                  Gestor M.
                </a>
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
