
'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import LancamentosSection from '@/components/financeiro/LancamentosSection'
import PlanejamentoCustosSection from '@/components/financeiro/PlanejamentoCustosSection'

const PainelFinanceiro = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-headline font-bold text-primary">Painel Financeiro</CardTitle>
          <CardDescription>Gestão unificada de lançamentos, contas a pagar e planejamento de custos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="lancamentos" className="w-full">
            <TabsList className="grid w-full grid-cols-2 gap-1">
              <TabsTrigger value="lancamentos">Lançamentos e Contas</TabsTrigger>
              <TabsTrigger value="planejamento-custos">Planejamento de Custos Fixos</TabsTrigger>
            </TabsList>
            <TabsContent value="lancamentos">
              <LancamentosSection />
            </TabsContent>
            <TabsContent value="planejamento-custos">
              <PlanejamentoCustosSection />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default PainelFinanceiro
