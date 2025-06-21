// src/services/sessaoCaixaService.ts
import {
  SessaoCaixaSchema,
  SessaoCaixaCreateSchema,
  SessaoCaixaUpdateSchema,
  type SessaoCaixa,
  type SessaoCaixaCreateData,
  type SessaoCaixaUpdateData,
} from '@/schemas/sessaoCaixaSchema';
import {
  createDocument,
  updateDocument,
  queryDocuments,
} from './firestoreService';
import type { QueryConstraint } from 'firebase/firestore';

const COLLECTION_NAME = 'sessoesCaixa';

export async function abrirSessaoCaixa(userId: string, trocoInicial: number): Promise<SessaoCaixa> {
  const data: SessaoCaixaCreateData = {
    dataAbertura: new Date(),
    status: 'aberto',
    trocoInicial: trocoInicial,
  };
  return createDocument(COLLECTION_NAME, userId, SessaoCaixaCreateSchema, SessaoCaixaSchema, data);
}

export async function fecharSessaoCaixa(sessionId: string, dadosFechamento: Omit<SessaoCaixaUpdateData, 'status' | 'dataFechamento'>): Promise<SessaoCaixa> {
  const data: SessaoCaixaUpdateData = {
    ...dadosFechamento,
    status: 'fechado',
    dataFechamento: new Date(),
  };
  const updatedSessao = await updateDocument(COLLECTION_NAME, sessionId, data, SessaoCaixaUpdateSchema, SessaoCaixaSchema);
  if (!updatedSessao) {
    throw new Error(`Sessão de caixa com ID ${sessionId} não encontrada após a atualização.`);
  }
  return updatedSessao;
}

export async function buscarSessaoAtiva(userId: string): Promise<SessaoCaixa | null> {
  const { where, orderBy, limit } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("status", "==", "aberto"),
    orderBy("dataAbertura", "desc"),
    limit(1)
  ];
  const sessoes = await queryDocuments(COLLECTION_NAME, constraints, SessaoCaixaSchema);
  return sessoes.length > 0 ? sessoes[0] : null;
}

export async function getUltimaSessaoFechada(userId: string): Promise<SessaoCaixa | null> {
  const { where, orderBy, limit } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("status", "==", "fechado"),
    orderBy("dataFechamento", "desc"),
    limit(1)
  ];
  const sessoes = await queryDocuments(COLLECTION_NAME, constraints, SessaoCaixaSchema);
  // O tipo de dataFechamento em SessaoCaixa é opcional, mas para a última fechada, ele deve existir.
  // A consulta por status 'fechado' e ordenação por 'dataFechamento' já garante isso.
  return sessoes.length > 0 ? sessoes[0] : null;
}

export async function getAllSessoesFechadasByUserId(userId: string): Promise<SessaoCaixa[]> {
  const { where, orderBy } = await import('firebase/firestore');
  const constraints: QueryConstraint[] = [
    where("userId", "==", userId),
    where("status", "==", "fechado"),
    orderBy("dataFechamento", "desc")
  ];
  const sessoes = await queryDocuments(COLLECTION_NAME, constraints, SessaoCaixaSchema);
  // Filtro de segurança para TypeScript, garantindo que a data de fechamento não seja nula.
  // Pela lógica da query (status fechado), ela sempre existirá.
  return sessoes.filter(s => s.dataFechamento != null);
}
