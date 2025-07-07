// src/lib/authUtils.ts
import type { User } from '@/contexts/AuthContext';

/**
 * Retorna o UID do usuário autenticado ou null se não houver usuário.
 * @param user - O objeto de usuário do contexto de autenticação.
 * @returns O UID do usuário como string, ou null.
 */
export const getActiveUserId = (user: User | null): string | null => {
  return user ? user.uid : null;
};
