
'use client';

/**
 * @fileOverview Serviço para buscar dados estratégicos do usuário no lado do cliente,
 * especificamente para pré-preenchimento do formulário de Planejamento Estratégico.
 */

import { db } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { getYear, getMonth } from 'date-fns';

/**
 * Busca a meta de faturamento sugerida para o usuário no mês corrente.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<number | null>} A meta de faturamento ou null se não encontrada/erro.
 */
export async function getSuggestedTargetRevenue(userId: string): Promise<number | null> {
  if (!db || !userId) {
    console.warn("[UserStrategicDataService] Firestore (db) ou userId não disponível para getSuggestedTargetRevenue.");
    return null;
  }
  const hoje = new Date();
  const ano = getYear(hoje);
  const mes = String(getMonth(hoje) + 1).padStart(2, '0'); // Formato MM (1-12)
  const anoMes = `${ano}-${mes}`;
  const docId = `${userId}_${anoMes}`;

  try {
    const docRef = doc(db, "metasFinanceiras", docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      // O nome do campo em metasFinanceiras é 'metaFaturamento' conforme o Guia de Integração
      return data.metaFaturamento !== undefined && data.metaFaturamento !== null ? Number(data.metaFaturamento) : null;
    }
    console.log(`[UserStrategicDataService] Meta de faturamento não encontrada para ${docId}.`);
    return null;
  } catch (error) {
    console.error(`[UserStrategicDataService] Erro ao buscar meta de faturamento sugerida para ${docId}:`, error);
    return null;
  }
}

/**
 * Busca o segmento de negócio do usuário.
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<string | null>} O segmento do negócio ou null se não encontrado/erro.
 */
export async function getUserBusinessSegment(userId: string): Promise<string | null> {
  if (!db || !userId) {
    console.warn("[UserStrategicDataService] Firestore (db) ou userId não disponível para getUserBusinessSegment.");
    return null;
  }
  try {
    const docRef = doc(db, "usuarios", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.businessType || null;
    }
    console.log(`[UserStrategicDataService] Segmento do negócio não encontrado para usuário ${userId}.`);
    return null;
  } catch (error) {
    console.error(`[UserStrategicDataService] Erro ao buscar segmento do negócio para ${userId}:`, error);
    return null;
  }
}
