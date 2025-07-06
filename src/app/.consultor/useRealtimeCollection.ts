
// hooks/useRealtimeCollection.ts
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase"; // Ajustado o caminho para o firebase config
import { collection, query, where, onSnapshot, DocumentData, FirestoreError } from "firebase/firestore";

export function useRealtimeCollection(nomeColecao: string, userId: string | undefined) {
  const [dados, setDados] = useState<any[]>([]); // Manter any[] por enquanto para flexibilidade com diferentes estruturas de doc
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!userId) {
      // Se não houver userId, não faz sentido consultar.
      // Poderia setar dados vazios e carregando para false, ou manter carregando para indicar espera.
      // Por enquanto, vamos apenas retornar para evitar a query.
      setDados([]);
      setCarregando(false);
      return;
    }
    if (!db) {
      console.error("Firestore (db) não está inicializado. Não é possível buscar a coleção:", nomeColecao);
      setErro(new Error("Firestore não inicializado.") as FirestoreError);
      setCarregando(false);
      setDados([]);
      return;
    }

    setCarregando(true); // Reinicia o carregamento ao mudar a coleção ou userId

    const q = query(collection(db, nomeColecao), where("userId", "==", userId));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDados(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as DocumentData)));
        setCarregando(false);
        setErro(null); // Limpa erro anterior em caso de sucesso
      },
      (err: FirestoreError) => {
        console.error(`Erro ao ler coleção ${nomeColecao}:`, err);
        setErro(err);
        setCarregando(false);
        setDados([]); // Limpa dados em caso de erro
      }
    );
    return () => unsubscribe();
  }, [nomeColecao, userId]);

  return { dados, carregando, erro };
}
