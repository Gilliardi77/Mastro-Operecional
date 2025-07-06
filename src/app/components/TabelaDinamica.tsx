
// components/TabelaDinamica.tsx
'use client';

import React from 'react';
import { useRealtimeCollection, type RealtimeData } from "@/hooks/useRealtimeCollection"; // Caminho ajustado
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption } from "@/components/ui/table"; // TableHead e TableCaption importados
import { AlertTriangle, DatabaseZap } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

interface TabelaDinamicaProps {
  nomeColecao: string;
  userId?: string;
  titulo?: string; // Título opcional para o Card
  camposVisiveis?: string[]; // Para controlar quais campos mostrar e a ordem
  formatters?: Record<string, (valor: any, item: RealtimeData) => React.ReactNode>; // Formatadores customizados por campo
}

const CAMPOS_MONETARIOS_COMUNS = [
  'valor', 'preco', 'total', 'subtotal', 'desconto', 'imposto', 'frete',
  'custo', 'valorunitario', 'valortotal', 'valormensal', 'custounitario',
  'valorestimado', 'valoradiantado', 'valorpagototal', 'metafaturamento', 'metalucro',
  'custosfixosestimadosmensais', 'currentrevenue', 'currentexpenses', 'targetrevenuegoal',
  'saldofinalcalculado', 'totalentradascalculado', 'totalsaidascalculado', 'trocoinicial', 'sangrias'
];

const TabelaDinamica = ({ nomeColecao, userId, titulo, camposVisiveis, formatters }: TabelaDinamicaProps) => {
  const { dados, carregando, erro } = useRealtimeCollection(nomeColecao, userId);

  if (!userId) {
    return (
        <Card className="p-4 mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                    <DatabaseZap className="h-5 w-5" />
                    {titulo || `Dados de: ${nomeColecao}`}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Usuário não identificado. Não é possível carregar os dados.</p>
            </CardContent>
        </Card>
    );
  }

  if (carregando) return (
    <Card className="p-4 mt-4">
        <CardHeader>
            <CardTitle className="capitalize flex items-center gap-2">
                <DatabaseZap className="h-5 w-5 text-primary" />
                {titulo || `Dados de: ${nomeColecao}`}
            </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-full" />
        </CardContent>
    </Card>
  );

  if (erro) return (
    <Card className="p-4 mt-4 bg-destructive/10 border-destructive">
        <CardHeader>
            <CardTitle className="capitalize flex items-center gap-2 text-destructive">
                 <AlertTriangle className="h-5 w-5" />
                Erro ao carregar: {titulo || nomeColecao}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-destructive">Não foi possível carregar os dados. Detalhes: {String(erro.message || erro)}</p>
        </CardContent>
    </Card>
  );

  if (dados.length === 0) {
    return (
      <Card className="p-4 mt-4">
        <CardHeader>
            <CardTitle className="capitalize flex items-center gap-2">
                <DatabaseZap className="h-5 w-5 text-primary" />
                {titulo || `Dados de: ${nomeColecao}`}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Nenhum dado encontrado para "{nomeColecao}".</p>
        </CardContent>
      </Card>
    );
  }

  const colunas = camposVisiveis 
    ? camposVisiveis 
    : Object.keys(dados[0]).filter(key => key !== 'id' && key !== 'userId');

  const formatValor = (valor: any, campo: string, item: RealtimeData): React.ReactNode => {
    if (formatters && formatters[campo]) {
      return formatters[campo](valor, item);
    }
    if (valor instanceof Timestamp) {
      const date = valor.toDate();
      return isValid(date) ? format(date, 'dd/MM/yyyy HH:mm') : 'Data inválida';
    }
    if (typeof valor === 'boolean') {
      return valor ? 'Sim' : 'Não';
    }
    // Verificação para campos monetários
    if (typeof valor === 'number' && CAMPOS_MONETARIOS_COMUNS.includes(campo.toLowerCase())) {
      return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    if (typeof valor === 'object' && valor !== null) {
      return <pre className="text-xs bg-muted/50 p-1 rounded max-w-xs overflow-x-auto">{JSON.stringify(valor, null, 2)}</pre>;
    }
    return String(valor);
  };


  return (
    <Card className="p-4 mt-4 shadow-md rounded-lg">
      <CardHeader>
        <CardTitle className="capitalize text-xl font-headline flex items-center gap-2">
            <DatabaseZap className="h-6 w-6 text-primary" />
            {titulo || `Dados de: ${nomeColecao}`}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    {colunas.map((campo) => (
                    <TableHead key={campo} className="capitalize">{campo.replace(/([A-Z])/g, ' $1').trim()}</TableHead> 
                    ))}
                </TableRow>
                </TableHeader>
                <TableBody>
                {dados.map((item) => (
                    <TableRow key={item.id}>
                    {colunas.map((campo) => (
                        <TableCell key={`${item.id}-${campo}`}>
                        {formatValor(item[campo], campo, item)}
                        </TableCell>
                    ))}
                    </TableRow>
                ))}
                </TableBody>
                <TableCaption>Exibindo {dados.length} registro(s) de "{nomeColecao}".</TableCaption>
            </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default TabelaDinamica;
