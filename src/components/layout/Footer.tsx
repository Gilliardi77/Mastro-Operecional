export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 h-12 bg-muted text-muted-foreground shadow-md">
      <div className="container mx-auto flex h-full items-center justify-center px-4 sm:px-6 lg:px-8">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} Business Maestro. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
