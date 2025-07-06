
'use server';

/**
 * @fileOverview Serviço genérico para interações com o Firestore.
 * Fornece funções CRUD básicas que podem ser reutilizadas por serviços de entidades específicas.
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy as firestoreOrderBy,
  Timestamp,
  type DocumentData,
  type WithFieldValue,
  type PartialWithFieldValue,
  type QueryConstraint
} from 'firebase/firestore';
import type { BaseData, BaseCreateData, BaseUpdateData } from '@/schemas/commonSchemas';

// Helper para converter Timestamps do Firestore para Date e vice-versa, se necessário,
// ou para garantir que os timestamps sejam tratados corretamente.
// Por ora, vamos assumir que serverTimestamp() é usado na escrita e
// os Timestamps são lidos diretamente.

/**
 * Cria um novo documento em uma coleção especificada.
 * @template T - O tipo do documento, estendendo BaseData.
 * @param {string} collectionName - O nome da coleção no Firestore.
 * @param {string} userId - O ID do usuário proprietário do documento.
 * @param {Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>} data - Os dados para criar o documento.
 * @returns {Promise<T>} O documento criado, incluindo id, userId e timestamps.
 * @throws {Error} Se a criação do documento falhar.
 */
export async function createDocument<T extends BaseData>(
  collectionName: string,
  userId: string,
  data: Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<T> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      userId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } as WithFieldValue<DocumentData>);

    // Para retornar o objeto completo com os timestamps resolvidos, precisamos buscar o doc.
    const newDocSnap = await getDoc(docRef);
    if (!newDocSnap.exists()) {
      throw new Error("Falha ao buscar o documento recém-criado.");
    }
    return { id: newDocSnap.id, ...newDocSnap.data() } as T;
  } catch (error) {
    console.error(`Erro ao criar documento em ${collectionName}:`, error);
    throw error; // Re-throw para ser tratado pelo chamador
  }
}

/**
 * Obtém um documento de uma coleção pelo seu ID.
 * @template T - O tipo do documento, estendendo BaseData.
 * @param {string} collectionName - O nome da coleção.
 * @param {string} docId - O ID do documento a ser obtido.
 * @returns {Promise<T | null>} O documento encontrado ou null se não existir.
 * @throws {Error} Se a leitura do documento falhar.
 */
export async function getDocumentById<T extends BaseData>(
  collectionName: string,
  docId: string
): Promise<T | null> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (error) {
    console.error(`Erro ao obter documento ${docId} de ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Obtém todos os documentos de uma coleção que pertencem a um userId específico.
 * @template T - O tipo do documento, estendendo BaseData.
 * @param {string} collectionName - O nome da coleção.
 * @param {string} userId - O ID do usuário.
 * @param {keyof T & string} [orderByField] - Campo para ordenar os resultados (opcional).
 * @param {'asc' | 'desc'} [orderDirection] - Direção da ordenação (opcional, default 'asc').
 * @returns {Promise<T[]>} Um array com os documentos encontrados.
 * @throws {Error} Se a leitura dos documentos falhar.
 */
export async function getAllDocumentsByUserId<T extends BaseData>(
  collectionName: string,
  userId: string,
  orderByField?: keyof T & string,
  orderDirection: 'asc' | 'desc' = 'asc'
): Promise<T[]> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const constraints: QueryConstraint[] = [where("userId", "==", userId)];
    if (orderByField) {
      constraints.push(firestoreOrderBy(orderByField, orderDirection));
    }
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Erro ao obter documentos de ${collectionName} para o usuário ${userId}:`, error);
    throw error;
  }
}

/**
 * Atualiza um documento existente em uma coleção.
 * @template T - O tipo do documento, estendendo BaseData.
 * @param {string} collectionName - O nome da coleção.
 * @param {string} docId - O ID do documento a ser atualizado.
 * @param {Partial<Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>} data - Os dados para atualizar.
 *        Apenas os campos fornecidos serão atualizados.
 * @returns {Promise<T | null>} O documento atualizado ou null se não for encontrado.
 * @throws {Error} Se a atualização falhar ou o documento não existir.
 */
export async function updateDocument<T extends BaseData>(
  collectionName: string,
  docId: string,
  data: Partial<Omit<T, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
): Promise<T | null> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const docRef = doc(db, collectionName, docId);
    // Verifica se o documento existe antes de tentar atualizar
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.warn(`Documento ${docId} não encontrado em ${collectionName} para atualização.`);
      return null;
    }

    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp(),
    } as PartialWithFieldValue<DocumentData>);

    const updatedDocSnap = await getDoc(docRef);
     if (!updatedDocSnap.exists()) { // Checagem de segurança, não deveria acontecer
      throw new Error("Falha ao buscar o documento recém-atualizado.");
    }
    return { id: updatedDocSnap.id, ...updatedDocSnap.data() } as T;
  } catch (error) {
    console.error(`Erro ao atualizar documento ${docId} em ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Deleta um documento de uma coleção.
 * @param {string} collectionName - O nome da coleção.
 * @param {string} docId - O ID do documento a ser deletado.
 * @returns {Promise<void>}
 * @throws {Error} Se a deleção falhar.
 */
export async function deleteDocument(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error(`Erro ao deletar documento ${docId} de ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Função utilitária para buscar documentos com filtros mais complexos.
 * @template T - O tipo do documento.
 * @param {string} collectionName - Nome da coleção.
 * @param {QueryConstraint[]} constraints - Array de QueryConstraints do Firestore (where, orderBy, limit, etc.).
 * @returns {Promise<T[]>}
 */
export async function queryDocuments<T extends BaseData>(
  collectionName: string,
  constraints: QueryConstraint[]
): Promise<T[]> {
  if (!db) throw new Error("Firestore não inicializado.");
  try {
    const q = query(collection(db, collectionName), ...constraints);
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (error) {
    console.error(`Erro ao executar query em ${collectionName}:`, error);
    throw error;
  }
}
