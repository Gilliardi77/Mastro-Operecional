
// hooks/useRealtimeCollection.ts
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase"; // Caminho ajustado para o projeto
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";

// Interface para os dados retornados, assumindo um 'id' e outros campos dinâmicos
export interface RealtimeData {
  id: string;
  [key: string]: any; // Permite quaisquer outros campos
}

export function useRealtimeCollection(nomeColecao: string, userId?: string) {
  const [dados, setDados] = useState<RealtimeData[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setCarregando(false);
      // Opcional: setDados([]) ou manter dados antigos se preferir
      return;
    }

    setCarregando(true);
    setErro(null);

    const q = query(collection(db, nomeColecao), where("userId", "==", userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDados(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RealtimeData)));
        setCarregando(false);
      },
      (err) => {
        console.error(`Erro ao ler coleção "${nomeColecao}":`, err);
        setErro(err as Error);
        setCarregando(false);
      }
    );
    return () => unsubscribe(); // Limpa ao desmontar o componente ou quando as dependências mudam
  }, [nomeColecao, userId]);

  return { dados, carregando, erro };
}
