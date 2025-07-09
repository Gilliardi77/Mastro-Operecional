// src/services/userProfileService.ts
import { getFirebaseInstances } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, type FirestoreError, collection, query, where, getDocs } from 'firebase/firestore';
import {
  UserProfileDataSchema,
  UserProfileUpsertDataSchema,
  type UserProfileData,
  type UserProfileUpsertData,
} from '@/schemas/userProfileSchema';

/**
 * Nome da coleção no Firestore para perfis de usuário.
 * Definido conforme DATA_SYNC_CONFIG.json.
 */
const COLLECTION_NAME = 'usuarios';

function convertDocTimestampsToDates(docData: any): any {
  if (!docData) return null;
  const dataWithDates = { ...docData };
  for (const key in dataWithDates) {
    if (dataWithDates[key] instanceof Timestamp) {
      (dataWithDates as any)[key] = (dataWithDates[key] as Timestamp).toDate();
    }
  }
  return dataWithDates;
}

export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const { db } = getFirebaseInstances();
  if (!db) {
    console.error('Firestore instance is not available in getUserProfile.');
    throw new Error('Firestore not initialized. Check Firebase config.');
  }
  if (!userId) {
    console.error('User ID is required to get user profile.');
    return null;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const rawData = docSnap.data();
      let dataWithIds = { ...rawData, id: userId, userId: userId };
      
      const dataWithDates = convertDocTimestampsToDates(dataWithIds);
      
      return UserProfileDataSchema.parse(dataWithDates);
    }
    return null;
  } catch (error: any) {
    console.error(`Error getting user profile for ${userId}:`, error);
    if (error.name === 'ZodError') {
      throw new Error(`Invalid user profile data for ${userId}: ${error.errors.map((e: any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Failed to get user profile for ${userId}: ${(error as FirestoreError).message || error}`);
  }
}

export async function upsertUserProfile(userId: string, data: UserProfileUpsertData): Promise<UserProfileData> {
  const { db } = getFirebaseInstances();
  if (!db) {
    console.error('Firestore instance is not available in upsertUserProfile.');
    throw new Error('Firestore not initialized. Check Firebase config.');
  }
  if (!userId) {
    throw new Error('User ID is required to upsert user profile.');
  }

  try {
    const validatedData = UserProfileUpsertDataSchema.parse(data);
    const docRef = doc(db, COLLECTION_NAME, userId);
    const serverTime = serverTimestamp();

    const dataToSet: { [key: string]: any } = { ...validatedData };
    
    const currentProfileSnap = await getDoc(docRef);
    if (currentProfileSnap.exists() && currentProfileSnap.data()?.createdAt) {
      dataToSet.createdAt = currentProfileSnap.data()?.createdAt; 
    } else {
      dataToSet.createdAt = serverTime; 
    }
    dataToSet.updatedAt = serverTime;


    await setDoc(docRef, dataToSet, { merge: true });

    const fetchedProfile = await getUserProfile(userId);
    if (!fetchedProfile) {
      throw new Error('Failed to retrieve profile after upsert, or data structure mismatch.');
    }
    return fetchedProfile;

  } catch (error: any) {
    console.error(`Error upserting user profile for ${userId}:`, error);
     if (error.name === 'ZodError') {
      throw new Error(`Invalid data for user profile upsert: ${error.errors.map((e: any) => `${e.path.join('.')} - ${e.message}`).join(', ')}`);
    }
    throw new Error(`Failed to upsert user profile for ${userId}: ${(error as FirestoreError).message || error}`);
  }
}

/**
 * Busca todos os membros da equipe que são gerenciados por um admin específico.
 * @param adminId O UID do usuário administrador.
 * @returns Uma lista de perfis de usuário da equipe.
 */
export async function getTeamMembers(adminId: string): Promise<UserProfileData[]> {
  const { db } = getFirebaseInstances();
  if (!db) throw new Error('Firestore not initialized.');

  const usersCollection = collection(db, COLLECTION_NAME);
  const q = query(usersCollection, where("adminId", "==", adminId));
  
  const querySnapshot = await getDocs(q);
  const members: UserProfileData[] = [];
  querySnapshot.forEach((doc) => {
    const rawData = doc.data();
    const dataWithId = { ...rawData, id: doc.id, userId: doc.id };
    const dataWithDates = convertDocTimestampsToDates(dataWithId);
    try {
      members.push(UserProfileDataSchema.parse(dataWithDates));
    } catch(e) {
      console.warn(`Skipping invalid team member profile (ID: ${doc.id}):`, e);
    }
  });

  return members;
}
