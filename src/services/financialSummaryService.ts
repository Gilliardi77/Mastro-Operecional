
'use server';

import { getLancamentosByUserIdAndDateRange } from './lancamentoFinanceiroService';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { LancamentoFinanceiro } from '@/schemas/lancamentoFinanceiroSchema';

interface FinancialSummary {
  currentRevenue: number;
  currentExpenses: number;
}

export async function getCurrentMonthFinancialSummary(userId: string): Promise<FinancialSummary> {
  const now = new Date();
  const startDate = startOfMonth(now);
  const endDate = endOfMonth(now);

  try {
    const lancamentosDoMes: LancamentoFinanceiro[] = await getLancamentosByUserIdAndDateRange(userId, startDate, endDate);

    let currentRevenue = 0;
    let currentExpenses = 0;

    lancamentosDoMes.forEach(lancamento => {
      // The schema uses lowercase 'receita' and 'despesa'
      if (lancamento.tipo === 'receita' && lancamento.status === 'recebido') {
        currentRevenue += lancamento.valor;
      } else if (lancamento.tipo === 'despesa' && lancamento.status === 'pago') {
        currentExpenses += lancamento.valor;
      }
    });

    return {
      currentRevenue,
      currentExpenses,
    };
  } catch (error) {
    console.error("Erro ao calcular resumo financeiro do mês:", error);
    // Return a default empty summary in case of error to avoid breaking the calling page.
    return {
      currentRevenue: 0,
      currentExpenses: 0,
    };
  }
}
