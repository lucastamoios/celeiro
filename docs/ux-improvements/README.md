# Analise UX - Celeiro

## Sumario Executivo

Esta analise avalia a estrutura de navegacao atual do sistema Celeiro e propoe melhorias focadas em **reduzir cliques, decisoes e aumentar a velocidade** do usuario ao categorizar despesas.

### Decisao Principal: Manter Top Navigation

Apos analise detalhada, a recomendacao e **manter a navegacao horizontal superior** com melhorias incrementais. A migracao para sidebar nao se justifica no momento porque:

1. O numero de itens (6) ainda cabe confortavelmente no top nav
2. Nao ha necessidade de sub-menus ou hierarquia
3. Tabelas de transacoes precisam de largura maxima
4. O esforco de migracao seria alto com beneficio limitado

### Visao Geral

| Metrica | Estado Atual |
|---------|--------------|
| Tipo de Navegacao | Top Navigation Bar (horizontal) |
| Itens de Menu | 6 (Dashboard, Transacoes, Orcamentos, Padroes, Categorias, Metas) |
| View Oculta | "Nao Categorizadas" - so acessivel via Dashboard |
| Atalhos de Teclado | Nenhum implementado |
| Responsividade Mobile | Parcial (sem menu hamburguer) |

### Descobertas Principais

1. **View Critica Escondida** - "Transacoes Nao Categorizadas" nao aparece no menu
2. **Fluxo de Categorizacao Ineficiente** - 4-5 cliques por transacao
3. **Ausencia Total de Atalhos** - Nenhum atalho de teclado para acoes frequentes
4. **Modal Obrigatorio** - Categorizacao requer abrir/fechar modal
5. **Contexto Perdido** - Navegacao entre secoes perde filtros/mes

### Documentacao Detalhada

| Fluxo | Documento | Prioridade | Status |
|-------|-----------|------------|--------|
| Estrutura de Navegacao | [navegacao-atual.md](./navegacao-atual.md) | Critica | Completo |
| Categorizacao de Transacoes | [fluxo-categorizacao.md](./fluxo-categorizacao.md) | Alta | Completo |
| Avaliacao Sidebar vs Top Nav | [proposta-sidebar.md](./proposta-sidebar.md) | Media | Completo |

### Metricas de Friccao

#### Fluxo: Categorizar Transacao (do Dashboard)
- **Cliques Atuais**: 4-5 cliques
- **Decisoes**: 2 (localizar transacao, selecionar categoria)
- **Tempo Estimado**: ~8-12 segundos por transacao
- **Meta**: 2 cliques, ~4 segundos

#### Fluxo: Criar Padrao a partir de Transacao
- **Cliques Atuais**: 6+ cliques
- **Decisoes**: 4+ (categoria, regex, valores, confirmacao)
- **Tempo Estimado**: ~30-60 segundos

### Quick Wins Identificados

**Altissima Prioridade (< 30 min de trabalho):**

1. [ ] **Adicionar "Pendentes" ao menu** - View critica esta escondida
2. [ ] Implementar `Escape` para fechar modais
3. [ ] Implementar `Enter` para confirmar acao primaria

**Alta Prioridade (1-2h de trabalho):**

4. [ ] Adicionar badge com contagem de pendentes no menu
5. [ ] Auto-focus no dropdown de categoria ao abrir modal
6. [ ] Adicionar `aria-current="page"` para acessibilidade

**Media Prioridade (2-4h de trabalho):**

7. [ ] Atalhos numericos (1-7) para navegacao entre views
8. [ ] Tooltips mostrando atalhos de teclado
9. [ ] Persistir filtro de mes via URL params

### Screenshots de Referencia

Os screenshots da analise estao em: `.playwright-mcp/ux-analysis/`

| Screenshot | Descricao |
|------------|-----------|
| `01-dashboard.png` | Tela inicial com resumo financeiro |
| `02-transactions.png` | Lista de transacoes |
| `03-budgets.png` | Dashboard de orcamentos |
| `04-patterns.png` | Gerenciador de padroes |
| `05-categories.png` | Gerenciador de categorias |
| `06-goals.png` | Metas de poupanca |
| `07-uncategorized-transactions.png` | Transacoes nao categorizadas |
| `08-edit-transaction-modal.png` | Modal de edicao de transacao |
| `09-advanced-pattern-modal.png` | Modal de criacao de padrao avancado |

### Proximos Passos Recomendados

1. **Imediato**: Adicionar botao "Pendentes" ao menu com badge
2. **Curto prazo**: Implementar Enter/Escape nos modais
3. **Medio prazo**: Avaliar dropdown inline vs modal para categorizacao
4. **Longo prazo**: Considerar sidebar se numero de features crescer significativamente

---

*Analise realizada em: 2025-12-30*
*Versao do Sistema: Celeiro v1.0*
*Metodologia: Exploracao via Playwright + Analise de Codigo*
