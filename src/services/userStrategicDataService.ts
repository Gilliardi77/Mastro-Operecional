
'use server';

import { getUserProfile } from './userProfileService';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserGoalSchema } from '@/schemas/userGoalSchema';

/**
 * Busca o segmento de negócio do perfil do usuário.
 */
export async function getUserBusinessSegment(userId: string): Promise<string | undefined> {
  try {
    const userProfile = await getUserProfile(userId);
    return userProfile?.businessType;
  } catch (error) {
    console.error("Erro ao buscar segmento de negócio do usuário:", error);
    return undefined;
  }
}

/**
 * Sugere uma meta de faturamento com base no último planejamento salvo.
 * Exemplo: aumenta a última meta em 10%.
 */
export async function getSuggestedTargetRevenue(userId: string): Promise<number | null> {
  try {
    if (!db) {
        console.error("Firestore DB não inicializado em getSuggestedTargetRevenue");
        return null;
    }
    const q = query(
      collection(db, 'userGoals'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    // A validação completa com o schema já acontece no firestoreService
    // Aqui, podemos confiar na estrutura, mas uma verificação extra é segura.
    const lastGoalData = snapshot.docs[0].data();
    
    // Usamos safeParse para não quebrar a aplicação se um documento antigo não corresponder.
    const parseResult = UserGoalSchema.safeParse({id: snapshot.docs[0].id, ...lastGoalData});

    if (!parseResult.success) {
      console.warn("Documento de 'userGoals' inválido encontrado:", parseResult.error);
      return null;
    }
    
    const lastGoal = parseResult.data;

    if (lastGoal.inputData?.targetRevenueGoal && lastGoal.inputData.targetRevenueGoal > 0) {
      // Suggest a 10% increase for the next goal, rounded to the nearest 100
      return Math.round((lastGoal.inputData.targetRevenueGoal * 1.1) / 100) * 100;
    }

    return null;
  } catch (error) {
    console.error("Erro ao sugerir meta de faturamento:", error);
    return null;
  }
}
