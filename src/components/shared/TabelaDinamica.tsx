// components/shared/TabelaDinamica.tsx
"use client";

import { useRealtimeCollection } from "@/hooks/useRealtimeCollection"; // Caminho ajustado
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info } from "lucide-react";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TabelaDinamicaProps {
  nomeColecao: string;
  userId: string | null;
  titulo?: string;
  colunasExcluidas?: string[];
  colunasOrdenadas?: string[];
  formatadoresDeColuna?: Record<string, (valor: any) => React.ReactNode>;
  orderByField?: string;
  orderByDirection?: "asc" | "desc";
}

const TabelaDinamica = ({ 
  nomeColecao, 
  userId, 
  titulo, 
  colunasExcluidas = ['userId', 'criadoEm', 'atualizadoEm', 'id'], 
  colunasOrdenadas,
  formatadoresDeColuna = {},
  orderByField,
  orderByDirection,
}: TabelaDinamicaProps) => {
  const { dados, carregando, erro } = useRealtimeCollection(nomeColecao, userId, {orderByField, orderByDirection});

  if (carregando) return <Skeleton className="h-60 w-full rounded-lg" />;
  
  if (erro) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao Carregar Dados</AlertTitle>
        <AlertDescription>
          Não foi possível carregar os dados da coleção "{nomeColecao}". Detalhe: {String(erro.message || erro)}
        </AlertDescription>
      </Alert>
    );
  }

  if (dados.length === 0) {
    return (
      <Card className="p-4 mt-4 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl capitalize mb-1">
            {titulo || nomeColecao.replace(/([A-Z])/g, ' $1').trim()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sem Dados</AlertTitle>
            <AlertDescription>
              Nenhum dado encontrado para "{nomeColecao}".
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  let campos = dados[0] ? Object.keys(dados[0]).filter(campo => !colunasExcluidas.includes(campo)) : [];

  if (colunasOrdenadas) {
    campos = colunasOrdenadas.filter(c => campos.includes(c)).concat(campos.filter(c => !colunasOrdenadas.includes(c)));
  }


  const formatarValor = (valor: any, campo: string): React.ReactNode => {
    if (formatadoresDeColuna[campo]) {
      return formatadoresDeColuna[campo](valor);
    }
    if (valor && typeof valor === 'object' && valor.toDate && typeof valor.toDate === 'function') { // Timestamp do Firebase
      try {
        return format(valor.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR });
      } catch {
        return String(valor); // Fallback se não for uma data válida
      }
    }
    if (typeof valor === 'boolean') {
      return valor ? "Sim" : "Não";
    }
    if (typeof valor === 'number' && campo.toLowerCase().includes('valor')) {
        return `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }
    if (typeof valor === "object") {
      return <pre className="text-xs bg-muted p-1 rounded-sm overflow-x-auto max-w-xs">{JSON.stringify(valor, null, 2)}</pre>;
    }
    return String(valor);
  };


  return (
    <Card className="p-4 mt-4 shadow-lg rounded-lg">
      <CardHeader className="pb-2 pt-1 px-2">
        <CardTitle className="text-xl capitalize font-headline">
          {titulo || nomeColecao.replace(/([A-Z])/g, ' $1').trim()}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-2">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {campos.map((campo) => (
                  <TableHead key={campo} className="py-2 px-3 capitalize text-sm">
                    {campo.replace(/([A-Z])/g, ' $1').trim()}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  {campos.map((campo) => (
                    <TableCell key={campo} className="py-2 px-3 text-sm">
                      {formatarValor(item[campo], campo)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabelaDinamica;
