# Budget Page Redesign

> The YNAB-inspired command center for intentional spending

## Current Problems

1. **Monthly overload** - Multiple months shown with equal prominence
2. **Category card chaos** - Each category a different color
3. **Status unclear** - Hard to see overall budget health
4. **Too many numbers** - Planned, spent, available all competing

## Design Philosophy

Following the YNAB principle: **"Give every real/dollar a job"**

The budget view should answer:
1. **"Am I on track this month?"** - Overall status (2 seconds)
2. **"Where am I over/under?"** - Category status (5 seconds)
3. **"What are my planned expenses?"** - Detailed breakdown (on demand)

---

## Page Layout

### Single Month Focus

Unlike the current multi-month view, focus on **one month at a time**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Orçamento                                                                  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ← Novembro    DEZEMBRO 2025    Janeiro →                           │   │
│  │                                                                      │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │   │
│  │  │ 💰 Planejado   │ │ 📤 Gasto       │ │ 📊 Disponível  │          │   │
│  │  │ R$ 4.500,00    │ │ R$ 3.500,00    │ │ R$ 1.000,00    │          │   │
│  │  │                │ │ 78% do plano   │ │ +22% sobrando  │          │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘          │   │
│  │                                                                      │   │
│  │  [════════════════════════════════════░░░░░░░░░░] 78%               │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏷️ CATEGORIAS                                     [+ Criar categoria]│   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                      │   │
│  │  🍽️ Alimentação          R$ 1.200 / R$ 1.500   [▓▓▓▓▓▓▓▓░░] 80%   ✓  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  🚗 Transporte            R$ 450 / R$ 500     [▓▓▓▓▓▓▓▓▓░] 90%   ⚠  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  🏠 Moradia              R$ 1.500 / R$ 1.500  [▓▓▓▓▓▓▓▓▓▓] 100%  ⚠  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  ❤️ Saúde                 R$ 350 / R$ 600     [▓▓▓▓▓░░░░░] 58%   ✓  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  🎓 Educação              R$ 0 / R$ 200       [░░░░░░░░░░] 0%    ✓  │   │
│  │  ─────────────────────────────────────────────────────────────────   │   │
│  │  🎮 Lazer                 R$ 200 / R$ 150     [▓▓▓▓▓▓▓▓▓▓▓] 133% ✗  │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Month Navigator Header

```tsx
function BudgetMonthHeader({ month, year, onPrev, onNext, summary }) {
  const { planned, spent, available } = summary;
  const percentUsed = (spent / planned) * 100;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm p-6">
      {/* Month navigation */}
      <div className="flex items-center justify-center gap-6 mb-8">
        <button
          onClick={onPrev}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="text-body-sm">{getPrevMonthName(month, year)}</span>
        </button>

        <h2 className="text-h1 text-stone-900 uppercase tracking-wide">
          {formatMonthYear(month, year)}
        </h2>

        <button
          onClick={onNext}
          className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <span className="text-body-sm">{getNextMonthName(month, year)}</span>
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <p className="text-caption text-stone-500 mb-1">💰 Planejado</p>
          <p className="text-h2 text-stone-900 tabular-nums">{formatCurrency(planned)}</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-stone-500 mb-1">📤 Gasto</p>
          <p className="text-h2 text-stone-700 tabular-nums">{formatCurrency(spent)}</p>
          <p className="text-tiny text-stone-400">{Math.round(percentUsed)}% do plano</p>
        </div>
        <div className="text-center">
          <p className="text-caption text-stone-500 mb-1">📊 Disponível</p>
          <p className={`text-h2 tabular-nums ${available >= 0 ? 'text-sage-600' : 'text-rust-600'}`}>
            {formatCurrency(available)}
          </p>
          <p className="text-tiny text-stone-400">
            {available >= 0 ? `+${Math.round((available/planned)*100)}% sobrando` : 'acima do plano'}
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="max-w-lg mx-auto">
        <div className="w-full bg-stone-200 rounded-full h-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              percentUsed > 100 ? 'bg-rust-500' :
              percentUsed > 85 ? 'bg-terra-500' : 'bg-sage-500'
            }`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Category Budget Row (Simplified)

No more colorful cards. Clean list with status indicators:

```tsx
interface CategoryBudgetRowProps {
  category: Category;
  budget: number;
  spent: number;
  onEdit: () => void;
  onExpand: () => void;
  isExpanded: boolean;
}

function CategoryBudgetRow({
  category,
  budget,
  spent,
  onEdit,
  onExpand,
  isExpanded
}: CategoryBudgetRowProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : 0;
  const available = budget - spent;

  const getStatus = () => {
    if (percentage > 100) return 'over';
    if (percentage > 85) return 'warning';
    return 'ok';
  };

  const status = getStatus();

  return (
    <div className="border-b border-stone-100 last:border-0">
      <div
        className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors cursor-pointer"
        onClick={onExpand}
      >
        {/* Category icon */}
        <span className="text-2xl w-10 text-center">{category.icon}</span>

        {/* Category info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-body font-medium text-stone-900">
              {category.name}
            </span>
            <span className="text-body-sm text-stone-600 tabular-nums">
              {formatCurrency(spent)} / {formatCurrency(budget)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-stone-200 rounded-full h-2">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'over' ? 'bg-rust-500' :
                status === 'warning' ? 'bg-terra-500' : 'bg-sage-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>

        {/* Percentage & status */}
        <div className="flex items-center gap-3 w-24 justify-end">
          <span className={`text-body-sm tabular-nums ${
            status === 'over' ? 'text-rust-600' :
            status === 'warning' ? 'text-terra-600' : 'text-stone-600'
          }`}>
            {Math.round(percentage)}%
          </span>
          {status === 'ok' && <CheckIcon className="h-4 w-4 text-sage-500" />}
          {status === 'warning' && <ExclamationIcon className="h-4 w-4 text-terra-500" />}
          {status === 'over' && <XCircleIcon className="h-4 w-4 text-rust-500" />}
        </div>

        {/* Expand indicator */}
        <ChevronDownIcon className={`
          h-5 w-5 text-stone-400 transition-transform
          ${isExpanded ? 'rotate-180' : ''}
        `} />
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pl-16 bg-stone-50">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className="text-tiny text-stone-500">Orçamento</p>
              <p className="text-body font-medium text-stone-700 tabular-nums">
                {formatCurrency(budget)}
              </p>
            </div>
            <div>
              <p className="text-tiny text-stone-500">Gasto</p>
              <p className="text-body font-medium text-stone-700 tabular-nums">
                {formatCurrency(spent)}
              </p>
            </div>
            <div>
              <p className="text-tiny text-stone-500">Disponível</p>
              <p className={`text-body font-medium tabular-nums ${
                available >= 0 ? 'text-sage-600' : 'text-rust-600'
              }`}>
                {formatCurrency(available)}
              </p>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="space-y-2">
            <p className="text-tiny text-stone-500 uppercase">Últimas transações</p>
            {/* Transaction list would go here */}
          </div>

          {/* Edit button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-body-sm text-wheat-600 hover:text-wheat-700 font-medium"
            >
              Editar orçamento →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Budget Edit Modal

```tsx
function BudgetEditModal({ category, currentBudget, onSave, onClose }) {
  const [budgetType, setBudgetType] = useState(currentBudget.type || 'fixed');
  const [amount, setAmount] = useState(currentBudget.amount || 0);
  const [plannedItems, setPlannedItems] = useState(currentBudget.items || []);

  return (
    <Modal onClose={onClose} title={`Orçamento: ${category.icon} ${category.name}`}>
      <div className="space-y-6">
        {/* Budget type selection */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-3 block">
            Tipo de orçamento
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setBudgetType('fixed')}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${budgetType === 'fixed'
                  ? 'border-wheat-500 bg-wheat-50'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
            >
              <p className="text-body font-medium text-stone-900">Fixo</p>
              <p className="text-tiny text-stone-500 mt-1">Valor definido</p>
            </button>
            <button
              onClick={() => setBudgetType('calculated')}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${budgetType === 'calculated'
                  ? 'border-wheat-500 bg-wheat-50'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
            >
              <p className="text-body font-medium text-stone-900">Calculado</p>
              <p className="text-tiny text-stone-500 mt-1">Soma dos itens</p>
            </button>
            <button
              onClick={() => setBudgetType('hybrid')}
              className={`
                p-4 rounded-lg border-2 text-center transition-all
                ${budgetType === 'hybrid'
                  ? 'border-wheat-500 bg-wheat-50'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
            >
              <p className="text-body font-medium text-stone-900">Maior</p>
              <p className="text-tiny text-stone-500 mt-1">Fixo ou soma</p>
            </button>
          </div>
        </div>

        {/* Fixed amount (for fixed and hybrid) */}
        {(budgetType === 'fixed' || budgetType === 'hybrid') && (
          <div>
            <label className="text-caption text-stone-700 font-medium mb-2 block">
              Valor do orçamento
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={formatNumberInput(amount)}
                onChange={(e) => setAmount(parseNumberInput(e.target.value))}
                className="w-full pl-12 pr-4 py-2.5 border border-stone-300 rounded-lg text-body tabular-nums text-right"
              />
            </div>
          </div>
        )}

        {/* Planned items (for calculated and hybrid) */}
        {(budgetType === 'calculated' || budgetType === 'hybrid') && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-caption text-stone-700 font-medium">
                Itens planejados
              </label>
              <button
                onClick={() => setPlannedItems([...plannedItems, { name: '', amount: 0 }])}
                className="text-body-sm text-wheat-600 hover:text-wheat-700"
              >
                + Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {plannedItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Nome do item"
                    value={item.name}
                    onChange={(e) => {
                      const updated = [...plannedItems];
                      updated[index].name = e.target.value;
                      setPlannedItems(updated);
                    }}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-body-sm"
                  />
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberInput(item.amount)}
                      onChange={(e) => {
                        const updated = [...plannedItems];
                        updated[index].amount = parseNumberInput(e.target.value);
                        setPlannedItems(updated);
                      }}
                      className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg text-body-sm tabular-nums text-right"
                    />
                  </div>
                  <button
                    onClick={() => setPlannedItems(plannedItems.filter((_, i) => i !== index))}
                    className="p-2 text-stone-400 hover:text-rust-500 hover:bg-rust-50 rounded-lg"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Items total */}
            {plannedItems.length > 0 && (
              <div className="mt-3 pt-3 border-t border-stone-200 flex justify-between">
                <span className="text-body-sm text-stone-500">Total dos itens:</span>
                <span className="text-body font-medium text-stone-700 tabular-nums">
                  {formatCurrency(plannedItems.reduce((sum, item) => sum + item.amount, 0))}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Final budget preview */}
        <div className="p-4 bg-wheat-50 rounded-lg border border-wheat-200">
          <p className="text-caption text-stone-600 mb-1">Orçamento final:</p>
          <p className="text-h2 text-stone-900 tabular-nums">
            {formatCurrency(calculateFinalBudget(budgetType, amount, plannedItems))}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave({ type: budgetType, amount, items: plannedItems })}
          className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg"
        >
          Salvar
        </button>
      </div>
    </Modal>
  );
}
```

---

## Status Indicators

### Visual Language

| Status | Percentage | Color | Icon | Message |
|--------|------------|-------|------|---------|
| **On track** | 0-85% | Sage | ✓ | "No caminho certo" |
| **Watch** | 85-100% | Terra | ⚠ | "Atenção" |
| **Over** | >100% | Rust | ✗ | "Acima do plano" |

### No Rainbow Rule

**Before:** Each category has its own color (🔴🟡🟢🔵🟣)
**After:** All categories use neutral styling, **only status has color**

This reduces cognitive load and makes status immediately visible.

---

## Planned Entries Section

Optionally show planned entries below budget:

```tsx
function PlannedEntriesSection({ entries, month, year }) {
  const grouped = groupEntriesByStatus(entries);

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm mt-6">
      <div className="p-4 border-b border-stone-200">
        <h3 className="text-h4 text-stone-900">📅 Entradas Planejadas</h3>
      </div>

      <div className="divide-y divide-stone-100">
        {/* Pending entries */}
        {grouped.pending.map(entry => (
          <PlannedEntryRow key={entry.id} entry={entry} status="pending" />
        ))}

        {/* Matched entries */}
        {grouped.matched.map(entry => (
          <PlannedEntryRow key={entry.id} entry={entry} status="matched" />
        ))}

        {/* Missed entries */}
        {grouped.missed.map(entry => (
          <PlannedEntryRow key={entry.id} entry={entry} status="missed" />
        ))}
      </div>
    </div>
  );
}

function PlannedEntryRow({ entry, status }) {
  const statusConfig = {
    pending: {
      border: 'border-l-terra-400',
      bg: 'bg-terra-50/50',
      badge: 'bg-terra-100 text-terra-700',
      label: 'Aguardando'
    },
    matched: {
      border: 'border-l-sage-500',
      bg: 'bg-sage-50/50',
      badge: 'bg-sage-100 text-sage-700',
      label: 'Concluída'
    },
    missed: {
      border: 'border-l-rust-400',
      bg: 'bg-rust-50/50',
      badge: 'bg-rust-100 text-rust-700',
      label: 'Não encontrada'
    }
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-4 p-4 border-l-4 ${config.border} ${config.bg}`}>
      <span className="text-xl">{entry.category?.icon || '📌'}</span>
      <div className="flex-1">
        <p className="text-body text-stone-900">{entry.description}</p>
        <p className="text-tiny text-stone-500">
          Esperado: dia {entry.expectedDay} • {formatCurrency(entry.expectedAmount)}
        </p>
      </div>
      <span className={`px-2 py-1 rounded-full text-tiny font-medium ${config.badge}`}>
        {config.label}
      </span>
    </div>
  );
}
```

---

## Month Comparison View (Optional)

For users who want to see trends:

```tsx
function BudgetComparisonModal({ currentMonth, previousMonth }) {
  return (
    <Modal title="Comparativo de Meses" size="lg">
      <div className="grid grid-cols-2 gap-8">
        {/* Previous month */}
        <div>
          <h4 className="text-h4 text-stone-500 mb-4">{previousMonth.name}</h4>
          <div className="space-y-2">
            {previousMonth.categories.map(cat => (
              <div key={cat.id} className="flex justify-between text-body-sm">
                <span>{cat.icon} {cat.name}</span>
                <span className="tabular-nums text-stone-600">{formatCurrency(cat.spent)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Current month */}
        <div>
          <h4 className="text-h4 text-stone-900 mb-4">{currentMonth.name}</h4>
          <div className="space-y-2">
            {currentMonth.categories.map((cat, index) => {
              const prev = previousMonth.categories[index];
              const diff = cat.spent - prev.spent;
              return (
                <div key={cat.id} className="flex justify-between text-body-sm">
                  <span>{cat.icon} {cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums text-stone-900">{formatCurrency(cat.spent)}</span>
                    {diff !== 0 && (
                      <span className={`text-tiny ${diff > 0 ? 'text-rust-500' : 'text-sage-500'}`}>
                        {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Empty State

```tsx
function EmptyBudget({ onCreateBudget }) {
  return (
    <div className="text-center py-16 px-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-wheat-100 flex items-center justify-center mb-6">
        <span className="text-4xl">📊</span>
      </div>
      <h3 className="text-h2 text-stone-800 mb-3">
        Crie seu primeiro orçamento
      </h3>
      <p className="text-body text-stone-500 max-w-md mx-auto mb-8">
        Defina quanto você planeja gastar em cada categoria. Isso te ajuda a ter controle total das suas finanças e evitar surpresas no fim do mês.
      </p>
      <button
        onClick={onCreateBudget}
        className="px-6 py-3 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600 font-medium"
      >
        Criar orçamento
      </button>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create `BudgetMonthHeader` component
- [ ] Create `CategoryBudgetRow` component (expandable)
- [ ] Create `BudgetEditModal` component
- [ ] Create `PlannedEntriesSection` component
- [ ] Implement month navigation
- [ ] Remove rainbow category colors
- [ ] Add status indicators (✓ ⚠ ✗)
- [ ] Add budget type selection (fixed/calculated/hybrid)
- [ ] Add planned items management
- [ ] Create empty state
- [ ] Add loading skeletons
