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
  return sessoes.length > 0 ? sessoes[0] : null;
}
