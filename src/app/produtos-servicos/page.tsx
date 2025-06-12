// Otimizado e corrigido: ProdutosServicosPage
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection, query, where, getDocs, Timestamp, orderBy, limit
} from 'firebase/firestore';
import { useAuth } from '@/components/auth/auth-provider';
import { db } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays, PlusCircle, BarChart3, Users,
  Package, Settings, ActivitySquare, ListOrdered,
  CheckCircle, AlertTriangle
} from 'lucide-react';

interface AgendamentoResumo {
  id: string;
  clienteNome: string;
  servicoNome: string;
  dataHora: Date;
  status: string;
}

interface ResumoOperacional {
  osConcluidasHoje: number;
  vendasHojeValor: number;
  osAtrasadas: number;
}

export default function ProdutosServicosPage() {
  const { user } = useAuth();
  const [agendaHoje, setAgendaHoje] = useState<AgendamentoResumo[]>([]);
  const [resumoOperacional, setResumoOperacional] = useState<ResumoOperacional>({
    osConcluidasHoje: 0,
    vendasHojeValor: 0,
    osAtrasadas: 0,
  });
  const [loading, setLoading] = useState({ agenda: true, resumo: true });

  const userId = user?.uid || 'bypass_user_placeholder';

  const getStatusClass = (status: string): string => {
    const map: Record<string, string> = {
      Pendente: 'border-blue-500 bg-blue-50 text-blue-700',
      'Em Andamento': 'border-yellow-500 bg-yellow-50 text-yellow-700',
      Concluído: 'border-green-500 bg-green-50 text-green-700',
      Cancelado: 'border-red-500 bg-red-50 text-red-700',
    };
    return map[status] || 'border-gray-500 bg-gray-50 text-gray-700';
  };

  const fetchAgendaHoje = useCallback(async () => {
    setLoading(prev => ({ ...prev, agenda: true }));
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      const q = query(
        collection(db!, 'agendamentos'),
        where('userId', '==', userId),
        where('dataHora', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataHora', '<=', Timestamp.fromDate(hojeFim)),
        orderBy('dataHora', 'asc'),
        limit(3)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        dataHora: (doc.data().dataHora as Timestamp).toDate(),
      })) as AgendamentoResumo[];
      setAgendaHoje(data);
    } catch (e) {
      console.error('Erro na agenda:', e);
    } finally {
      setLoading(prev => ({ ...prev, agenda: false }));
    }
  }, [userId]);

  const fetchResumo = useCallback(async () => {
    setLoading(prev => ({ ...prev, resumo: true }));
    try {
      const hojeInicio = startOfDay(new Date());
      const hojeFim = endOfDay(new Date());
      let osConcluidasHoje = 0, vendasHojeValor = 0, osAtrasadas = 0;

      const osSnap = await getDocs(query(
        collection(db!, 'ordensServico'),
        where('userId', '==', userId),
        where('status', '==', 'Concluído')
      ));
      osSnap.forEach(doc => {
        const d = doc.data();
        const atual = (d.atualizadoEm as Timestamp).toDate();
        if (atual >= hojeInicio && atual <= hojeFim) osConcluidasHoje++;
      });

      const vendasSnap = await getDocs(query(
        collection(db!, 'vendas'),
        where('userId', '==', userId),
        where('dataVenda', '>=', Timestamp.fromDate(hojeInicio)),
        where('dataVenda', '<=', Timestamp.fromDate(hojeFim))
      ));
      vendasSnap.forEach(doc => vendasHojeValor += doc.data().totalVenda);

      const atrasadasSnap = await getDocs(query(
        collection(db!, 'ordensServico'),
        where('userId', '==', userId),
        where('dataEntrega', '<', Timestamp.fromDate(hojeInicio))
      ));
      atrasadasSnap.forEach(doc => {
        const status = doc.data().status;
        if (['Pendente', 'Em Andamento'].includes(status)) osAtrasadas++;
      });

      setResumoOperacional({ osConcluidasHoje, vendasHojeValor, osAtrasadas });
    } catch (e) {
      console.error('Erro resumo operacional:', e);
    } finally {
      setLoading(prev => ({ ...prev, resumo: false }));
    }
  }, [userId]);

  useEffect(() => {
    fetchAgendaHoje();
    fetchResumo();
  }, [fetchAgendaHoje, fetchResumo]);

  return (
    <div className="space-y-8">
      <section className="text-center">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">Módulo Produtos + Serviços</h2>
        <p className="mt-4 text-lg text-muted-foreground">Gestão completa de atendimentos, orçamentos, ordens de serviço e mais.</p>
      </section>

      {/* Demais componentes de UI mantidos como estão, pois não causam erro */}
      {/* ... */}
    </div>
  );
}
