
# Diretrizes para Salvamento de Dados no Ecossistema Gestor Maestro

**Data da Última Revisão:** 20 de Junho de 2025

Este documento fornece orientações essenciais para todos os aplicativos do ecossistema Gestor Maestro (Diagnóstico Maestro, Visão Clara Financeira, Maestro Operacional, etc.) sobre como os dados devem ser salvos no Firebase Firestore compartilhado. A adesão a estas diretrizes é crucial para garantir a consistência, integridade e interoperabilidade dos dados entre os módulos.

**Documentos de Referência Primária (Fontes da Verdade):**
1.  **`docs/BACKEND_GUIDE.md`**: Define os princípios gerais, como schemas Zod são a verdade, serviços são a ponte com o Firestore, e detalha as entidades geradas pelo Diagnóstico Maestro.
2.  **`docs/DETAILED_BACKEND_ARCHITECTURE.md`**: Detalha todas as coleções, seus propósitos, campos, operações e regras de segurança para o ecossistema.
3.  **`DATA_SYNC_CONFIG.json`**: Especifica as regras de acesso e formatos de ID para cada coleção, sendo a base para as `firestore.rules`.
4.  **`src/schemas/` (do aplicativo Diagnóstico Maestro ou do app que define a entidade "mestre")**: Contém as definições Zod para as coleções compartilhadas ou que servem de modelo. Outros apps devem referenciar ou replicar esses schemas para consistência.

## Princípios Chave para Salvamento de Dados

1.  **Aderência Estrita aos Schemas Zod:**
    *   Antes de qualquer operação de escrita (`create` ou `update`) no Firestore, os dados **DEVEM** ser validados usando o schema Zod correspondente à entidade (ex: `LancamentoFinanceiroCreateSchema`, `ClientUpdateSchema`).
    *   Isso garante que todos os campos obrigatórios estejam presentes, os tipos de dados estejam corretos e as restrições sejam respeitadas.
    *   Utilize o método `.parse()` ou `.safeParse()` do Zod para validação.

2.  **Campo `userId` Obrigatório:**
    *   Para a maioria das coleções, o campo `userId` **DEVE** ser incluído em cada documento. Este campo armazena o `uid` do usuário do Firebase Authentication que é o proprietário do dado.
    *   Este campo é fundamental para as regras de segurança do Firestore (`isResourceOwner`, `isRequestDataOwner`).

3.  **Timestamps do Servidor / Datas na Aplicação:**
    *   Para campos como `createdAt` e `updatedAt`, a camada de serviço (`firestoreService.ts` no Maestro Operacional) gerencia a criação de `Date` objects que são convertidos para `Timestamp` do Firestore na escrita e vice-versa na leitura.
    *   Os schemas Zod correspondentes (ex: `FirestoreTimestampSchema` em `commonSchemas.ts`) devem ser usados para validar esses campos como `Date` objects na lógica da aplicação.

4.  **Consistência de Nomes de Campos e Tipos:**
    *   Utilize exatamente os mesmos nomes de campos e tipos de dados definidos nos schemas Zod de referência (geralmente encontrados em `src/schemas/` do app que "possui" a definição mestre da entidade ou no `DETAILED_BACKEND_ARCHITECTURE.md`).
    *   Atenção especial a:
        *   **Enums**: Se um campo é um enum (ex: `tipo` em `lancamentosFinanceiros` que deve ser "RECEITA" ou "DESPESA"), use exatamente esses valores (maiúsculas, se assim definido no schema).
        *   **Booleanos**: Salve booleanos como `true` ou `false` nativos, não como strings "true" ou "false".
        *   **Números**: Salve números como tipo `number` do Firestore, não como strings.

## Foco Específico: Coleções Chave e Fluxos

### Coleção `lancamentosFinanceiros`

A coleção `lancamentosFinanceiros` é crítica para a integração entre o "Visão Clara Financeira" (que geralmente a cria ou consome intensamente) e o "Diagnóstico Maestro" (que a lê para preencher o formulário de metas), além de ser populada pelo "Maestro Operacional".

Para que a importação de dados na página `/goals` do "Diagnóstico Maestro" funcione corretamente e para consistência geral, cada documento na coleção `lancamentosFinanceiros` **DEVE** minimamente aderir à seguinte estrutura (baseado em um `LancamentoFinanceiroSchema` típico):

*   **`userId`** (string, obrigatório): UID do usuário proprietário.
*   **`titulo`** (string, obrigatório): Descrição breve (ex: "Venda Balcão #123", "Adiantamento OS #789", "Pagamento Final OS #789").
*   **`valor`** (number, obrigatório, positivo): Valor monetário. **Deve ser salvo como um número, não string.**
*   **`tipo`** (string, obrigatório): Deve ser **exatamente** `"receita"` ou `"despesa"` (conforme definido no schema `LancamentoTipoEnum`).
*   **`data`** (Timestamp do Firestore, obrigatório): Data do lançamento (representado como `Date` na aplicação antes da conversão).
*   **`categoria`** (string, obrigatório): Categoria (ex: "Venda Balcão", "Receita de OS", "Adiantamento OS").
*   **`status`** (string, obrigatório): Ex: "pago", "recebido", "pendente" (conforme `LancamentoStatusEnum`).
*   **`formaPagamento`** (string, opcional, nullable): Se o lançamento é uma receita e tem uma forma de pagamento associada (ex: adiantamento de OS, venda PDV, pagamento final de OS), este campo DEVE ser preenchido com os valores definidos no `FormaPagamentoEnum` (do schema `vendaSchema.ts` ou `ordemServicoSchema.ts`, por exemplo, "dinheiro", "pix", "cartao_credito", "boleto", "transferencia"). Isso é crucial para o resumo em `fechamentosCaixa`.
*   **`referenciaOSId`** (string, opcional, nullable): Se o lançamento estiver relacionado a uma Ordem de Serviço (ex: adiantamento, pagamento final).
*   **`vendaId`** (string, opcional, nullable): Se o lançamento originou de uma venda PDV.
*   **`createdAt`** (Timestamp do Firestore, obrigatório): Gerenciado pelo sistema/serviço.
*   **`updatedAt`** (Timestamp do Firestore, obrigatório): Gerenciado pelo sistema/serviço.

**Exemplo de Problema Comum e Solução:**

*   **Problema:** O Diagnóstico Maestro importa R$ 0,00 de receita e despesa, mesmo existindo lançamentos. O Fechamento de Caixa não mostra todas as formas de pagamento.
*   **Causa Provável:** Os documentos em `lancamentosFinanceiros` não passam na validação do `LancamentoFinanceiroSchema` usado pelos serviços de leitura ou os campos `formaPagamento` estão ausentes/incorretos.
*   **Solução (para Visão Clara Financeira e Maestro Operacional ao gerar lançamentos):**
    1.  **Consultar o Schema Mestre:** Verificar `LancamentoFinanceiroSchema` e os enums relevantes.
    2.  **Garantir a validação** com `LancamentoFinanceiroCreateSchema` ANTES de enviar os dados para o Firestore.
    3.  **Certificar-se** de que `valor`, `tipo`, `status` e, crucialmente, `formaPagamento` (para receitas) sejam salvos com os tipos e formatos corretos.

### Coleção `ordensServico`

*   **Adiantamentos:**
    *   Ao criar uma OS com `valorAdiantado > 0`, os seguintes campos devem ser preenchidos na OS:
        *   `formaPrimeiroPagamento`: String com a forma de pagamento do adiantamento (ex: "pix", "dinheiro").
        *   `dataPrimeiroPagamento`: `Date` (que será convertido para Timestamp) da data do adiantamento (geralmente a data atual).
        *   `valorPagoTotal`: Inicializado com o `valorAdiantado`.
        *   `statusPagamento`: Definido como "Pago Parcial" ou "Pago Total" com base no adiantamento em relação ao `valorTotal`.
    *   Um `lancamentoFinanceiro` (tipo "receita", status "recebido", categoria "Adiantamento OS", com `formaPagamento` e `referenciaOSId`) **DEVE** ser criado.

*   **Pagamentos Subsequentes/Finais:**
    *   Quando um pagamento adicional é registrado (ex: na conclusão da produção ou na tela de listagem de OS):
        *   `valorPagoTotal` na OS é incrementado.
        *   `statusPagamento` é atualizado (para "Pago Parcial" ou "Pago Total").
        *   `dataUltimoPagamento` e `formaUltimoPagamento` são registrados na OS com os dados do pagamento atual.
        *   Um `lancamentoFinanceiro` correspondente (tipo "receita", status "recebido", categoria "Receita de OS", com `formaPagamento` e `referenciaOSId`) **DEVE** ser criado.

### Coleção `fechamentosCaixa`

*   **Múltiplos Fechamentos:** São permitidos. O "Troco Inicial" sugerido deve ser o `saldoFinalCalculado` do *último* fechamento registrado, independentemente do dia.
*   **Entradas por Método:** O campo `entradasPorMetodo` agora inclui `boleto` e `transferenciaBancaria`. A lógica de cálculo no "Maestro Operacional" foi ajustada para agregar receitas de `lancamentosFinanceiros` e `vendas` (com ressalva sobre dupla contagem). Idealmente, todas as receitas deveriam gerar um `lancamentoFinanceiro` com `formaPagamento`, e `fechamentosCaixa` deveria ler apenas de `lancamentosFinanceiros`.

## Recomendações Gerais para Desenvolvedores/IAs dos Outros Módulos:

*   **Consultar os Documentos de Referência:** Antes de implementar qualquer funcionalidade que envolva dados compartilhados, consulte o `DETAILED_BACKEND_ARCHITECTURE.md`, `BACKEND_GUIDE.md` e o `DATA_SYNC_CONFIG.json`.
*   **Utilizar Serviços Dedicados:** Abstraia as interações com o Firestore em serviços (ex: `lancamentoFinanceiroService.ts`) que encapsulem a lógica de validação e comunicação com o banco, seguindo o padrão do `firestoreService.ts` quando aplicável.
*   **Testar a Integração:** Ao salvar dados que serão consumidos por outros apps, teste o fluxo de leitura nesses outros apps para garantir que a integração está funcionando conforme esperado.
*   **Comunicar Alterações de Schema:** Se for absolutamente necessário alterar a estrutura de uma coleção compartilhada, essa alteração deve ser discutida, documentada nos guias centrais, e comunicada a todos os aplicativos impactados para garantir uma migração coordenada.

Aderindo a estas diretrizes, podemos construir um ecossistema de aplicativos robusto, confiável e fácil de manter.

