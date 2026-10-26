# Padrões para Ignorar Transações Design Spec

Last updated: 2026-08-19
Requirements: docs/requirements/ignored-transaction-patterns.md

## Context

O modelo atual representa todo padrão como uma categorização, com descrição e categoria de destino obrigatórias. A avaliação usa a descrição original da transação, considera os padrões ativos do mais recente para o mais antigo e aplica somente a primeira correspondência; a nova capacidade preserva esse fluxo e acrescenta uma ação explícita de ignorar.

## Decisions

### D1: Uma ação explícita define o efeito do padrão

**Addresses:** REQ 1, 2, 3, 14
**Decision:** A tabela e o contrato de padrões terão a ação `categorize` ou `ignore`. Padrões existentes receberão `categorize`; descrição e categoria de destino serão opcionais apenas para `ignore`, com uma restrição de integridade que exige ambos para `categorize`. Os critérios de correspondência e o escopo por organização permanecem compartilhados.
**Trade-offs:** Um booleano `ignore_matches` manteria destinos artificiais obrigatórios, enquanto uma tabela separada duplicaria consulta, validação e ordenação. Uma ação explícita preserva uma única fonte de verdade e permite acrescentar outras ações somente quando houver requisito real.

### D2: A aplicação despacha pela ação depois da correspondência

**Addresses:** REQ 4, 6, 7, 12, 14
**Decision:** A avaliação continua buscando padrões ativos em ordem decrescente de criação e encerra após a primeira aplicação bem-sucedida. A ação `categorize` mantém o comportamento atual; a ação `ignore` altera somente `is_ignored` para verdadeiro e não consulta nem atualiza entradas planejadas, categoria, descrição, tags ou outros vínculos.
**Trade-offs:** Incorporar a ação dentro da lógica de correspondência misturaria critérios e efeitos. O despacho posterior mantém `matchesPattern` puro e concentra cada mutação no aplicador do padrão.

### D3: Padrões de ignorar são estritamente prospectivos

**Addresses:** REQ 5, 11, 12, 13
**Decision:** A criação ou edição de um padrão `ignore` força `apply_retroactively` para falso, e a operação explícita de aplicação retroativa rejeita esse tipo de padrão. Desativar, excluir ou editar o padrão não varre transações antigas; restauração continua sendo uma ação manual sobre a própria transação.
**Trade-offs:** Registrar a data de criação como filtro em toda consulta seria redundante porque padrões só são aplicados automaticamente quando uma transação entra no fluxo atual. Bloquear a rota retroativa cobre o único caminho existente que revisita transações antigas.

### D4: O formulário alterna campos conforme a ação

**Addresses:** REQ 1, 2, 3, 8, 9, 13
**Decision:** O editor de padrões recebe um seletor de ação. `categorize` mantém descrição de destino, categoria, vínculo com entrada planejada e a escolha retroativa; `ignore` oculta esses controles e envia apenas ação e critérios. Na criação originada de uma transação, `is_ignored` define a ação inicial; nas configurações, o padrão inicial continua sendo `categorize`.
**Trade-offs:** Dois formulários independentes repetiriam toda a experiência de critérios. Um único editor condicional preserva o fluxo conhecido e torna a diferença de efeito explícita.

### D5: A lista representa o tipo e limita ações incompatíveis

**Addresses:** REQ 10, 11, 12
**Decision:** Cada padrão `ignore` exibe um identificador visual de ação e não apresenta vínculos ou comandos de entrada planejada nem aplicação retroativa. Ativar, desativar, editar e excluir permanecem disponíveis e afetam apenas o padrão.

### D6: Contratos antigos continuam válidos

**Addresses:** REQ 1, 7, 8
**Decision:** A ausência de ação em dados anteriores é migrada e interpretada como `categorize`. Respostas sempre retornam a ação explícita; atualizações que mudam para `categorize` exigem destinos válidos, enquanto mudanças para `ignore` limpam os destinos para impedir estado contraditório.

## Traceability

| Requirement | Decisions |
|-------------|-----------|
| REQ 1 | D1, D4, D6 |
| REQ 2 | D1, D4 |
| REQ 3 | D1, D4 |
| REQ 4 | D2 |
| REQ 5 | D3 |
| REQ 6 | D2 |
| REQ 7 | D2, D6 |
| REQ 8 | D4, D6 |
| REQ 9 | D4 |
| REQ 10 | D5 |
| REQ 11 | D3, D5 |
| REQ 12 | D2, D3, D5 |
| REQ 13 | D3, D4 |
| REQ 14 | D1, D2 |
