// src/services/userProfileService.ts
import { getFirebaseInstances } from '@/lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, type FirestoreError } from 'firebase/firestore';
import {
  UserProfileDataSchema,
  UserProfileUpsertDataSchema,
  type UserProfileData,
  type UserProfileUpsertData,
} from '@/schemas/userProfileSchema';

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
      // Adicionar id e userId (que é o mesmo que id) explicitamente para validação pelo BaseSchema
      const dataWithIds = { ...rawData, id: userId, userId: userId };
      
      // Assegurar que createdAt e updatedAt existam como Timestamps ou sejam adicionados como Dates
      // antes de convertê-los e validá-los.
      if (!(dataWithIds.createdAt instanceof Timestamp)) {
        console.warn(`UserProfile for ${userId} missing Firestore Timestamp for createdAt, defaulting.`);
        dataWithIds.createdAt = new Date(0); // Default to epoch if not a Firestore Timestamp
      }
      if (!(dataWithIds.updatedAt instanceof Timestamp)) {
        console.warn(`UserProfile for ${userId} missing Firestore Timestamp for updatedAt, defaulting.`);
        dataWithIds.updatedAt = new Date(0); // Default to epoch
      }
      
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
      dataToSet.createdAt = currentProfileSnap.data()?.createdAt; // Preserve original createdAt
    } else {
      dataToSet.createdAt = serverTime; // Set new createdAt
    }
    dataToSet.updatedAt = serverTime;

    await setDoc(docRef, dataToSet, { merge: true });

    const fetchedProfile = await getUserProfile(userId);
    if (!fetchedProfile) {
      // This case implies getUserProfile failed after a successful setDoc,
      // or the data written was somehow invalid for UserProfileDataSchema.
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
