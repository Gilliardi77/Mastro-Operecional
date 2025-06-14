
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  type FirestoreError,
} from 'firebase/firestore';
import type { ZodSchema } from 'zod';

/**
 * Converte um objeto de dados, transformando campos Date em Timestamps do Firestore.
 */
function convertDatesToTimestamps(data: Record<string, any>): Record<string, any> {
  const convertedData: Record<string, any> = {};
  for (const key in data) {
    if (data[key] instanceof Date) {
      convertedData[key] = Timestamp.fromDate(data[key]);
    } else {
      convertedData[key] = data[key];
    }
  }
  return convertedData;
}

/**
 * Converte um documento do Firestore, transformando campos Timestamp em Dates JavaScript.
 */
function convertTimestampsToDates<T extends DocumentData>(docData: T): T {
  const dataWithDates = { ...docData };
  for (const key in dataWithDates) {
    if (dataWithDates[key] instanceof Timestamp) {
      (dataWithDates as any)[key] = (dataWithDates[key] as Timestamp).toDate();
    }
  }
  return dataWithDates;
}

/**
 * Cria um novo documento em uma coleção do Firestore.
 * @param collectionName Nome da coleção.
 * @param userId ID do usuário proprietário.
 * @param createSchema Schema Zod para validar os dados de entrada (sem campos automáticos).
 * @param fullSchema Schema Zod para validar o documento completo (após adicionar campos automáticos).
 * @param data Dados para criar o documento, conformes ao createSchema.
 * @returns O documento criado e validado, com campos automáticos adicionados.
 * @throws Error se a validação falhar ou ocorrer um erro no Firestore.
 */
export async function createDocument<TCreate, TFull extends { id: string }>(
  collectionName: string,
  userId: string,
  createSchema: ZodSchema<TCreate>,
  fullSchema: ZodSchema<TFull>,
  data: TCreate
): Promise<TFull> {
  try {
    const validatedData = createSchema.parse(data);
    const now = new Date(); // Usar Date para Timestamps, serão convertidos
    const docDataWithUserAndTimestamps = {
      ...validatedData,
      userId,
      createdAt: now,
      updatedAt: now,
    };

    const docDataForFirestore = convertDatesToTimestamps(docDataWithUserAndTimestamps);

    const docRef = await addDoc(collection(db, collectionName), docDataForFirestore);
    
    const fullDocData = {
      ...docDataWithUserAndTimestamps, // Usa os dados com Date para validação Zod
      id: docRef.id,
    };
    
    return fullSchema.parse(fullDocData);
  } catch (error: any) {
    console.error(`Erro ao criar documento em ${collectionName}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados inválidos para ${collectionName}: ${error.errors.map((e:any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao criar documento em ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Obtém um documento de uma coleção do Firestore pelo seu ID.
 * @param collectionName Nome da coleção.
 * @param id ID do documento.
 * @param schema Schema Zod para validar o documento retornado.
 * @returns O documento validado, ou null se não encontrado.
 * @throws Error se a validação falhar ou ocorrer um erro no Firestore.
 */
export async function getDocumentById<T extends { id: string }>(
  collectionName: string,
  id: string,
  schema: ZodSchema<T>
): Promise<T | null> {
  try {
    const docRef = doc(db, collectionName, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const rawData = docSnap.data() as DocumentData;
      const dataWithId = { ...rawData, id: docSnap.id };
      const dataWithDates = convertTimestampsToDates(dataWithId);
      return schema.parse(dataWithDates);
    }
    return null;
  } catch (error: any) {
    console.error(`Erro ao obter documento ${id} de ${collectionName}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados inválidos de ${collectionName} (ID: ${id}): ${error.errors.map((e:any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao obter documento de ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Obtém todos os documentos de uma coleção pertencentes a um usuário específico.
 * @param collectionName Nome da coleção.
 * @param userId ID do usuário.
 * @param schema Schema Zod para validar os documentos retornados.
 * @param orderByField Campo para ordenação (opcional).
 * @param orderDirection Direção da ordenação ('asc' ou 'desc', opcional).
 * @returns Uma lista de documentos validados.
 * @throws Error se a validação falhar ou ocorrer um erro no Firestore.
 */
export async function getAllDocumentsByUserId<T extends { id: string }>(
  collectionName: string,
  userId: string,
  schema: ZodSchema<T>,
  orderByField?: keyof T & string,
  orderDirection?: 'asc' | 'desc'
): Promise<T[]> {
  try {
    const qConstraints: QueryConstraint[] = [where("userId", "==", userId)];
    if (orderByField) {
      qConstraints.push(orderBy(orderByField, orderDirection || 'asc'));
    }
    const q = query(collection(db, collectionName), ...qConstraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const rawData = docSnap.data() as DocumentData;
      const dataWithId = { ...rawData, id: docSnap.id };
      const dataWithDates = convertTimestampsToDates(dataWithId);
      return schema.parse(dataWithDates);
    });
  } catch (error: any) {
    console.error(`Erro ao obter documentos de ${collectionName} para usuário ${userId}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados inválidos de ${collectionName} (getAllByUserId): ${error.errors.map((e:any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao obter documentos de ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Atualiza um documento existente em uma coleção do Firestore.
 * @param collectionName Nome da coleção.
 * @param id ID do documento a ser atualizado.
 * @param data Dados para atualizar, conformes ao updateSchema. Campos não fornecidos não são alterados.
 * @param updateSchema Schema Zod para validar os dados de atualização.
 * @param fullSchema Schema Zod para validar e retornar o documento completo após a atualização.
 * @returns O documento atualizado e validado.
 * @throws Error se o documento não for encontrado, a validação falhar ou ocorrer um erro no Firestore.
 */
export async function updateDocument<TUpdate, TFull extends { id: string }>(
  collectionName: string,
  id: string,
  data: TUpdate,
  updateSchema: ZodSchema<TUpdate>,
  fullSchema: ZodSchema<TFull>
): Promise<TFull> {
  try {
    const validatedData = updateSchema.parse(data);
    if (Object.keys(validatedData).length === 0) {
        const currentDoc = await getDocumentById(collectionName, id, fullSchema);
        if (!currentDoc) throw new Error(`Documento com ID ${id} não encontrado em ${collectionName} para atualização vazia.`);
        return currentDoc; // Nenhuma alteração real, retorna o documento atual
    }

    const docRef = doc(db, collectionName, id);
    const docDataWithTimestamp = {
      ...validatedData,
      updatedAt: new Date(), // Usar Date, será convertido
    };
    
    const docDataForFirestore = convertDatesToTimestamps(docDataWithTimestamp);
    await updateDoc(docRef, docDataForFirestore);

    const updatedDocSnap = await getDoc(docRef);
    if (!updatedDocSnap.exists()) {
      throw new Error(`Documento ${id} não encontrado em ${collectionName} após atualização.`);
    }
    const rawData = updatedDocSnap.data() as DocumentData;
    const dataWithId = { ...rawData, id: updatedDocSnap.id };
    const dataWithDates = convertTimestampsToDates(dataWithId);
    return fullSchema.parse(dataWithDates);
  } catch (error: any) {
    console.error(`Erro ao atualizar documento ${id} em ${collectionName}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados de atualização inválidos para ${collectionName} (ID: ${id}): ${error.errors.map((e:any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao atualizar documento em ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Exclui um documento de uma coleção do Firestore.
 * @param collectionName Nome da coleção.
 * @param id ID do documento a ser excluído.
 * @throws Error se ocorrer um erro no Firestore.
 */
export async function deleteDocument(collectionName: string, id: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (error: any) {
    console.error(`Erro ao excluir documento ${id} de ${collectionName}:`, error);
    throw new Error(`Falha ao excluir documento de ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Executa uma consulta genérica em uma coleção do Firestore.
 * @param collectionName Nome da coleção.
 * @param qConstraints Array de QueryConstraints (where, orderBy, limit, etc.).
 * @param schema Schema Zod para validar os documentos retornados.
 * @returns Uma lista de documentos validados.
 * @throws Error se a validação falhar ou ocorrer um erro no Firestore.
 */
export async function queryDocuments<T extends { id: string }>(
  collectionName: string,
  qConstraints: QueryConstraint[],
  schema: ZodSchema<T>
): Promise<T[]> {
  try {
    const q = query(collection(db, collectionName), ...qConstraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(docSnap => {
      const rawData = docSnap.data() as DocumentData;
      const dataWithId = { ...rawData, id: docSnap.id };
      const dataWithDates = convertTimestampsToDates(dataWithId);
      return schema.parse(dataWithDates);
    });
  } catch (error: any) {
    console.error(`Erro ao executar consulta em ${collectionName}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Dados inválidos de ${collectionName} (queryDocuments): ${error.errors.map((e:any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Falha ao executar consulta em ${collectionName}: ${(error as FirestoreError).message || error}`);
  }
}
