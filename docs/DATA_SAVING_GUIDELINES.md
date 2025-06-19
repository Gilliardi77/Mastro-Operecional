
# Diretrizes para Salvamento de Dados no Ecossistema Gestor Maestro

**Data da Última Revisão:** 03 de Agosto de 2024

Este documento fornece orientações essenciais para todos os aplicativos do ecossistema Gestor Maestro (Diagnóstico Maestro, Visão Clara Financeira, Maestro Operacional, etc.) sobre como os dados devem ser salvos no Firebase Firestore compartilhado. A adesão a estas diretrizes é crucial para garantir a consistência, integridade e interoperabilidade dos dados entre os módulos.

**Documentos de Referência Primária (Fontes da Verdade):**
1.  **`DATA_INTERACTION_GUIDE.md`** (Este arquivo deverá ser `docs/BACKEND_GUIDE.md` conforme renomeamos/consolidamos): Define os princípios gerais, como schemas Zod são a verdade, serviços são a ponte com o Firestore, e detalha as entidades geradas pelo Diagnóstico Maestro.
2.  **`BACKEND_ARCHITECTURE_GUIDE.md`** (Este arquivo deverá ser `docs/DETAILED_BACKEND_ARCHITECTURE.md`): Detalha todas as coleções, seus propósitos, campos, operações e regras de segurança para o ecossistema.
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

## Foco Específico: Coleção `lancamentosFinanceiros`

A coleção `lancamentosFinanceiros` é crítica para a integração entre o "Visão Clara Financeira" (que geralmente a cria) e o "Diagnóstico Maestro" (que a lê para preencher o formulário de metas).

Para que a importação de dados na página `/goals` do "Diagnóstico Maestro" funcione corretamente, cada documento na coleção `lancamentosFinanceiros` **DEVE** minimamente aderir à seguinte estrutura (baseado em um `LancamentoFinanceiroSchema` típico):

*   **`userId`** (string, obrigatório): UID do usuário proprietário.
*   **`descricao`** (string, obrigatório): Descrição do lançamento.
*   **`valor`** (number, obrigatório, positivo): Valor monetário. **Deve ser salvo como um número, não string.**
*   **`data`** (Timestamp do Firestore, obrigatório): Data do lançamento (representado como `Date` na aplicação antes da conversão).
*   **`tipo`** (string, obrigatório): Deve ser **exatamente** `"RECEITA"` ou `"DESPESA"` (maiúsculas, conforme definido no schema de referência).
*   **`status`** (string, obrigatório, ex: "pago", "recebido", "pendente"): Indica se foi efetivado. O schema `LancamentoFinanceiroSchema` do app de Diagnóstico provavelmente espera um booleano `pago`. É crucial alinhar isso. Se `pago` for um campo booleano no app de Diagnóstico, então esta coleção deve salvar um campo `pago: boolean`.
*   **`categoria`** (string, opcional): Categoria.
*   **`createdAt`** (Timestamp do Firestore, obrigatório): Gerenciado pelo sistema/serviço.
*   **`updatedAt`** (Timestamp do Firestore, obrigatório): Gerenciado pelo sistema/serviço.

**Exemplo de Problema Comum e Solução:**

*   **Problema:** O Diagnóstico Maestro importa R$ 0,00 de receita e despesa, mesmo existindo lançamentos.
*   **Causa Provável:** Os documentos em `lancamentosFinanceiros` não passam na validação do `LancamentoFinanceiroSchema` usado pelo `financialSummaryService.ts` do Diagnóstico Maestro. Isso geralmente ocorre porque:
    *   O campo `valor` está como string em vez de número.
    *   O campo `tipo` está como "receita" (minúsculo) em vez de "RECEITA" (maiúsculo, ou o valor esperado pelo enum do schema).
    *   Um campo esperado como `pago` (booleano) está como string ("true"), ou com um nome diferente (ex: `status` vs `pago`), ou está ausente e a validação falha.
    *   Campos obrigatórios como `descricao` ou `data` estão ausentes.

*   **Solução (para Visão Clara Financeira e Maestro Operacional ao gerar lançamentos):**
    1.  **Consultar o Schema Mestre:** Verificar o `LancamentoFinanceiroSchema` no app de Diagnóstico ou no `DETAILED_BACKEND_ARCHITECTURE.md` para a estrutura exata esperada.
    2.  **Revisar a lógica de salvamento** de lançamentos financeiros nos apps que os criam.
    3.  **Garantir a validação** com um schema Zod compatível (ex: `LancamentoFinanceiroCreateSchema`) ANTES de enviar os dados para o Firestore.
    4.  **Certificar-se** de que os campos `valor`, `tipo`, `pago` (ou seu equivalente booleano) sejam salvos com os tipos e formatos corretos.
    5.  **Incluir todos os campos obrigatórios** (`userId`, `descricao`, `data`, `tipo`, `valor`, e o campo booleano de status de pagamento).

## Recomendações Gerais para Desenvolvedores/IAs dos Outros Módulos:

*   **Consultar os Documentos de Referência:** Antes de implementar qualquer funcionalidade que envolva dados compartilhados, consulte o `DETAILED_BACKEND_ARCHITECTURE.md`, `BACKEND_GUIDE.md` (ou como for nomeado o guia de interação) e o `DATA_SYNC_CONFIG.json`.
*   **Utilizar Serviços Dedicados:** Abstraia as interações com o Firestore em serviços (ex: `lancamentoFinanceiroService.ts`) que encapsulem a lógica de validação e comunicação com o banco, seguindo o padrão do `firestoreService.ts` quando aplicável.
*   **Testar a Integração:** Ao salvar dados que serão consumidos por outros apps, teste o fluxo de leitura nesses outros apps para garantir que a integração está funcionando conforme esperado.
*   **Comunicar Alterações de Schema:** Se for absolutamente necessário alterar la estrutura de uma coleção compartilhada, essa alteração deve ser discutida, documentada nos guias centrais, e comunicada a todos os aplicativos impactados para garantir uma migração coordenada.

Aderindo a estas diretrizes, podemos construir um ecossistema de aplicativos robusto, confiável e fácil de manter.

    