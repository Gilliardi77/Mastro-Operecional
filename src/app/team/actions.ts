// src/app/team/actions.ts
'use server';

import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { cookies } from 'next/headers';
import { CreateUserFormSchema, type CreateUserFormValues } from '@/schemas/teamManagementSchema';
import { UserProfileUpsertDataSchema } from '@/schemas/userProfileSchema';

// Função para verificar se o chamador é um administrador
async function verifyAdmin(): Promise<string> {
  if (!adminAuth || !adminDb) {
    throw new Error("Serviços de admin do Firebase não inicializados.");
  }
  
  const sessionCookie = cookies().get('__session')?.value;
  if (!sessionCookie) {
    throw new Error("Sessão não encontrada. Faça login novamente.");
  }

  const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
  const adminDoc = await adminDb.collection('usuarios').doc(decodedToken.uid).get();

  if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
    throw new Error("Acesso negado. Apenas administradores podem criar usuários.");
  }

  return decodedToken.uid;
}

// Ação para criar um novo usuário
export async function createUserAction(formData: CreateUserFormValues): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const adminId = await verifyAdmin();

    const validationResult = CreateUserFormSchema.safeParse(formData);
    if (!validationResult.success) {
      throw new Error("Dados do formulário inválidos.");
    }
    
    const { displayName, email, password, accessibleModules } = validationResult.data;

    // 1. Criar o usuário no Firebase Authentication
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName,
      emailVerified: false, // Opcional
    });

    // 2. Criar o perfil do usuário no Firestore
    const userProfileData = UserProfileUpsertDataSchema.parse({
      role: 'user', // Novos usuários são sempre 'user'
      accessibleModules: accessibleModules,
      adminId: adminId, // Vincula o novo usuário ao admin que o criou
      companyName: (await adminDb.collection('usuarios').doc(adminId).get()).data()?.companyName || '', // Herda o nome da empresa
    });

    await adminDb.collection('usuarios').doc(userRecord.uid).set({
      ...userProfileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { success: true, userId: userRecord.uid };

  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    let errorMessage = "Ocorreu um erro desconhecido.";
    if (error.code === 'auth/email-already-exists') {
      errorMessage = "Este e-mail já está em uso por outra conta.";
    } else if (error.code === 'auth/invalid-password') {
        errorMessage = `A senha fornecida é inválida. ${error.message}`;
    } else {
        errorMessage = error.message;
    }
    return { success: false, error: errorMessage };
  }
}
