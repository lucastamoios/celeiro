# Proposta: Navegacao Lateral (Sidebar)

## Contexto

Este documento avalia se a migracao de **top navigation** (atual) para **sidebar navigation** e justificada para o Celeiro.

## Analise Comparativa

### Top Navigation (Atual)

```
+------------------------------------------------------------------+
| Celeiro | Transacoes | Orcamentos | Padroes | Categorias | Metas | [Sair]
+------------------------------------------------------------------+
|                                                                  |
|                         CONTEUDO                                 |
|                                                                  |
+------------------------------------------------------------------+
```

**Caracteristicas**:
- Ocupa ~64px de altura
- Todo espaco horizontal para conteudo
- Familiar para usuarios web
- Simples de implementar

### Sidebar Navigation (Proposta)

```
+--------+----------------------------------------------------------+
| Logo   |                                                          |
+--------+                                                          |
| Trans. |                                                          |
| Orcam. |                      CONTEUDO                            |
| Padroe |                                                          |
| Catego |                                                          |
| Metas  |                                                          |
+--------+                                                          |
| Sair   |                                                          |
+--------+----------------------------------------------------------+
```

**Caracteristicas**:
- Ocupa ~200-250px de largura
- Mais espaco vertical para conteudo
- Padrao em apps financeiros modernos
- Permite hierarquia e agrupamento

## Criterios de Avaliacao

### 1. Numero de Itens de Menu

| Navegacao | Limite Confortavel | Celeiro Atual |
|-----------|-------------------|---------------|
| Top Nav | 5-7 itens | 6 itens |
| Sidebar | 15-20 itens | 6 itens |

**Veredicto**: Top Nav ainda comporta os itens atuais.

### 2. Necessidade de Sub-menus

| Funcionalidade | Tem Sub-menus? |
|----------------|----------------|
| Transacoes | Nao |
| Orcamentos | Nao |
| Padroes | Nao |
| Categorias | Nao |
| Metas | Nao |

**Veredicto**: Nao ha necessidade de hierarquia atualmente.

### 3. Badges e Contadores

| Item | Precisa Badge? | Top Nav Suporta? |
|------|----------------|------------------|
| Transacoes Nao Categorizadas | Sim | Sim (com ajustes) |
| Outros | Nao | - |

**Veredicto**: Top Nav pode suportar o badge necessario.

### 4. Espaco de Tela

**Top Nav**:
- Altura ocupada: 64px fixo
- Largura util: 100%
- Ideal para tabelas largas (transacoes)

**Sidebar**:
- Largura ocupada: 200-250px
- Altura util: 100%
- Perde espaco horizontal

Para o Celeiro, onde a **tabela de transacoes** e o elemento principal, manter largura maxima e preferivel.

### 5. Padrao do Setor

| App Financeiro | Tipo de Navegacao |
|----------------|-------------------|
| Nubank | Sidebar (mobile: bottom tabs) |
| Inter | Sidebar |
| Itau | Top Nav + Sidebar hibrido |
| YNAB | Sidebar |
| Mint | Top Nav |
| Mobills | Bottom tabs (mobile) |

**Veredicto**: Sidebar e comum, mas Top Nav tambem e aceitavel.

### 6. Responsividade Mobile

**Top Nav**:
- Precisa colapsar para hamburguer
- Ou converter para bottom tabs
- Implementacao: media (4-6h)

**Sidebar**:
- Precisa colapsar para overlay
- Ou converter para bottom tabs
- Implementacao: media (4-6h)

**Veredicto**: Complexidade similar.

## Recomendacao

### Decisao: Manter Top Navigation

Para o estado atual do Celeiro, a **top navigation** e suficiente e adequada pelos seguintes motivos:

1. **6 itens cabem confortavelmente** no top nav
2. **Nao ha sub-menus** que justifiquem sidebar
3. **Tabelas precisam de largura** - sidebar roubaria espaco
4. **Menos trabalho de migracao** - foco em melhorias incrementais

### Quando Reconsiderar Sidebar

Migrar para sidebar SE:

- [ ] Numero de secoes ultrapassar 8
- [ ] Necessidade de agrupamento hierarquico surgir
- [ ] Novo dominio exigir sub-menus (ex: Configuracoes > Perfil, Notificacoes, etc)
- [ ] Feedback de usuarios indicar confusao na navegacao

## Melhorias no Top Nav Atual

Em vez de migrar para sidebar, recomendo estas melhorias:

### 1. Adicionar "Nao Categorizadas" ao Menu

```
+--------------------------------------------------------------------------+
| Celeiro | Transacoes | Pendentes (12) | Orcamentos | Padroes | ... | [Sair]
+--------------------------------------------------------------------------+
```

**Implementacao**:
```typescript
// App.tsx - adicionar botao com badge
<button onClick={() => setCurrentView('uncategorized')}>
  Pendentes
  {uncategorizedCount > 0 && (
    <span className="badge">{uncategorizedCount}</span>
  )}
</button>
```

### 2. Agrupar Visualmente

```
+--------------------------------------------------------------------------+
| Celeiro | [Transacoes | Pendentes] | [Orcamentos | Metas] | [Padroes | Categorias] | [Sair]
+--------------------------------------------------------------------------+
```

Grupos sugeridos:
- **Movimentacao**: Transacoes, Pendentes
- **Planejamento**: Orcamentos, Metas
- **Configuracao**: Padroes, Categorias

### 3. Atalhos de Teclado

| Atalho | Acao |
|--------|------|
| `1` | Dashboard |
| `2` | Transacoes |
| `3` | Pendentes (Nao Categorizadas) |
| `4` | Orcamentos |
| `5` | Padroes |
| `6` | Categorias |
| `7` | Metas |

**Implementacao**:
```typescript
// App.tsx ou hook dedicado
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return; // Ignora em inputs

    const viewMap: Record<string, View> = {
      '1': 'dashboard',
      '2': 'transactions',
      '3': 'uncategorized',
      '4': 'budgets',
      '5': 'patterns',
      '6': 'categories',
      '7': 'goals',
    };

    if (viewMap[e.key]) {
      e.preventDefault();
      setCurrentView(viewMap[e.key]);
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

### 4. Tooltip com Atalho

```typescript
<button
  onClick={() => setCurrentView('transactions')}
  title="Transacoes (2)" // Mostra atalho
>
  Transacoes
</button>
```

### 5. Indicador de Pagina Atual

Adicionar `aria-current="page"` para acessibilidade:

```typescript
<button
  onClick={() => setCurrentView('transactions')}
  aria-current={currentView === 'transactions' ? 'page' : undefined}
  className={currentView === 'transactions' ? 'active' : ''}
>
  Transacoes
</button>
```

## Prototipo: Top Nav Melhorado

### Antes

```
+------------------------------------------------------------------+
| Celeiro | Transacoes | Orcamentos | Padroes | Categorias | Metas | [Sair]
+------------------------------------------------------------------+
```

- Sem indicacao de pendencias
- Sem atalhos
- View oculta

### Depois

```
+------------------------------------------------------------------------------+
| Celeiro | Transacoes | Pendentes (12) | Orcamentos | Metas | Padroes | Categorias | [Sair]
+------------------------------------------------------------------------------+
         ^             ^
         |             |
    [Atalho: 2]   [Atalho: 3, Badge vermelho]
```

- Badge mostra contagem
- Atalhos visiveis em tooltip
- Todas as views acessiveis

## Implementacao por Prioridade

### Fase 1: Quick Wins (30 min)

1. Adicionar botao "Pendentes" ao menu
2. Adicionar `aria-current` para acessibilidade
3. Melhorar estilo do item ativo

### Fase 2: Badges (1h)

1. Criar estado para contar transacoes pendentes
2. Adicionar badge ao botao "Pendentes"
3. Estilizar badge (vermelho/laranja, arredondado)

### Fase 3: Atalhos (2h)

1. Implementar hook `useKeyboardNavigation`
2. Adicionar tooltips com atalhos
3. Documentar atalhos em ajuda/onboarding

### Fase 4: Mobile (4h)

1. Detectar tela pequena via media query
2. Colapsar menu para hamburguer
3. Implementar drawer/overlay
4. OU converter para bottom tabs

## Conclusao

A **top navigation atual e adequada** para o Celeiro no estado atual. O esforco deve ser direcionado para:

1. **Exposicao**: Adicionar "Pendentes" ao menu
2. **Eficiencia**: Implementar atalhos de teclado
3. **Feedback**: Badges com contagem
4. **Acessibilidade**: `aria-current`, tooltips

A migracao para sidebar so deve ser considerada quando houver crescimento significativo de funcionalidades ou feedback negativo de usuarios sobre a navegacao atual.

## Referencias

- [Nielsen Norman Group: Top Navigation vs Left Navigation](https://www.nngroup.com/articles/horizontal-vs-vertical-navigation/)
- [Baymard Institute: E-Commerce Navigation](https://baymard.com/blog/horizontal-vs-vertical-category-navigation)
- [Material Design: Navigation Patterns](https://material.io/design/navigation/understanding-navigation.html)
