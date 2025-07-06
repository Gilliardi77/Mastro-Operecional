
'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { z } from 'zod';
import { startOfMonth, endOfMonth } from 'date-fns';
import { CustoFixoConfiguradoSchema } from '@/schemas/custoFixoConfiguradoSchema';

const lancamentosCollection = adminDb.collection('lancamentosFinanceiros');
const custosFixosCollection = adminDb.collection('custosFixosConfigurados');

async function getVerifiedUserId(idToken: string): Promise<string> {
  if (!idToken) throw new Error("Token de autenticação não fornecido.");
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("Erro ao verificar o token de autenticação:", error);
    throw new Error("Token de autenticação inválido ou expirado.");
  }
}

const PaymentSchema = z.object({
  lancamentoId: z.string().min(1, "ID do lançamento é obrigatório."),
  valorPagamento: z.coerce.number().positive("O valor do pagamento deve ser maior que zero."),
  dataPagamento: z.date(),
  formaPagamento: z.string().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});
type PaymentInput = z.infer<typeof PaymentSchema>;

export async function registerPartialPayment(idToken: string, paymentInput: PaymentInput) {
  const userId = await getVerifiedUserId(idToken);
  const { lancamentoId, valorPagamento, dataPagamento, formaPagamento, observacoes } = PaymentSchema.parse(paymentInput);

  const originalDocRef = lancamentosCollection.doc(lancamentoId);

  return adminDb.runTransaction(async (transaction) => {
    const originalDocSnap = await transaction.get(originalDocRef);
    if (!originalDocSnap.exists) throw new Error("Lançamento original não encontrado.");
    
    const originalData = originalDocSnap.data();
    if (!originalData || originalData.userId !== userId) throw new Error("Permissão negada.");
    if (originalData.status !== 'pendente') throw new Error("Só é possível pagar lançamentos pendentes.");
    if (valorPagamento > originalData.valor) throw new Error("O valor do pagamento não pode ser maior que o valor pendente.");

    const paymentData = {
      userId,
      titulo: `Pagamento: ${originalData.titulo}`,
      valor: valorPagamento,
      tipo: 'DESPESA',
      status: 'pago',
      data: Timestamp.fromDate(dataPagamento),
      categoria: originalData.categoria,
      descricao: observacoes || `Pagamento referente a: ${originalData.titulo}`,
      formaPagamento: formaPagamento || null,
      relatedLancamentoId: lancamentoId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const newPaymentRef = lancamentosCollection.doc();
    transaction.set(newPaymentRef, paymentData);

    const novoValorPendente = originalData.valor - valorPagamento;
    const updateData = {
      valor: novoValorPendente,
      valorOriginal: originalData.valorOriginal ?? originalData.valor,
      updatedAt: FieldValue.serverTimestamp(),
      status: novoValorPendente <= 0.009 ? 'liquidado' : 'pendente',
    };
    transaction.update(originalDocRef, updateData);

    return { success: true, newPaymentId: newPaymentRef.id, remainingAmount: novoValorPendente };
  });
}

/**
 * Gets the IDs of fixed costs that have already been launched as an expense in the current month.
 * @param idToken - The user's Firebase ID token.
 * @returns An array of strings with the IDs of the launched fixed costs.
 */
export async function getLaunchedFixedCostsIdsForCurrentMonth(idToken: string): Promise<string[]> {
    const userId = await getVerifiedUserId(idToken);
    const now = new Date();
    const inicioMes = startOfMonth(now);
    const fimMes = endOfMonth(now);

    const q = lancamentosCollection
        .where('userId', '==', userId)
        .where('data', '>=', inicioMes)
        .where('data', '<=', fimMes)
        .where('relatedCustoFixoId', '!=', null);
    
    const snapshot = await q.get();
    return snapshot.docs.map(doc => doc.data().relatedCustoFixoId).filter(Boolean);
}


/**
 * Creates a new pending expense from a configured fixed cost.
 * This action does not check for duplicates; that logic is handled by the client.
 * @param idToken - The user's Firebase ID token.
 * @param custoFixoId - The ID of the configured fixed cost to launch.
 * @returns An object with the success status and the new document ID.
 */
export async function createPendingExpenseFromFixedCost(idToken: string, custoFixoId: string) {
  const userId = await getVerifiedUserId(idToken);
  
  // Fetch the fixed cost configuration
  const custoFixoSnap = await custosFixosCollection.doc(custoFixoId).get();
  if (!custoFixoSnap.exists) throw new Error("Custo fixo não encontrado.");

  const custoFixoData = CustoFixoConfiguradoSchema.parse({id: custoFixoSnap.id, ...custoFixoSnap.data()});
  if (custoFixoData.userId !== userId) throw new Error("Permissão negada.");

  // Directly create the new pending expense
  const lancamentoData = {
    userId,
    titulo: custoFixoData.nome,
    valor: custoFixoData.valorMensal,
    tipo: 'DESPESA',
    status: 'pendente',
    data: Timestamp.fromDate(new Date()),
    categoria: custoFixoData.categoria,
    descricao: `Despesa recorrente de ${custoFixoData.nome}`,
    relatedCustoFixoId: custoFixoId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const newDocRef = await lancamentosCollection.add(lancamentoData);
  return { success: true, id: newDocRef.id };
}
