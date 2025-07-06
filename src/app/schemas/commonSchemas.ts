// src/schemas/commonSchemas.ts
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

/**
 * Schema for Firestore Timestamp objects.
 * Used for validating data that is already a Firestore Timestamp (e.g., when reading from Firestore).
 * For data input (e.g., from forms or client-side), typically use z.date() and convert to Timestamp in the service layer.
 */
export const FirestoreTimestampSchema = z.custom<Timestamp>(
  (val: any) => val && typeof val.toDate === 'function' && val.toDate() instanceof Date,
  {
    message: "Invalid Firestore Timestamp. Expected an object with a toDate method that returns a Date.",
  }
).describe("A Firestore Timestamp object (server ou client), or any object behaving like one.");

/**
 * Base schema for all documents intended to be stored in Firestore.
 * Includes common fields that are managed by the system or are essential.
 * - id: Firestore document ID, added when reading data.
 * - userId: UID of the user who owns this document, set on creation.
 * - createdAt: Timestamp of when the document was created, set by the server/service.
 * - updatedAt: Timestamp of when the document was last updated, set by the server/service.
 */
export const BaseSchema = z.object({
  id: z.string().describe("Unique identifier for the document (Firestore Document ID)."),
  userId: z.string().describe("UID of the user who owns this document."),
  createdAt: FirestoreTimestampSchema.describe("Timestamp of when the document was created."),
  updatedAt: FirestoreTimestampSchema.describe("Timestamp of when the document was last updated."),
});
export type BaseData = z.infer<typeof BaseSchema>;

/**
 * Base schema to be extended for creating new documents.
 * This schema is intentionally minimal. Entity-specific create schemas
 * will extend this and add their own required/optional fields.
 * Fields like 'id', 'userId', 'createdAt', 'updatedAt' are typically managed
 * by the backend service (e.g., firestoreService) and not part of the direct input payload
 * for this base definition. 'userId' is often passed as a separate parameter.
 */
export const BaseCreateSchema = z.object({
  // No common fields are defined here as part of the *input data* for creation at the base level.
  // Entity-specific schemas will add their relevant fields.
  // userId is usually a separate parameter in create functions.
  // createdAt and updatedAt are set by the backend.
}).describe("Base for creating entities. Entity-specific fields are added by extending this.");

/**
 * Base schema to be extended for updating existing documents.
 * This schema is intentionally minimal. Entity-specific update schemas
 * will extend this, typically making their fields optional (partial).
 * Fields like 'id', 'userId', and 'createdAt' are generally not updatable or
 * are handled via path parameters or specific logic. 'updatedAt' is managed by the backend.
 */
export const BaseUpdateSchema = z.object({
  // No common fields are defined here as part of the *input data* for update at the base level.
  // Entity-specific schemas will add their relevant fields, usually as partials.
  // id, userId, createdAt are typically immutable or managed outside the direct update payload.
  // updatedAt is set by the backend.
}).describe("Base for updating entities. Entity-specific fields (usually partial) are added by extending this.");
