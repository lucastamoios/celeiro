# Transactions Page Redesign

> A calm, efficient interface for managing financial flow

## Current Problems

1. **Dense table** - Wall of data without visual breathing room
2. **No quick actions** - Too many clicks to categorize
3. **Status unclear** - Hard to spot uncategorized transactions
4. **Filter complexity** - Too many options shown at once

## Design Goals

1. **Scannable** - User can quickly find what they need
2. **Efficient** - Bulk categorization with minimal clicks
3. **Informative** - Clear status indicators
4. **Calm** - Not overwhelming despite data density

---

## Page Layout

### Header Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  Transações                                                                 │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Dezembro 2025                                              [< >]    │   │
│  │                                                                      │   │
│  │  📥 Receitas          📤 Despesas           💰 Saldo                │   │
│  │  R$ 5.000,00          R$ 3.500,00           R$ 1.500,00             │   │
│  │  (+R$ 500 vs nov)     (-12% vs nov)                                 │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────┐  ┌──────────────┐  ┌────────────┐             [+ Adicionar]   │
│  │🔍 Buscar │  │ Categorias ▼ │  │ Contas ▼   │             [📥 Importar]  │
│  └─────────┘  └──────────────┘  └────────────┘                             │
│                                                                             │
│  ☐ Mostrar ignoradas    ☐ Apenas não categorizadas                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Transaction List

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  📅 15 de Dezembro, Segunda-feira                                          │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ☐  ┌─────┐  Supermercado Extra                   🍽️ Alimentação          │
│     │ PIX │  Compras do mês                       -R$ 234,56               │
│     └─────┘  Nubank •••4321                                                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ☐  ┌─────┐  Uber                                 🚗 Transporte            │
│     │DÉBITO│  Viagem para trabalho                -R$ 18,90                │
│     └─────┘  Itaú •••5678                                                  │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ☐  ┌─────┐  Transferência Recebida               📥 Receita               │
│     │ TED │  Salário                              +R$ 5.000,00             │
│     └─────┘  Nubank •••4321                                                │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  📅 14 de Dezembro, Domingo                                                │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                             │
│  ☐  ┌─────┐  Restaurante Sabor                    ⚠️ Não categorizada     │
│     │DÉBITO│  RESTAURANTE SABOR LTDA              -R$ 89,00                │
│     └─────┘  Itaú •••5678                         [Categorizar ▼]          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Grouped by Date

Instead of a flat table, group transactions by date:
- Creates natural visual breaks
- Easier to find specific days
- Reduces overwhelming wall-of-data feeling

### 2. Card-Based Rows

Each transaction is a mini-card:
- More breathing room than table cells
- Room for metadata (account, type)
- Hover actions visible on interaction

### 3. Quick Category Dropdown

Uncategorized transactions show inline dropdown:
- No modal needed for simple categorization
- Shows most-used categories first
- "Create rule" option for recurring transactions

### 4. Checkbox for Bulk Actions

Selection checkboxes enable bulk operations:
- Categorize multiple at once
- Mark multiple as ignored
- Delete multiple

---

## Component Specifications

### Summary Bar

```tsx
function TransactionSummaryBar({ month, year, income, expenses, balance }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-warm-sm p-6">
      {/* Month selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h2 text-stone-900">
          {formatMonth(month, year)}
        </h2>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-stone-100 rounded-lg">
            <ChevronLeftIcon className="h-5 w-5 text-stone-500" />
          </button>
          <button className="p-2 hover:bg-stone-100 rounded-lg">
            <ChevronRightIcon className="h-5 w-5 text-stone-500" />
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-3 gap-6">
        <div>
          <p className="text-caption text-stone-500 mb-1">📥 Receitas</p>
          <p className="text-h3 text-sage-700 tabular-nums">{formatCurrency(income)}</p>
        </div>
        <div>
          <p className="text-caption text-stone-500 mb-1">📤 Despesas</p>
          <p className="text-h3 text-rust-600 tabular-nums">{formatCurrency(expenses)}</p>
        </div>
        <div>
          <p className="text-caption text-stone-500 mb-1">💰 Saldo</p>
          <p className={`text-h3 tabular-nums ${balance >= 0 ? 'text-sage-700' : 'text-rust-600'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  );
}
```

### Filter Bar

```tsx
function TransactionFilters({ filters, onChange }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder="Buscar transações..."
          className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-body focus:ring-2 focus:ring-wheat-500 focus:border-transparent"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Category filter */}
      <select className="px-4 py-2 border border-stone-300 rounded-lg text-body bg-white">
        <option value="">Todas categorias</option>
        <option value="uncategorized">⚠️ Não categorizadas</option>
        {categories.map(cat => (
          <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
        ))}
      </select>

      {/* Account filter */}
      <select className="px-4 py-2 border border-stone-300 rounded-lg text-body bg-white">
        <option value="">Todas contas</option>
        {accounts.map(acc => (
          <option key={acc.id} value={acc.id}>{acc.name}</option>
        ))}
      </select>

      {/* Action buttons */}
      <div className="flex items-center gap-2 ml-auto">
        <button className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg font-medium">
          📥 Importar OFX
        </button>
        <button className="px-4 py-2 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg font-medium">
          + Adicionar
        </button>
      </div>
    </div>
  );
}
```

### Transaction Row

```tsx
interface TransactionRowProps {
  transaction: Transaction;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onCategoryChange: (categoryId: string) => void;
  onClick: () => void;
}

function TransactionRow({ transaction, isSelected, onSelect, onCategoryChange, onClick }: TransactionRowProps) {
  const isUncategorized = !transaction.categoryId;
  const isIgnored = transaction.ignored;
  const isIncome = transaction.type === 'credit';

  return (
    <div
      className={`
        group flex items-center gap-4 px-4 py-3 rounded-lg
        transition-colors cursor-pointer
        ${isIgnored ? 'opacity-50 bg-stone-50' : 'hover:bg-stone-50'}
        ${isSelected ? 'bg-wheat-50 hover:bg-wheat-100' : ''}
      `}
      onClick={onClick}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => {
          e.stopPropagation();
          onSelect(e.target.checked);
        }}
        className="h-4 w-4 rounded border-stone-300 text-wheat-500 focus:ring-wheat-500"
      />

      {/* Transaction type badge */}
      <div className={`
        px-2 py-1 rounded text-tiny font-medium uppercase
        ${isIncome ? 'bg-sage-100 text-sage-700' : 'bg-stone-100 text-stone-600'}
      `}>
        {transaction.paymentType || (isIncome ? 'CRÉD' : 'DÉB')}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <p className={`text-body text-stone-900 truncate ${isIgnored ? 'line-through' : ''}`}>
          {transaction.description}
        </p>
        <p className="text-tiny text-stone-500 truncate">
          {transaction.memo || transaction.rawDescription}
        </p>
      </div>

      {/* Account */}
      <div className="hidden md:block text-body-sm text-stone-500">
        {transaction.accountName}
      </div>

      {/* Category */}
      <div className="w-40">
        {isUncategorized ? (
          <QuickCategorySelect
            onSelect={onCategoryChange}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-stone-100 text-stone-700 rounded-lg text-body-sm">
            <span>{transaction.category?.icon}</span>
            {transaction.category?.name}
          </span>
        )}
      </div>

      {/* Amount */}
      <div className={`
        text-body font-medium tabular-nums text-right w-28
        ${isIncome ? 'text-sage-600' : 'text-stone-900'}
      `}>
        {isIncome ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
      </div>

      {/* Actions (on hover) */}
      <div className="w-8 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="p-1 hover:bg-stone-200 rounded">
          <MoreVerticalIcon className="h-4 w-4 text-stone-500" />
        </button>
      </div>
    </div>
  );
}
```

### Quick Category Select

```tsx
function QuickCategorySelect({ onSelect, categories, recentCategories }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="
          inline-flex items-center gap-1.5 px-3 py-1.5
          bg-terra-50 text-terra-700 border border-terra-200
          rounded-lg text-body-sm font-medium
          hover:bg-terra-100 transition-colors
        "
      >
        <ExclamationIcon className="h-4 w-4" />
        Categorizar
        <ChevronDownIcon className="h-3 w-3" />
      </button>

      {isOpen && (
        <div className="
          absolute right-0 mt-2 w-56 py-2
          bg-white rounded-xl border border-stone-200 shadow-warm-lg
          z-10
        ">
          {/* Recent categories */}
          {recentCategories.length > 0 && (
            <>
              <p className="px-4 py-1 text-tiny text-stone-500 uppercase">Recentes</p>
              {recentCategories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    onSelect(cat.id);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-stone-50 flex items-center gap-2"
                >
                  <span>{cat.icon}</span>
                  <span className="text-body text-stone-700">{cat.name}</span>
                </button>
              ))}
              <div className="my-2 border-t border-stone-100" />
            </>
          )}

          {/* All categories */}
          <p className="px-4 py-1 text-tiny text-stone-500 uppercase">Todas</p>
          <div className="max-h-48 overflow-y-auto">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  onSelect(cat.id);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left hover:bg-stone-50 flex items-center gap-2"
              >
                <span>{cat.icon}</span>
                <span className="text-body text-stone-700">{cat.name}</span>
              </button>
            ))}
          </div>

          {/* Create rule option */}
          <div className="mt-2 pt-2 border-t border-stone-100">
            <button className="w-full px-4 py-2 text-left hover:bg-stone-50 text-body-sm text-wheat-600">
              ⚡ Criar regra para este tipo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Date Group Header

```tsx
function DateGroupHeader({ date, transactionCount, totalAmount }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-stone-50 rounded-lg mb-2">
      <CalendarIcon className="h-4 w-4 text-stone-400" />
      <span className="text-body font-medium text-stone-700">
        {formatDate(date, 'full')}
      </span>
      <span className="text-body-sm text-stone-500">
        {transactionCount} transações
      </span>
      <span className="ml-auto text-body-sm text-stone-600 tabular-nums">
        {formatCurrency(totalAmount)}
      </span>
    </div>
  );
}
```

---

## Bulk Actions Bar

When transactions are selected, show a floating action bar:

```tsx
function BulkActionsBar({ selectedCount, onCategorize, onIgnore, onDelete, onClear }) {
  return (
    <div className="
      fixed bottom-6 left-1/2 -translate-x-1/2
      flex items-center gap-4 px-6 py-3
      bg-stone-900 text-white rounded-full shadow-warm-xl
      animate-slide-up
    ">
      <span className="text-body">
        {selectedCount} selecionadas
      </span>

      <div className="w-px h-6 bg-stone-700" />

      <button
        onClick={onCategorize}
        className="px-3 py-1.5 hover:bg-stone-800 rounded-lg text-body-sm"
      >
        🏷️ Categorizar
      </button>

      <button
        onClick={onIgnore}
        className="px-3 py-1.5 hover:bg-stone-800 rounded-lg text-body-sm"
      >
        🚫 Ignorar
      </button>

      <button
        onClick={onDelete}
        className="px-3 py-1.5 hover:bg-rust-700 rounded-lg text-body-sm text-rust-300"
      >
        🗑️ Excluir
      </button>

      <div className="w-px h-6 bg-stone-700" />

      <button
        onClick={onClear}
        className="p-1.5 hover:bg-stone-800 rounded-lg"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
```

---

## Import Flow

### OFX Import Modal

```tsx
function ImportOFXModal({ onClose, accounts }) {
  const [file, setFile] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [preview, setPreview] = useState(null);

  return (
    <Modal onClose={onClose} title="Importar Transações">
      <div className="space-y-6">
        {/* Step 1: File upload */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            1. Selecione o arquivo OFX
          </label>
          <div className={`
            border-2 border-dashed rounded-xl p-8 text-center
            ${file ? 'border-sage-300 bg-sage-50' : 'border-stone-300 hover:border-stone-400'}
            transition-colors cursor-pointer
          `}>
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <DocumentIcon className="h-8 w-8 text-sage-500" />
                <div className="text-left">
                  <p className="text-body text-stone-900">{file.name}</p>
                  <p className="text-tiny text-stone-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="ml-4 p-1 hover:bg-sage-100 rounded"
                >
                  <XIcon className="h-4 w-4 text-stone-500" />
                </button>
              </div>
            ) : (
              <>
                <UploadIcon className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                <p className="text-body text-stone-600">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p className="text-tiny text-stone-400 mt-1">
                  Aceita arquivos .ofx
                </p>
              </>
            )}
            <input type="file" accept=".ofx" className="hidden" />
          </div>
        </div>

        {/* Step 2: Account selection */}
        <div>
          <label className="text-caption text-stone-700 font-medium mb-2 block">
            2. Selecione a conta
          </label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="w-full px-4 py-2.5 border border-stone-300 rounded-lg"
          >
            <option value="">Selecione uma conta</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>

        {/* Preview */}
        {preview && (
          <div className="p-4 bg-stone-50 rounded-lg">
            <p className="text-caption text-stone-600 mb-2">Prévia da importação:</p>
            <p className="text-body text-stone-900">
              {preview.count} transações encontradas
            </p>
            <p className="text-body-sm text-stone-600">
              Período: {preview.startDate} a {preview.endDate}
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
          disabled={!file || !selectedAccount}
          className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg disabled:opacity-50"
        >
          Importar
        </button>
      </div>
    </Modal>
  );
}
```

---

## Empty State

```tsx
function EmptyTransactions() {
  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mb-6">
        <ReceiptIcon className="h-8 w-8 text-stone-400" />
      </div>
      <h3 className="text-h3 text-stone-700 mb-2">
        Nenhuma transação este mês
      </h3>
      <p className="text-body text-stone-500 max-w-sm mx-auto mb-8">
        Importe suas transações do banco ou adicione manualmente para começar a organizar suas finanças.
      </p>
      <div className="flex items-center justify-center gap-4">
        <button className="px-4 py-2.5 border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-lg font-medium">
          📥 Importar OFX
        </button>
        <button className="px-4 py-2.5 bg-wheat-500 text-white hover:bg-wheat-600 rounded-lg font-medium">
          + Adicionar transação
        </button>
      </div>
    </div>
  );
}
```

---

## Keyboard Shortcuts

For power users:

| Shortcut | Action |
|----------|--------|
| `j` / `k` | Navigate up/down in list |
| `x` | Toggle selection |
| `c` | Open category dropdown |
| `e` | Edit selected transaction |
| `i` | Toggle ignore status |
| `/` | Focus search |
| `Esc` | Clear selection |

---

## Implementation Checklist

- [ ] Create `TransactionSummaryBar` component
- [ ] Create `TransactionFilters` component
- [ ] Create `TransactionRow` component
- [ ] Create `QuickCategorySelect` dropdown
- [ ] Create `DateGroupHeader` component
- [ ] Create `BulkActionsBar` component
- [ ] Create `ImportOFXModal` component
- [ ] Implement transaction grouping by date
- [ ] Add bulk selection logic
- [ ] Add keyboard navigation
- [ ] Implement responsive layout
- [ ] Add empty state
- [ ] Add loading skeletons
