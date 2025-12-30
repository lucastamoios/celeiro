# Component Library

> Standardized UI components for Celeiro

## Design Tokens Summary

Before diving into components, here's a quick reference:

```typescript
const tokens = {
  colors: {
    primary: 'wheat',      // Brand, main CTAs
    success: 'sage',       // Income, on-track
    warning: 'terra',      // Attention needed
    error: 'rust',         // Over budget, errors
    neutral: 'stone',      // All grays
  },
  radius: {
    sm: 'rounded',         // 4px - small elements
    md: 'rounded-lg',      // 8px - buttons, inputs
    lg: 'rounded-xl',      // 12px - cards
    xl: 'rounded-2xl',     // 16px - modals
    full: 'rounded-full',  // pills, avatars
  },
  shadow: {
    sm: 'shadow-warm-sm',
    md: 'shadow-warm-md',
    lg: 'shadow-warm-lg',
    xl: 'shadow-warm-xl',
  }
}
```

---

## Buttons

### Primary Button

The main call-to-action button. Use sparingly - one per section.

```tsx
// Primary Button
<button className="
  px-4 py-2.5
  bg-wheat-500 hover:bg-wheat-600 active:bg-wheat-700
  text-white font-medium
  rounded-lg
  transition-colors duration-150
  focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:ring-offset-2
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Salvar
</button>
```

**Sizes:**
```tsx
// Small
className="px-3 py-1.5 text-sm"
// Medium (default)
className="px-4 py-2.5 text-sm"
// Large
className="px-6 py-3 text-base"
```

### Secondary Button

For secondary actions alongside primary buttons.

```tsx
<button className="
  px-4 py-2.5
  bg-stone-100 hover:bg-stone-200 active:bg-stone-300
  text-stone-700 font-medium
  rounded-lg
  transition-colors duration-150
  focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2
">
  Cancelar
</button>
```

### Ghost Button

For tertiary actions, less prominent.

```tsx
<button className="
  px-4 py-2.5
  bg-transparent hover:bg-stone-100 active:bg-stone-200
  text-stone-600 font-medium
  rounded-lg
  transition-colors duration-150
">
  Ver mais
</button>
```

### Danger Button

For destructive actions (delete, remove).

```tsx
<button className="
  px-4 py-2.5
  bg-rust-500 hover:bg-rust-600 active:bg-rust-700
  text-white font-medium
  rounded-lg
  transition-colors duration-150
  focus:outline-none focus:ring-2 focus:ring-rust-500 focus:ring-offset-2
">
  Excluir
</button>
```

### Icon Button

For actions represented by icons only.

```tsx
<button className="
  p-2
  bg-transparent hover:bg-stone-100 active:bg-stone-200
  text-stone-500 hover:text-stone-700
  rounded-lg
  transition-colors duration-150
">
  <TrashIcon className="h-5 w-5" />
</button>
```

### Button with Icon

```tsx
<button className="
  inline-flex items-center gap-2
  px-4 py-2.5
  bg-wheat-500 hover:bg-wheat-600
  text-white font-medium
  rounded-lg
  transition-colors duration-150
">
  <PlusIcon className="h-4 w-4" />
  Adicionar
</button>
```

### Loading Button

```tsx
<button className="
  inline-flex items-center justify-center gap-2
  px-4 py-2.5
  bg-wheat-500
  text-white font-medium
  rounded-lg
  opacity-75 cursor-wait
" disabled>
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
  </svg>
  Salvando...
</button>
```

---

## Cards

### Base Card

```tsx
<div className="
  bg-white
  rounded-xl
  border border-stone-200
  shadow-warm-sm
  p-6
">
  {children}
</div>
```

### Interactive Card (Clickable)

```tsx
<div className="
  bg-white
  rounded-xl
  border border-stone-200
  shadow-warm-sm
  p-6
  cursor-pointer
  transition-all duration-150
  hover:shadow-warm-md hover:border-stone-300
  active:bg-stone-50
">
  {children}
</div>
```

### Status Card

For displaying budget or goal status.

```tsx
interface StatusCardProps {
  status: 'on-track' | 'warning' | 'over-budget';
  title: string;
  value: string;
  description: string;
}

const statusStyles = {
  'on-track': 'border-l-sage-500 bg-sage-50/50',
  'warning': 'border-l-terra-500 bg-terra-50/50',
  'over-budget': 'border-l-rust-500 bg-rust-50/50',
};

<div className={`
  bg-white rounded-xl border border-stone-200 shadow-warm-sm
  border-l-4 ${statusStyles[status]}
  p-6
`}>
  <h3 className="text-caption text-stone-500 uppercase tracking-wide">{title}</h3>
  <p className="text-h2 text-stone-900 mt-1 tabular-nums">{value}</p>
  <p className="text-body-sm text-stone-600 mt-2">{description}</p>
</div>
```

### Summary Card

For key metrics (income, expenses, balance).

```tsx
<div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm p-6">
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-sage-100">
      <ArrowUpIcon className="h-5 w-5 text-sage-600" />
    </div>
    <div>
      <p className="text-caption text-stone-500">Receitas</p>
      <p className="text-h3 text-sage-700 tabular-nums">R$ 5.000,00</p>
    </div>
  </div>
</div>
```

### Expandable Card

For progressive disclosure (budget categories, goals).

```tsx
const [isExpanded, setIsExpanded] = useState(false);

<div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm overflow-hidden">
  {/* Header - always visible */}
  <button
    onClick={() => setIsExpanded(!isExpanded)}
    className="w-full p-6 flex items-center justify-between hover:bg-stone-50 transition-colors"
  >
    <div className="flex items-center gap-3">
      <span className="text-2xl">🍽️</span>
      <div>
        <h3 className="text-h4 text-stone-900">Alimentação</h3>
        <p className="text-body-sm text-stone-500">R$ 1.200 / R$ 1.500</p>
      </div>
    </div>
    <ChevronDownIcon className={`
      h-5 w-5 text-stone-400
      transition-transform duration-200
      ${isExpanded ? 'rotate-180' : ''}
    `} />
  </button>

  {/* Expandable content */}
  {isExpanded && (
    <div className="px-6 pb-6 pt-2 border-t border-stone-100">
      {/* Detailed content */}
    </div>
  )}
</div>
```

---

## Form Elements

### Text Input

```tsx
<div className="space-y-2">
  <label className="text-caption text-stone-700 font-medium">
    Descrição
  </label>
  <input
    type="text"
    className="
      w-full px-4 py-2.5
      bg-white
      border border-stone-300 rounded-lg
      text-body text-stone-900
      placeholder:text-stone-400
      transition-colors duration-150
      hover:border-stone-400
      focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent
      disabled:bg-stone-100 disabled:cursor-not-allowed
    "
    placeholder="Digite a descrição..."
  />
  <p className="text-tiny text-stone-500">
    Texto de ajuda opcional
  </p>
</div>
```

### Select

```tsx
<div className="space-y-2">
  <label className="text-caption text-stone-700 font-medium">
    Categoria
  </label>
  <select className="
    w-full px-4 py-2.5
    bg-white
    border border-stone-300 rounded-lg
    text-body text-stone-900
    transition-colors duration-150
    hover:border-stone-400
    focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent
  ">
    <option value="">Selecione uma categoria</option>
    <option value="food">🍽️ Alimentação</option>
    <option value="transport">🚗 Transporte</option>
  </select>
</div>
```

### Checkbox

```tsx
<label className="flex items-center gap-3 cursor-pointer group">
  <input
    type="checkbox"
    className="
      h-5 w-5
      rounded
      border-stone-300
      text-wheat-500
      focus:ring-wheat-500 focus:ring-offset-0
      transition-colors
    "
  />
  <span className="text-body text-stone-700 group-hover:text-stone-900">
    Mostrar transações ignoradas
  </span>
</label>
```

### Toggle Switch

```tsx
<button
  onClick={() => setEnabled(!enabled)}
  className={`
    relative inline-flex h-6 w-11
    items-center rounded-full
    transition-colors duration-200
    focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:ring-offset-2
    ${enabled ? 'bg-wheat-500' : 'bg-stone-300'}
  `}
>
  <span className={`
    inline-block h-4 w-4
    transform rounded-full bg-white shadow-sm
    transition-transform duration-200
    ${enabled ? 'translate-x-6' : 'translate-x-1'}
  `} />
</button>
```

### Currency Input

```tsx
<div className="space-y-2">
  <label className="text-caption text-stone-700 font-medium">
    Valor
  </label>
  <div className="relative">
    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
      R$
    </span>
    <input
      type="text"
      inputMode="decimal"
      className="
        w-full pl-10 pr-4 py-2.5
        bg-white
        border border-stone-300 rounded-lg
        text-body text-stone-900 tabular-nums text-right
        focus:outline-none focus:ring-2 focus:ring-wheat-500 focus:border-transparent
      "
      placeholder="0,00"
    />
  </div>
</div>
```

---

## Progress Bars

### Basic Progress Bar

```tsx
interface ProgressBarProps {
  value: number; // 0-100
  status?: 'default' | 'success' | 'warning' | 'error';
}

const statusColors = {
  default: 'bg-wheat-500',
  success: 'bg-sage-500',
  warning: 'bg-terra-500',
  error: 'bg-rust-500',
};

<div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
  <div
    className={`h-full rounded-full transition-all duration-500 ${statusColors[status]}`}
    style={{ width: `${Math.min(100, value)}%` }}
  />
</div>
```

### Progress Bar with Label

```tsx
<div className="space-y-2">
  <div className="flex justify-between text-caption">
    <span className="text-stone-600">Progresso</span>
    <span className="text-stone-900 tabular-nums">75%</span>
  </div>
  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
    <div
      className="h-full rounded-full bg-wheat-500 transition-all duration-500"
      style={{ width: '75%' }}
    />
  </div>
</div>
```

### Budget Progress Bar

Shows used vs budget with overflow indication.

```tsx
interface BudgetProgressProps {
  spent: number;
  budget: number;
}

function BudgetProgress({ spent, budget }: BudgetProgressProps) {
  const percentage = (spent / budget) * 100;
  const isOver = percentage > 100;
  const displayPercentage = Math.min(percentage, 100);

  const getColor = () => {
    if (percentage >= 100) return 'bg-rust-500';
    if (percentage >= 80) return 'bg-terra-500';
    return 'bg-sage-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-caption">
        <span className={isOver ? 'text-rust-700' : 'text-stone-600'}>
          R$ {spent.toLocaleString('pt-BR')}
        </span>
        <span className="text-stone-500">
          / R$ {budget.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      {isOver && (
        <p className="text-tiny text-rust-600">
          {Math.round(percentage - 100)}% acima do orçamento
        </p>
      )}
    </div>
  );
}
```

---

## Badges

### Status Badge

```tsx
const badgeStyles = {
  default: 'bg-stone-100 text-stone-700',
  success: 'bg-sage-100 text-sage-700',
  warning: 'bg-terra-100 text-terra-700',
  error: 'bg-rust-100 text-rust-700',
  info: 'bg-wheat-100 text-wheat-700',
};

<span className={`
  inline-flex items-center
  px-2.5 py-0.5
  text-tiny font-medium
  rounded-full
  ${badgeStyles[status]}
`}>
  No orçamento
</span>
```

### Category Badge

```tsx
<span className="
  inline-flex items-center gap-1.5
  px-2.5 py-1
  bg-stone-100
  text-body-sm text-stone-700
  rounded-lg
">
  <span>🍽️</span>
  Alimentação
</span>
```

### Count Badge

```tsx
<span className="
  inline-flex items-center justify-center
  min-w-[20px] h-5
  px-1.5
  bg-rust-500 text-white
  text-tiny font-medium
  rounded-full
">
  3
</span>
```

---

## Modals

### Base Modal Structure

```tsx
<div className="fixed inset-0 z-50 overflow-y-auto">
  {/* Backdrop */}
  <div
    className="fixed inset-0 bg-stone-900/50 transition-opacity"
    onClick={onClose}
  />

  {/* Modal container */}
  <div className="flex min-h-full items-center justify-center p-4">
    <div className="
      relative w-full max-w-lg
      bg-white rounded-2xl shadow-warm-xl
      transform transition-all
    ">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-stone-200">
        <h2 className="text-h3 text-stone-900">Título do Modal</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <XIcon className="h-5 w-5 text-stone-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        {children}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-stone-200 bg-stone-50 rounded-b-2xl">
        <button className="px-4 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg">
          Cancelar
        </button>
        <button className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg">
          Salvar
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## Tables

### Basic Table

```tsx
<div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm overflow-hidden">
  <table className="w-full">
    <thead>
      <tr className="bg-stone-50 border-b border-stone-200">
        <th className="px-6 py-3 text-left text-caption font-medium text-stone-500 uppercase tracking-wider">
          Data
        </th>
        <th className="px-6 py-3 text-left text-caption font-medium text-stone-500 uppercase tracking-wider">
          Descrição
        </th>
        <th className="px-6 py-3 text-right text-caption font-medium text-stone-500 uppercase tracking-wider">
          Valor
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-stone-100">
      <tr className="hover:bg-stone-50 transition-colors">
        <td className="px-6 py-4 text-body-sm text-stone-600 tabular-nums">
          15/12/2025
        </td>
        <td className="px-6 py-4 text-body text-stone-900">
          Supermercado Extra
        </td>
        <td className="px-6 py-4 text-body text-rust-600 text-right tabular-nums">
          -R$ 234,56
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Empty States

```tsx
<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
  <div className="p-4 rounded-full bg-stone-100 mb-4">
    <InboxIcon className="h-8 w-8 text-stone-400" />
  </div>
  <h3 className="text-h4 text-stone-700 mb-2">
    Nenhuma transação encontrada
  </h3>
  <p className="text-body text-stone-500 max-w-sm mb-6">
    Importe um arquivo OFX ou adicione uma transação manualmente para começar.
  </p>
  <button className="px-4 py-2.5 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600">
    Adicionar transação
  </button>
</div>
```

---

## Loading States

### Skeleton Card

```tsx
<div className="bg-white rounded-xl border border-stone-200 p-6 animate-pulse">
  <div className="flex items-center gap-3">
    <div className="h-10 w-10 rounded-lg bg-stone-200" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-24 bg-stone-200 rounded" />
      <div className="h-3 w-32 bg-stone-200 rounded" />
    </div>
  </div>
</div>
```

### Loading Spinner

```tsx
<div className="flex items-center justify-center py-12">
  <svg className="animate-spin h-8 w-8 text-wheat-500" viewBox="0 0 24 24">
    <circle
      className="opacity-25"
      cx="12" cy="12" r="10"
      stroke="currentColor" strokeWidth="4" fill="none"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
</div>
```

---

## Notifications / Toasts

```tsx
const toastStyles = {
  success: {
    bg: 'bg-sage-50',
    border: 'border-sage-200',
    icon: 'text-sage-500',
    text: 'text-sage-800'
  },
  error: {
    bg: 'bg-rust-50',
    border: 'border-rust-200',
    icon: 'text-rust-500',
    text: 'text-rust-800'
  },
  warning: {
    bg: 'bg-terra-50',
    border: 'border-terra-200',
    icon: 'text-terra-500',
    text: 'text-terra-800'
  },
  info: {
    bg: 'bg-wheat-50',
    border: 'border-wheat-200',
    icon: 'text-wheat-500',
    text: 'text-wheat-800'
  }
};

<div className={`
  flex items-center gap-3
  p-4 rounded-lg border
  ${toastStyles[type].bg}
  ${toastStyles[type].border}
`}>
  <CheckCircleIcon className={`h-5 w-5 ${toastStyles[type].icon}`} />
  <p className={`text-body ${toastStyles[type].text}`}>
    Transação salva com sucesso!
  </p>
</div>
```
