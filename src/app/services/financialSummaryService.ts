
/**
 * @fileOverview Serviço para buscar e agregar dados financeiros para a página de Planejamento Estratégico.
 * Busca dados da coleção 'lancamentosFinanceiros' conforme o "Guia de Integração de Dados: Visão Clara Financeira para Gestor IA".
 * Os dados são então transformados para o schema interno do Diagnóstico Maestro.
 */

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp, type DocumentData } from 'firebase/firestore';
import { LancamentoFinanceiroSchema, type LancamentoTipo } from '@/schemas/lancamentoFinanceiroSchema';
import { startOfMonth, endOfMonth } from 'date-fns';

const LANCAMENTOS_COLLECTION = "lancamentosFinanceiros";

interface FinancialSummary {
  currentRevenue: number;
  currentExpenses: number;
}

/**
 * Calcula a receita e despesa total para o usuário no mês atual.
 * Lógica de busca segue estritamente o "Guia de Integração de Dados: Visão Clara Financeira para Gestor IA".
 * @param {string} userId - O ID do usuário.
 * @returns {Promise<FinancialSummary>} Um objeto com currentRevenue e currentExpenses.
 */
export async function getCurrentMonthFinancialSummary(userId: string): Promise<FinancialSummary> {
  console.log(`[financialSummaryService] Iniciando busca de resumo financeiro para userId: ${userId}`);
  if (!db) {
    console.error("[financialSummaryService] Firestore (db) não inicializado.");
    throw new Error("Firestore não inicializado.");
  }
  if (!userId) {
    console.error("[financialSummaryService] UserID é obrigatório.");
    throw new Error("UserID é obrigatório para buscar o resumo financeiro.");
  }

  const now = new Date();
  const firstDay = startOfMonth(now);
  const lastDay = endOfMonth(now);

  const startOfMonthTimestamp = Timestamp.fromDate(firstDay);
  const endOfMonthTimestamp = Timestamp.fromDate(lastDay);

  console.log(`[financialSummaryService] Consultando lançamentos entre: ${firstDay.toISOString()} e ${lastDay.toISOString()}`);

  let currentRevenue = 0;
  let currentExpenses = 0;
  let receitasEncontradasBruto = 0;
  let despesasEncontradasBruto = 0;
  let documentosValidosProcessados = 0;

  try {
    // Query para Receitas: tipo "RECEITA" e status "recebido"
    const qReceitas = query(
      collection(db, LANCAMENTOS_COLLECTION),
      where("userId", "==", userId),
      where("tipo", "==", "RECEITA"), // Estritamente "RECEITA" (singular, maiúsculas)
      where("status", "==", "recebido"), // Estritamente "recebido" (minúsculas)
      where("data", ">=", startOfMonthTimestamp),
      where("data", "<=", endOfMonthTimestamp)
    );

    // Query para Despesas: tipo "DESPESA" e status "pago"
    const qDespesas = query(
      collection(db, LANCAMENTOS_COLLECTION),
      where("userId", "==", userId),
      where("tipo", "==", "DESPESA"), // Estritamente "DESPESA" (singular, maiúsculas)
      where("status", "==", "pago"), // Estritamente "pago" (minúsculas)
      where("data", ">=", startOfMonthTimestamp),
      where("data", "<=", endOfMonthTimestamp)
    );

    const [receitasSnapshot, despesasSnapshot] = await Promise.all([
      getDocs(qReceitas),
      getDocs(qDespesas)
    ]);
    
    receitasEncontradasBruto = receitasSnapshot.size;
    despesasEncontradasBruto = despesasSnapshot.size;

    console.log(`[financialSummaryService] Firestore query: Encontradas ${receitasEncontradasBruto} receitas (com tipo: "RECEITA", status: "recebido").`);
    console.log(`[financialSummaryService] Firestore query: Encontradas ${despesasEncontradasBruto} despesas (com tipo: "DESPESA", status: "pago").`);

    if (receitasEncontradasBruto === 0 && despesasEncontradasBruto === 0) {
        console.warn(`[financialSummaryService] Nenhuma receita ou despesa relevante encontrada para o usuário ${userId} no período, conforme os critérios do guia.`);
    }

    const processDocument = (docSnap: DocumentData, docExpectedTipo: LancamentoTipo): number => {
      const rawData = docSnap.data();
      const docId = docSnap.id;

      console.log(`[financialSummaryService] Processando doc ID: ${docId}. Tipo esperado na query: ${docExpectedTipo}. Dados brutos do Firestore:`, JSON.parse(JSON.stringify(rawData)));
      console.log(`[financialSummaryService] Doc ID: ${docId}. Raw tipo: '${rawData.tipo}', Raw status: '${rawData.status}'.`);

      // Mapeamento e transformação para o schema interno
      const dataToValidate: any = {
        descricao: rawData.descricao || rawData.titulo || `Lançamento ${String(rawData.tipo).toLowerCase()}`,
        valor: typeof rawData.valor === 'number' ? rawData.valor : 0,
        data: rawData.data instanceof Timestamp ? rawData.data : 
              (rawData.data && typeof rawData.data.seconds === 'number' ? new Timestamp(rawData.data.seconds, rawData.data.nanoseconds || 0) : Timestamp.now()),
        
        // Normaliza 'tipo' para o enum esperado (RECEITA ou DESPESA)
        tipo: String(rawData.tipo).toUpperCase() === "RECEITA" ? "RECEITA" : 
              String(rawData.tipo).toUpperCase() === "DESPESA" ? "DESPESA" : 
              docExpectedTipo, // Fallback para o tipo esperado pela query se a normalização falhar (não deveria)

        // Converte 'status' para 'pago' (boolean)
        pago: (String(rawData.tipo).toUpperCase() === "RECEITA" && String(rawData.status).toLowerCase() === "recebido") ||
              (String(rawData.tipo).toUpperCase() === "DESPESA" && String(rawData.status).toLowerCase() === "pago"),

        // Campos BaseSchema (criadoEm/createdAt, atualizadoEm/updatedAt)
        id: docId,
        userId: rawData.userId || userId,
        createdAt: rawData.criadoEm instanceof Timestamp ? rawData.criadoEm :
                   (rawData.criadoEm && typeof rawData.criadoEm.seconds === 'number' ? new Timestamp(rawData.criadoEm.seconds, rawData.criadoEm.nanoseconds || 0) : Timestamp.now()),
        updatedAt: rawData.atualizadoEm instanceof Timestamp ? rawData.atualizadoEm :
                   (rawData.atualizadoEm && typeof rawData.atualizadoEm.seconds === 'number' ? new Timestamp(rawData.atualizadoEm.seconds, rawData.atualizadoEm.nanoseconds || 0) : Timestamp.now()),
      };
      
      console.log(`[financialSummaryService] Doc ID: ${docId}. Dados transformados para validação:`, JSON.parse(JSON.stringify(dataToValidate)));

      const validationResult = LancamentoFinanceiroSchema.safeParse(dataToValidate);
      
      if (validationResult.success) {
        const lancamento = validationResult.data;
        console.log(`[financialSummaryService] Doc ID: ${docId} (${lancamento.tipo}) - VÁLIDO. Valor: ${lancamento.valor}, 'pago' (schema): ${lancamento.pago}.`);
        documentosValidosProcessados++;
        return lancamento.valor; 
      } else {
        console.warn(`[financialSummaryService] Doc ID: ${docId} (${docExpectedTipo}) - INVÁLIDO após transformação. Erros Zod:`, JSON.stringify(validationResult.error.flatten(), null, 2));
        return 0;
      }
    };

    receitasSnapshot.forEach((doc) => {
      currentRevenue += processDocument(doc, "RECEITA");
    });

    despesasSnapshot.forEach((doc) => {
      currentExpenses += processDocument(doc, "DESPESA");
    });

    console.log(`[financialSummaryService] Total de documentos válidos e processados: ${documentosValidosProcessados} de ${receitasEncontradasBruto + despesasEncontradasBruto} documentos brutos encontrados pelos filtros da query.`);
    console.log(`[financialSummaryService] Resumo final calculado: Receita=${currentRevenue}, Despesas=${currentExpenses}`);
    return { currentRevenue, currentExpenses };

  } catch (error: any) {
    console.error("[financialSummaryService] Erro crítico ao buscar resumo financeiro:", error);
    let detailedErrorMessage = "Não foi possível buscar os dados financeiros. Tente novamente.";
    if (error.message) detailedErrorMessage += ` Detalhes: ${error.message}`;
    if (error.code) detailedErrorMessage += ` (Código: ${error.code})`;
    if (error.code === 'permission-denied') detailedErrorMessage += " Verifique as regras de segurança do Firestore.";
    else if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('index')) {
      detailedErrorMessage += " Um índice do Firestore pode ser necessário. Verifique os logs do console do Firebase para um link de criação de índice.";
    }
    throw new Error(detailedErrorMessage);
  }
}

    