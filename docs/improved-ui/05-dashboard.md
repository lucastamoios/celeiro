# Dashboard Redesign

> The command center for confident financial stewardship

## Current Problems

1. **No clear answer** - User can't see "Am I on track?" at a glance
2. **Color overload** - Category colors compete for attention
3. **Dense information** - Everything shown at once
4. **Generic feel** - Looks like any financial dashboard

## Design Goal

When a user opens the dashboard, they should **immediately know**:
1. Am I on track this month? (2 seconds)
2. What needs my attention? (5 seconds)
3. Where can I dig deeper? (on demand)

---

## Information Hierarchy

### Layer 1: The Hero Answer (Above the fold)

**The single most important metric:** Monthly budget status

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  Dezembro 2025                                         [< >] meses  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                                                              │   │
│  │          ✓ Você está no caminho certo                       │   │
│  │                                                              │   │
│  │            R$ 234,00 disponíveis este mês                   │   │
│  │                                                              │   │
│  │   [====================================............] 78%    │   │
│  │                                                              │   │
│  │         Gastou R$ 3.500 de R$ 4.500 planejados              │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Status Variants:**

| Status | Message | Color | Icon |
|--------|---------|-------|------|
| On track (<80%) | "Você está no caminho certo" | Sage | ✓ |
| Watch (80-95%) | "Atenção ao orçamento" | Terra | ⚠ |
| At limit (95-100%) | "Quase no limite" | Terra | ⚠ |
| Over (>100%) | "Orçamento excedido" | Rust | ✗ |

### Layer 2: Key Metrics (3 Cards)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ 📥 Receitas     │  │ 📤 Despesas     │  │ 💰 Saldo        │
│                 │  │                 │  │                 │
│ R$ 5.000,00     │  │ R$ 3.500,00     │  │ R$ 1.500,00     │
│                 │  │                 │  │                 │
│ 100% recebido   │  │ 78% do plano    │  │ +12% vs mês ant │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Layer 3: Action Items (Needs Attention)

Only shown if there are items needing action:

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚠️ Precisa de atenção                                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🏷️ 12 transações não categorizadas              [Categorizar →]  │
│                                                                     │
│  🍽️ Alimentação está 15% acima do planejado      [Ver detalhes →]  │
│                                                                     │
│  📅 Conta de luz esperada para hoje                [Verificar →]   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer 4: Category Breakdown (Scrollable)

Simplified category cards without rainbow colors:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Gastos por Categoria                              [Ver todos →]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  🍽️ Alimentação        R$ 1.200 / R$ 1.500   [████████░░] 80%  ✓  │
│  🚗 Transporte          R$ 450 / R$ 500      [█████████░] 90%  ⚠  │
│  🏠 Moradia             R$ 1.500 / R$ 1.500  [██████████] 100% ⚠  │
│  ❤️ Saúde               R$ 350 / R$ 600      [█████░░░░░] 58%  ✓  │
│                                                                     │
│                            [+ 3 categorias]                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Layer 5: Savings Progress (Motivational)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 🎯 Suas Metas                                     [Ver todas →]    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────┐  ┌─────────────────────────┐         │
│  │ 🚗 Carro Novo           │  │ 🏖️ Férias 2026         │         │
│  │                         │  │                         │         │
│  │ R$ 15.000 / R$ 50.000   │  │ R$ 3.000 / R$ 8.000    │         │
│  │ [████░░░░░░] 30%        │  │ [███░░░░░░░] 37%       │         │
│  │                         │  │                         │         │
│  └─────────────────────────┘  └─────────────────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Wireframe: Desktop Layout

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  🌾 Celeiro    [Transações] [Orçamentos] [Metas] [Categorias]     [Sair]    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  px-8 max-w-7xl mx-auto                                                      │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      HERO STATUS CARD                                   │ │
│  │                      (spans full width)                                 │ │
│  │                                                                         │ │
│  │                 ✓ Você está no caminho certo                           │ │
│  │                   R$ 234,00 disponíveis                                │ │
│  │                                                                         │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐            │
│  │ 📥 Receitas      │ │ 📤 Despesas      │ │ 💰 Saldo         │            │
│  │ R$ 5.000,00      │ │ R$ 3.500,00      │ │ R$ 1.500,00      │            │
│  └──────────────────┘ └──────────────────┘ └──────────────────┘            │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ ⚠️ Precisa de atenção (3)                                              │ │
│  │ • 12 transações não categorizadas                                      │ │
│  │ • Alimentação 15% acima                                                │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌────────────────────────────────────┐ ┌──────────────────────────────┐   │
│  │                                    │ │                              │   │
│  │  Gastos por Categoria              │ │  🎯 Suas Metas               │   │
│  │                                    │ │                              │   │
│  │  🍽️ Alimentação    80%   ✓        │ │  🚗 Carro Novo    30%        │   │
│  │  🚗 Transporte     90%   ⚠        │ │  🏖️ Férias        37%        │   │
│  │  🏠 Moradia       100%   ⚠        │ │                              │   │
│  │  ❤️ Saúde          58%   ✓        │ │  [Ver todas →]              │   │
│  │                                    │ │                              │   │
│  │  [Ver todos →]                    │ │                              │   │
│  │                                    │ │                              │   │
│  └────────────────────────────────────┘ └──────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Hero Status Card

```tsx
interface HeroStatusProps {
  status: 'on-track' | 'watch' | 'at-limit' | 'over';
  availableAmount: number;
  spentAmount: number;
  budgetAmount: number;
  percentUsed: number;
}

const statusConfig = {
  'on-track': {
    icon: CheckCircleIcon,
    iconColor: 'text-sage-500',
    bgGradient: 'from-sage-50 to-white',
    borderColor: 'border-sage-200',
    message: 'Você está no caminho certo',
    messageColor: 'text-sage-700'
  },
  'watch': {
    icon: ExclamationIcon,
    iconColor: 'text-terra-500',
    bgGradient: 'from-terra-50 to-white',
    borderColor: 'border-terra-200',
    message: 'Atenção ao orçamento',
    messageColor: 'text-terra-700'
  },
  'at-limit': {
    icon: ExclamationIcon,
    iconColor: 'text-terra-500',
    bgGradient: 'from-terra-50 to-white',
    borderColor: 'border-terra-200',
    message: 'Quase no limite',
    messageColor: 'text-terra-700'
  },
  'over': {
    icon: XCircleIcon,
    iconColor: 'text-rust-500',
    bgGradient: 'from-rust-50 to-white',
    borderColor: 'border-rust-200',
    message: 'Orçamento excedido',
    messageColor: 'text-rust-700'
  }
};

function HeroStatusCard({ status, availableAmount, spentAmount, budgetAmount, percentUsed }: HeroStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`
      rounded-2xl border p-8
      bg-gradient-to-br ${config.bgGradient}
      ${config.borderColor}
    `}>
      {/* Status indicator */}
      <div className="flex items-center justify-center gap-3 mb-4">
        <Icon className={`h-8 w-8 ${config.iconColor}`} />
        <span className={`text-h2 ${config.messageColor}`}>
          {config.message}
        </span>
      </div>

      {/* Main number */}
      <div className="text-center mb-6">
        <p className="text-display tabular-nums text-stone-900">
          {formatCurrency(availableAmount)}
        </p>
        <p className="text-body text-stone-500">
          disponíveis este mês
        </p>
      </div>

      {/* Progress bar */}
      <div className="max-w-md mx-auto mb-4">
        <div className="w-full bg-stone-200 rounded-full h-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              status === 'over' ? 'bg-rust-500' :
              status === 'on-track' ? 'bg-sage-500' : 'bg-terra-500'
            }`}
            style={{ width: `${Math.min(100, percentUsed)}%` }}
          />
        </div>
      </div>

      {/* Summary text */}
      <p className="text-center text-body-sm text-stone-600">
        Gastou <span className="font-medium">{formatCurrency(spentAmount)}</span>
        {' '}de <span className="font-medium">{formatCurrency(budgetAmount)}</span> planejados
      </p>
    </div>
  );
}
```

### Metric Summary Card

```tsx
interface MetricCardProps {
  icon: React.ComponentType;
  iconBgColor: string;
  iconColor: string;
  title: string;
  value: number;
  subtitle: string;
  valueColor?: string;
}

function MetricCard({ icon: Icon, iconBgColor, iconColor, title, value, subtitle, valueColor = 'text-stone-900' }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div>
          <p className="text-caption text-stone-500 uppercase tracking-wide">
            {title}
          </p>
          <p className={`text-h2 tabular-nums ${valueColor}`}>
            {formatCurrency(value)}
          </p>
          <p className="text-tiny text-stone-400">
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

// Usage
<MetricCard
  icon={ArrowDownIcon}
  iconBgColor="bg-sage-100"
  iconColor="text-sage-600"
  title="Receitas"
  value={5000}
  subtitle="100% recebido"
  valueColor="text-sage-700"
/>
```

### Attention Items Card

```tsx
interface AttentionItem {
  icon: string;
  message: string;
  action: string;
  onClick: () => void;
}

function AttentionCard({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="bg-terra-50/50 border border-terra-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-terra-200 bg-terra-50">
        <h3 className="flex items-center gap-2 text-h4 text-terra-800">
          <ExclamationIcon className="h-5 w-5 text-terra-500" />
          Precisa de atenção
        </h3>
      </div>
      <div className="divide-y divide-terra-100">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-terra-50 transition-colors text-left"
          >
            <span className="flex items-center gap-3 text-body text-stone-700">
              <span>{item.icon}</span>
              {item.message}
            </span>
            <span className="text-body-sm text-terra-600 font-medium">
              {item.action} →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

### Category Progress Row

```tsx
function CategoryProgressRow({ category, spent, budget, status }) {
  const percentage = (spent / budget) * 100;
  const isOnTrack = percentage < 80;
  const isWarning = percentage >= 80 && percentage <= 100;
  const isOver = percentage > 100;

  return (
    <div className="flex items-center gap-4 py-3">
      {/* Icon */}
      <span className="text-2xl">{category.icon}</span>

      {/* Name and amounts */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-body text-stone-700 truncate">
            {category.name}
          </span>
          <span className="text-body-sm text-stone-500 tabular-nums">
            {formatCurrency(spent)} / {formatCurrency(budget)}
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-stone-200 rounded-full h-2">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isOver ? 'bg-rust-500' :
              isWarning ? 'bg-terra-500' : 'bg-sage-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span className={`text-caption tabular-nums ${
          isOver ? 'text-rust-600' :
          isWarning ? 'text-terra-600' : 'text-sage-600'
        }`}>
          {Math.round(percentage)}%
        </span>
        {isOnTrack && <CheckIcon className="h-4 w-4 text-sage-500" />}
        {(isWarning || isOver) && <ExclamationIcon className="h-4 w-4 text-terra-500" />}
      </div>
    </div>
  );
}
```

---

## Animations & Micro-interactions

### Progress Bar Animation

```css
/* Smooth fill animation on mount */
.progress-fill {
  animation: fillProgress 1s ease-out forwards;
}

@keyframes fillProgress {
  from { width: 0%; }
  to { width: var(--target-width); }
}
```

### Status Card Entrance

```css
/* Subtle fade-up on page load */
.hero-card {
  animation: fadeUp 0.6s ease-out forwards;
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

### Number Counter Animation

For the hero available amount, consider animating the number:

```tsx
function AnimatedNumber({ value, duration = 1000 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(startValue + (value - startValue) * easeOut);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return formatCurrency(displayValue);
}
```

---

## Responsive Behavior

### Desktop (1280px+)
- Full 3-column metric cards
- Side-by-side categories and goals
- Large hero card with plenty of breathing room

### Tablet (768px - 1279px)
- 3-column metric cards maintained
- Categories and goals stack vertically
- Hero card slightly more compact

### Mobile (< 768px)
- Metric cards stack vertically
- Hero card simplified
- Categories show fewer items with "View all" prominent

```tsx
// Grid classes
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {/* Metric cards */}
</div>

<div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mt-8">
  <div className="lg:col-span-3">
    {/* Categories */}
  </div>
  <div className="lg:col-span-2">
    {/* Goals */}
  </div>
</div>
```

---

## Empty States

### No Budget Set

```tsx
<div className="rounded-2xl border-2 border-dashed border-stone-300 p-12 text-center">
  <div className="mx-auto w-12 h-12 rounded-full bg-wheat-100 flex items-center justify-center mb-4">
    <CalendarIcon className="h-6 w-6 text-wheat-600" />
  </div>
  <h3 className="text-h3 text-stone-700 mb-2">
    Crie seu primeiro orçamento
  </h3>
  <p className="text-body text-stone-500 max-w-sm mx-auto mb-6">
    Defina quanto você planeja gastar em cada categoria para ter controle total das suas finanças.
  </p>
  <button className="px-6 py-3 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600 font-medium">
    Criar orçamento
  </button>
</div>
```

### No Transactions This Month

```tsx
<div className="text-center py-8">
  <p className="text-body text-stone-500">
    Nenhuma transação registrada este mês.
  </p>
  <button className="mt-4 text-wheat-600 hover:text-wheat-700 font-medium">
    Importar arquivo OFX
  </button>
</div>
```

---

## Implementation Checklist

- [ ] Create `HeroStatusCard` component
- [ ] Create `MetricCard` component
- [ ] Create `AttentionCard` component
- [ ] Create `CategoryProgressRow` component
- [ ] Implement month navigation
- [ ] Add progress bar animations
- [ ] Implement responsive grid layout
- [ ] Add empty states
- [ ] Connect to existing API endpoints
- [ ] Add loading skeletons
