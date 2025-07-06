
"use client"; // Necessário para hooks como useState, useEffect e o uso do hook personalizado

import { useRealtimeCollection } from "@/hooks/useRealtimeCollection"; // Ajustado o caminho do hook
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead, TableCaption } from "@/components/ui/table"; // Adicionado TableHead e TableCaption
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const TabelaDinamica = ({ nomeColecao, userId, titulo }: { nomeColecao: string; userId: string | undefined; titulo?: string }) => {
  const { dados, carregando, erro } = useRealtimeCollection(nomeColecao, userId);

  if (!userId) {
    return (
       <Card className="p-4 mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-bold mb-2 capitalize">{titulo || nomeColecao}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Aguardando Usuário</AlertTitle>
            <AlertDescription>
              O ID do usuário não foi fornecido. A tabela não pode ser carregada.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (carregando) {
    return (
      <Card className="p-4 mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-bold mb-2 capitalize">{titulo || nomeColecao}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (erro) {
     return (
       <Card className="p-4 mt-4">
        <CardHeader>
          <CardTitle className="text-lg font-bold mb-2 capitalize">{titulo || nomeColecao}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erro ao Carregar Dados</AlertTitle>
            <AlertDescription>
              Não foi possível carregar os dados da coleção &quot;{nomeColecao}&quot;.
              Detalhes: {String(erro.message || erro)}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const campos = dados.length > 0 && dados[0] ? Object.keys(dados[0]).filter(key => key !== 'id') : []; // Excluir 'id' das colunas, pois já é a chave da linha

  return (
    <Card className="p-4 mt-4 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold mb-3 capitalize text-primary">{titulo || nomeColecao}</CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">Nenhum dado encontrado para &quot;{nomeColecao}&quot;.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {campos.map((campo) => (
                    <TableHead key={campo} className="capitalize font-medium">{campo.replace(/_/g, ' ')}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.map((item) => (
                  <TableRow key={item.id}>
                    {campos.map((campo) => (
                      <TableCell key={campo} className="text-sm">
                        {item[campo] === null || item[campo] === undefined ? "-" :
                         typeof item[campo] === 'boolean' ? (item[campo] ? 'Sim' : 'Não') :
                         item[campo] instanceof Date ? item[campo].toLocaleDateString() : // Formatar datas
                         item[campo].seconds && typeof item[campo].seconds === 'number' ? new Date(item[campo].seconds * 1000).toLocaleString() : // Formatar Timestamps do Firestore
                         typeof item[campo] === "object"
                          ? JSON.stringify(item[campo]) // Simplificado para objetos, pode precisar de tratamento melhor
                          : String(item[campo])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              {dados.length > 5 && <TableCaption>Exibindo {dados.length} registros de {nomeColecao}.</TableCaption>}
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TabelaDinamica;

