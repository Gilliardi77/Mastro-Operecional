export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-card border-t border-border py-6 text-center">
      <div className="container mx-auto px-4">
        <p className="text-sm text-muted-foreground">
          &copy; {currentYear} Visão Clara Financeira. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
