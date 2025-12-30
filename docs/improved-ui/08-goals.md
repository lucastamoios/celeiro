# Savings Goals Redesign

> Building towards a secure future with visible progress

## Design Philosophy

Savings goals are the **motivational heart** of Celeiro. This is where users see they're building something meaningful for their family's future.

The UI should inspire confidence:
- "I'm making progress"
- "I have a plan for known needs"
- "I'm building security for unknown needs"

---

## Current Problems

1. **Generic progress cards** - Don't feel meaningful
2. **No emotional connection** - Just numbers and bars
3. **Type distinction unclear** - "Reserva" vs "Investimento" not differentiated well
4. **No celebration** - Completing a goal feels anticlimactic

## Design Goals

1. **Visually rewarding** - Progress should feel tangible
2. **Clear purpose** - Each goal tells a story
3. **Motivating** - Encourage continued saving
4. **Honest** - Show real progress without over-celebrating

---

## Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Minhas Metas                                                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                                                                      │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐          │   │
│  │  │ 🎯 Total       │ │ 💰 Acumulado   │ │ 📈 Progresso   │          │   │
│  │  │ 5 metas        │ │ R$ 18.000,00   │ │ 36% do total   │          │   │
│  │  │ 3 reservas     │ │ de R$ 50.000   │ │ +R$ 2.000/mês  │          │   │
│  │  │ 2 investim.    │ │                │ │                │          │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘          │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Reservas]  [Investimentos]  [Concluídas]               [+ Nova meta]     │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │ 🚗 Carro Novo               │  │ 🏖️ Férias 2026             │         │
│  │                              │  │                              │         │
│  │ ═══════════════░░░░░░░░░   │  │ ═══════░░░░░░░░░░░░░░░░░    │         │
│  │                              │  │                              │         │
│  │ R$ 15.000 / R$ 50.000       │  │ R$ 3.000 / R$ 8.000        │         │
│  │ 30% • Meta: Dez 2026        │  │ 37% • Meta: Jun 2026       │         │
│  │                              │  │                              │         │
│  │ [Contribuir]                │  │ [Contribuir]                │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
│                                                                             │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│  │ 🔧 Reserva de Emergência     │  │ 🎓 Faculdade dos filhos    │         │
│  │                              │  │                              │         │
│  │ ═════════════════░░░░░░░   │  │ ════░░░░░░░░░░░░░░░░░░░░    │         │
│  │                              │  │                              │         │
│  │ R$ 8.000 / R$ 12.000        │  │ R$ 2.000 / R$ 30.000       │         │
│  │ 67% • Contínua               │  │ 7% • Meta: 2032            │         │
│  │                              │  │                              │         │
│  │ [Contribuir]                │  │ [Contribuir]                │         │
│  └─────────────────────────────┘  └─────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Specifications

### Summary Header

```tsx
function GoalsSummaryHeader({ goals }) {
  const totalGoals = goals.length;
  const reservas = goals.filter(g => g.type === 'reserva').length;
  const investimentos = goals.filter(g => g.type === 'investimento').length;

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-wheat-50 to-white rounded-xl border border-wheat-200 p-6 mb-8">
      <div className="grid grid-cols-3 gap-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🎯</div>
          <p className="text-h2 text-stone-900">{totalGoals} metas</p>
          <p className="text-body-sm text-stone-500">
            {reservas} reservas • {investimentos} investimentos
          </p>
        </div>

        <div className="text-center">
          <div className="text-4xl mb-2">💰</div>
          <p className="text-h2 text-sage-700 tabular-nums">{formatCurrency(totalSaved)}</p>
          <p className="text-body-sm text-stone-500">
            de {formatCurrency(totalTarget)} total
          </p>
        </div>

        <div className="text-center">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-h2 text-stone-900">{Math.round(overallProgress)}%</p>
          <p className="text-body-sm text-stone-500">
            progresso geral
          </p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mt-6">
        <div className="w-full bg-wheat-200 rounded-full h-2">
          <div
            className="h-full rounded-full bg-wheat-500 transition-all duration-700"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

### Goal Card (Enhanced)

```tsx
interface GoalCardProps {
  goal: SavingsGoal;
  onContribute: () => void;
  onEdit: () => void;
}

function GoalCard({ goal, onContribute, onEdit }: GoalCardProps) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100;
  const isComplete = progress >= 100;
  const isNearComplete = progress >= 80 && !isComplete;

  // Calculate time remaining
  const monthsRemaining = goal.dueDate
    ? differenceInMonths(new Date(goal.dueDate), new Date())
    : null;
  const monthlyNeeded = monthsRemaining && monthsRemaining > 0
    ? (goal.targetAmount - goal.currentAmount) / monthsRemaining
    : null;

  return (
    <div className={`
      bg-white rounded-xl border shadow-warm-sm overflow-hidden
      transition-all hover:shadow-warm-md
      ${isComplete ? 'border-sage-300' : 'border-stone-200'}
    `}>
      {/* Header with icon and type */}
      <div className={`
        px-6 py-4 border-b
        ${goal.type === 'reserva' ? 'bg-blue-50/50 border-blue-100' : 'bg-purple-50/50 border-purple-100'}
      `}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{goal.icon}</span>
            <div>
              <h3 className="text-h4 text-stone-900">{goal.name}</h3>
              <span className={`
                text-tiny px-2 py-0.5 rounded-full
                ${goal.type === 'reserva'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
                }
              `}>
                {goal.type === 'reserva' ? '🛡️ Reserva' : '📈 Investimento'}
              </span>
            </div>
          </div>

          {/* Actions menu */}
          <button
            onClick={onEdit}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <DotsVerticalIcon className="h-5 w-5 text-stone-400" />
          </button>
        </div>
      </div>

      {/* Progress section */}
      <div className="p-6">
        {/* Progress bar with milestone markers */}
        <div className="relative mb-4">
          <div className="w-full bg-stone-200 rounded-full h-4">
            <div
              className={`
                h-full rounded-full transition-all duration-700
                ${isComplete ? 'bg-sage-500' : isNearComplete ? 'bg-wheat-500' : 'bg-wheat-400'}
              `}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>

          {/* Milestone markers at 25%, 50%, 75% */}
          <div className="absolute top-0 left-0 w-full h-full flex justify-between items-center px-1 pointer-events-none">
            {[25, 50, 75].map(milestone => (
              <div
                key={milestone}
                className={`
                  w-1 h-2 rounded-full
                  ${progress >= milestone ? 'bg-white/50' : 'bg-stone-300'}
                `}
                style={{ marginLeft: `${milestone - 1}%` }}
              />
            ))}
          </div>
        </div>

        {/* Amounts */}
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <span className="text-h2 text-stone-900 tabular-nums">
              {formatCurrency(goal.currentAmount)}
            </span>
            <span className="text-body text-stone-400 ml-1">
              / {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <span className={`
            text-h3 font-medium tabular-nums
            ${isComplete ? 'text-sage-600' : 'text-stone-600'}
          `}>
            {Math.round(progress)}%
          </span>
        </div>

        {/* Due date and monthly suggestion */}
        <div className="flex items-center justify-between text-body-sm text-stone-500 mb-6">
          {goal.dueDate ? (
            <span className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              Meta: {formatDate(goal.dueDate, 'short')}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <InfinityIcon className="h-4 w-4" />
              Meta contínua
            </span>
          )}

          {monthlyNeeded && monthlyNeeded > 0 && (
            <span className="text-tiny bg-stone-100 px-2 py-1 rounded">
              ~{formatCurrency(monthlyNeeded)}/mês
            </span>
          )}
        </div>

        {/* Action button */}
        {isComplete ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-sage-50 rounded-lg text-sage-700">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">Meta alcançada! 🎉</span>
          </div>
        ) : (
          <button
            onClick={onContribute}
            className="
              w-full py-3 bg-wheat-500 text-white rounded-lg
              hover:bg-wheat-600 transition-colors font-medium
            "
          >
            + Contribuir
          </button>
        )}
      </div>
    </div>
  );
}
```

### Contribution Modal

```tsx
function ContributionModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [linkTransaction, setLinkTransaction] = useState(false);

  const remaining = goal.targetAmount - goal.currentAmount;
  const presetAmounts = [100, 500, 1000, remaining].filter(a => a <= remaining && a > 0);

  return (
    <Modal onClose={onClose} title={`Contribuir para: ${goal.icon} ${goal.name}`}>
      <div className="space-y-6">
        {/* Current progress */}
        <div className="p-4 bg-stone-50 rounded-lg">
          <div className="flex justify-between text-body-sm mb-2">
            <span className="text-stone-500">Progresso atual</span>
            <span className="text-stone-700 tabular-nums">
              {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2">
            <div
              className="h-full rounded-full bg-wheat-500"
              style={{ width: `${(goal.currentAmount / goal.targetAmount) * 100}%` }}
            />
          </div>
        </div>

        {/* Amount input */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            Valor da contribuição
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-stone-300 rounded-lg text-h3 tabular-nums text-right"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Quick amounts */}
        <div className="flex flex-wrap gap-2">
          {presetAmounts.map(preset => (
            <button
              key={preset}
              onClick={() => setAmount(formatNumberInput(preset))}
              className={`
                px-4 py-2 rounded-lg text-body-sm transition-colors
                ${parseFloat(amount.replace(',', '.')) === preset
                  ? 'bg-wheat-500 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }
              `}
            >
              {preset === remaining ? 'Completar meta' : formatCurrency(preset)}
            </button>
          ))}
        </div>

        {/* Note */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            Nota (opcional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-body"
            placeholder="Ex: Bônus do trabalho"
          />
        </div>

        {/* Link to transaction */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={linkTransaction}
            onChange={(e) => setLinkTransaction(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-wheat-500"
          />
          <span className="text-body text-stone-700">
            Vincular a uma transação existente
          </span>
        </label>

        {/* Preview */}
        {amount && (
          <div className="p-4 bg-sage-50 border border-sage-200 rounded-lg">
            <p className="text-body-sm text-sage-700">
              Após esta contribuição:
            </p>
            <p className="text-h3 text-sage-800 tabular-nums">
              {formatCurrency(goal.currentAmount + parseNumberInput(amount))} / {formatCurrency(goal.targetAmount)}
            </p>
            <p className="text-tiny text-sage-600">
              {Math.round(((goal.currentAmount + parseNumberInput(amount)) / goal.targetAmount) * 100)}% do objetivo
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2.5 text-stone-700 hover:bg-stone-100 rounded-lg"
        >
          Cancelar
        </button>
        <button
          onClick={() => onSave({ amount: parseNumberInput(amount), note, linkTransaction })}
          disabled={!amount || parseNumberInput(amount) <= 0}
          className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg disabled:opacity-50"
        >
          Confirmar contribuição
        </button>
      </div>
    </Modal>
  );
}
```

### Goal Type Filter Tabs

```tsx
function GoalTypeTabs({ activeTab, onChange, counts }) {
  const tabs = [
    { id: 'all', label: 'Todas', count: counts.all },
    { id: 'reserva', label: 'Reservas', count: counts.reservas, emoji: '🛡️' },
    { id: 'investimento', label: 'Investimentos', count: counts.investimentos, emoji: '📈' },
    { id: 'completed', label: 'Concluídas', count: counts.completed, emoji: '✅' },
  ];

  return (
    <div className="flex items-center gap-2 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            px-4 py-2 rounded-lg text-body font-medium transition-colors
            ${activeTab === tab.id
              ? 'bg-wheat-500 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }
          `}
        >
          {tab.emoji && <span className="mr-1">{tab.emoji}</span>}
          {tab.label}
          <span className={`
            ml-2 px-1.5 py-0.5 rounded text-tiny
            ${activeTab === tab.id
              ? 'bg-wheat-600'
              : 'bg-stone-200'
            }
          `}>
            {tab.count}
          </span>
        </button>
      ))}
    </div>
  );
}
```

---

## Goal Completion Celebration

When a goal is completed, show a celebration modal:

```tsx
function GoalCompletedModal({ goal, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/50" onClick={onClose} />

      <div className="
        relative bg-white rounded-2xl shadow-warm-xl p-8 max-w-md w-full
        text-center animate-bounce-in
      ">
        {/* Confetti animation would go here */}

        <div className="text-6xl mb-4">🎉</div>

        <h2 className="text-h1 text-stone-900 mb-2">
          Meta Alcançada!
        </h2>

        <p className="text-body text-stone-600 mb-6">
          Parabéns! Você alcançou sua meta "{goal.icon} {goal.name}"!
        </p>

        <div className="p-4 bg-sage-50 rounded-lg mb-6">
          <p className="text-caption text-sage-600 mb-1">Você economizou</p>
          <p className="text-display text-sage-700 tabular-nums">
            {formatCurrency(goal.targetAmount)}
          </p>
        </div>

        <p className="text-body-sm text-stone-500 mb-6">
          Continue assim! Cada meta alcançada é um passo em direção à segurança financeira da sua família.
        </p>

        <button
          onClick={onClose}
          className="w-full py-3 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600 font-medium"
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
```

---

## Create Goal Modal

```tsx
function CreateGoalModal({ onSave, onClose }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [type, setType] = useState<'reserva' | 'investimento'>('reserva');
  const [targetAmount, setTargetAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [hasDeadline, setHasDeadline] = useState(true);

  return (
    <Modal onClose={onClose} title="Nova Meta">
      <div className="space-y-6">
        {/* Goal type */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-3 block">
            Tipo de meta
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setType('reserva')}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${type === 'reserva'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
            >
              <span className="text-2xl mb-2 block">🛡️</span>
              <p className="text-body font-medium text-stone-900">Reserva</p>
              <p className="text-tiny text-stone-500">
                Para gastos planejados (carro, viagem, reforma)
              </p>
            </button>
            <button
              onClick={() => setType('investimento')}
              className={`
                p-4 rounded-lg border-2 text-left transition-all
                ${type === 'investimento'
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-stone-200 hover:border-stone-300'
                }
              `}
            >
              <span className="text-2xl mb-2 block">📈</span>
              <p className="text-body font-medium text-stone-900">Investimento</p>
              <p className="text-tiny text-stone-500">
                Para crescimento de longo prazo (aposentadoria, filhos)
              </p>
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            Nome da meta
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-body"
            placeholder="Ex: Carro novo, Férias 2026"
          />
        </div>

        {/* Icon picker */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            Ícone
          </label>
          <div className="flex flex-wrap gap-2">
            {['🎯', '🚗', '🏠', '✈️', '🎓', '💍', '🔧', '🏖️', '👶', '💻', '📱', '🎁'].map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`
                  w-10 h-10 rounded-lg text-xl flex items-center justify-center
                  transition-all duration-200
                  ${icon === emoji
                    ? 'bg-wheat-500 scale-110'
                    : 'bg-stone-100 hover:bg-stone-200'
                  }
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Target amount */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            Valor da meta
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-stone-300 rounded-lg text-body tabular-nums text-right"
              placeholder="0,00"
            />
          </div>
        </div>

        {/* Due date */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-caption text-stone-700 font-medium">
              Data limite
            </label>
            <label className="flex items-center gap-2 text-body-sm text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={!hasDeadline}
                onChange={(e) => setHasDeadline(!e.target.checked)}
                className="rounded border-stone-300 text-wheat-500"
              />
              Meta contínua
            </label>
          </div>
          {hasDeadline && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-stone-300 rounded-lg text-body"
            />
          )}
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
          onClick={() => onSave({ name, icon, type, targetAmount: parseNumberInput(targetAmount), dueDate: hasDeadline ? dueDate : null })}
          disabled={!name || !targetAmount}
          className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg disabled:opacity-50"
        >
          Criar meta
        </button>
      </div>
    </Modal>
  );
}
```

---

## Empty State

```tsx
function EmptyGoals({ onCreateGoal }) {
  return (
    <div className="text-center py-16 px-8">
      <div className="mx-auto w-20 h-20 rounded-full bg-wheat-100 flex items-center justify-center mb-6">
        <span className="text-4xl">🎯</span>
      </div>
      <h3 className="text-h2 text-stone-800 mb-3">
        Crie sua primeira meta
      </h3>
      <p className="text-body text-stone-500 max-w-md mx-auto mb-4">
        Metas te ajudam a guardar dinheiro para o que importa: aquele carro novo, as férias dos sonhos, ou a segurança para imprevistos.
      </p>
      <p className="text-body-sm text-stone-400 max-w-md mx-auto mb-8">
        "Quem não sabe para onde vai, qualquer caminho serve." - Lewis Carroll
      </p>
      <button
        onClick={onCreateGoal}
        className="px-6 py-3 bg-wheat-500 text-white rounded-lg hover:bg-wheat-600 font-medium"
      >
        + Criar primeira meta
      </button>
    </div>
  );
}
```

---

## Implementation Checklist

- [ ] Create `GoalsSummaryHeader` component
- [ ] Create `GoalCard` component with progress visualization
- [ ] Create `ContributionModal` component
- [ ] Create `GoalTypeTabs` component
- [ ] Create `CreateGoalModal` component
- [ ] Create `GoalCompletedModal` celebration
- [ ] Add milestone markers to progress bars
- [ ] Implement monthly savings suggestion calculation
- [ ] Add empty state
- [ ] Add loading skeletons
- [ ] Implement goal type filtering
