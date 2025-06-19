
# 📊 Visão Clara Financeira - Resumo de Sincronização

## Coleção: `usuarios`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == docId`
- **ID baseado em**: auth.uid

## Coleção: `consultationsMetadata`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == docId`
- **ID baseado em**: auth.uid

## Coleção: `consultations`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `userGoals`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `lancamentosFinanceiros`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `metasFinanceiras`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == docId.split('_')[0]`
- **Formato do ID**: userId_anoMes

## Coleção: `vendas`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `ordensServico`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `agendamentos`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `clientes`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `ordensDeProducao`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `produtosServicos`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `fechamentosCaixa`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `contasPagar`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `contasReceber`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `custos`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

## Coleção: `custosFixosConfigurados`
- **Leitura**: Sim
- **Escrita**: Sim
- **Regra**: `request.auth.uid == resource.data.userId`

