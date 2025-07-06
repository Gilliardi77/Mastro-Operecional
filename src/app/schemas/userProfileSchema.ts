
// src/schemas/userProfileSchema.ts
import { z } from 'zod';
import { BaseSchema, FirestoreTimestampSchema } from './commonSchemas';
import type { Timestamp } from 'firebase/firestore';


// Schema for the data shape as stored and retrieved from Firestore
export const UserProfileFirestoreDataSchema = z.object({
  companyName: z.string().optional().nullable(),
  companyCnpj: z.string().optional().nullable(),
  businessType: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyEmail: z.string().email().optional().or(z.literal('')).nullable(),
  personalPhoneNumber: z.string().optional().nullable(),
  role: z.enum(['user', 'admin', 'vip']).optional().nullable().describe('User role for access control.'),
});
export type UserProfileFirestoreData = z.infer<typeof UserProfileFirestoreDataSchema>;


// Schema for the full document object as it exists in Firestore, including system-managed fields
export const UserProfileFirestoreSchema = BaseSchema.extend({
  ...UserProfileFirestoreDataSchema.shape,
  // Timestamps from BaseSchema will be validated as Firestore Timestamps
});
export type UserProfileFirestore = z.infer<typeof UserProfileFirestoreSchema>;

// Client-side representation where Timestamps are converted to Date objects
export const UserProfileClientSchema = UserProfileFirestoreSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type UserProfileClient = z.infer<typeof UserProfileClientSchema>;
