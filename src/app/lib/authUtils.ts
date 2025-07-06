
// src/lib/authUtils.ts
import type { User } from 'firebase/auth';

/**
 * Determina o ID de usuário ativo para consultas e operações.
 * Retorna o UID do usuário se ele estiver logado, caso contrário, retorna undefined.
 *
 * @param {User | null} user - O objeto de usuário do Firebase Auth (pode ser null).
 * @returns {string | undefined} O ID do usuário ativo ou undefined.
 */
export function getActiveUserId(user: User | null): string | undefined {
  return user?.uid;
}
