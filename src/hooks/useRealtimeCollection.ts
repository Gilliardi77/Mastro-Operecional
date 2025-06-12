// hooks/useRealtimeCollection.ts
import { useEffect, useState, useCallback } from "react";
import { db } from "@/lib/firebase"; // Caminho ajustado para o padrão do projeto
import { collection, query, where, onSnapshot, orderBy, type QueryOrderByConstraint, type QueryConstraint } from "firebase/firestore";

interface UseRealtimeCollectionOptions {
  orderByField?: string;
  orderByDirection?: "asc" | "desc";
}

export function useRealtimeCollection<T = any>(
  nomeColecao: string,
  userId: string | null, // Permite userId nulo para cenários onde não é necessário
  options?: UseRealtimeCollectionOptions
) {
  const [dados, setDados] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<Error | null>(null);

  const fetchData = useCallback(() => {
    if (!userId && nomeColecao !== "publicContent") { // Exemplo de exceção para coleção pública
      setDados([]);
      setCarregando(false);
      // Poderia definir um erro específico ou apenas não buscar
      // setErro(new Error("UserId é necessário para esta coleção."));
      return () => {}; // Retorna uma função vazia para o cleanup do useEffect
    }

    setCarregando(true);
    
    const queryConstraints: QueryConstraint[] = [];
    if (userId) { // Aplicar filtro de userId apenas se fornecido
        queryConstraints.push(where("userId", "==", userId));
    }

    if (options?.orderByField) {
      queryConstraints.push(orderBy(options.orderByField, options.orderByDirection || "asc"));
    }
    
    const q = query(collection(db, nomeColecao), ...queryConstraints);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDados(
          snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as T))
        );
        setCarregando(false);
        setErro(null);
      },
      (err) => {
        console.error(`Erro ao ler coleção "${nomeColecao}":`, err);
        setErro(err as Error);
        setCarregando(false);
      }
    );
    return unsubscribe; // Retorna a função de unsubscribe para o cleanup
  }, [nomeColecao, userId, options?.orderByField, options?.orderByDirection]);

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [fetchData]);

  return { dados, carregando, erro };
}
