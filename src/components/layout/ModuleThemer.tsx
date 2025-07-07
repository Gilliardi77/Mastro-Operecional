
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ModuleThemer() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    body.classList.remove('theme-operacional', 'theme-financeiro', 'theme-consultor');

    if (pathname.startsWith('/financeiro')) {
      body.classList.add('theme-financeiro');
    } else if (pathname.startsWith('/consultor')) {
      body.classList.add('theme-consultor');
    } else {
      // O tema 'operacional' é o padrão (root), então não precisa de classe,
      // a menos que queiramos ser explícitos.
      // body.classList.add('theme-operacional'); 
    }
  }, [pathname]);

  return null; // Este componente não renderiza nada visível
}
