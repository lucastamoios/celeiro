# Transactions Screen

**File:** `frontend/src/components/TransactionList.tsx`

## Purpose

View, manage, and import financial transactions. Supports OFX file import, bulk operations, and filtering.

## What the User Sees

### Month Navigation Header

Same pattern as Budgets screen:
- Previous/Next month arrows
- Month name and year
- Transaction count (filtered / total)
- "Mês atual" badge
- "Hoje" button
- Action buttons: "Nova Transação", "Importar OFX"

### Filters Bar

Inline checkboxes:
- **Sem categoria**: Show only uncategorized transactions
- **Ocultar ignoradas**: Hide ignored transactions
- **Selecionar todas / Desmarcar todas**: Toggle bulk selection

### Bulk Actions Bar

Appears when transactions are selected:
- Selection count with clear button
- **Definir categoria**: Dropdown to set category on all selected
- **Ignorar**: Mark selected as ignored
- **Restaurar**: Unmark selected as ignored

### Summary Cards

Three cards for current month:
- **Receitas**: Sum of credit transactions (green)
- **Despesas**: Sum of debit transactions (red)
- **Saldo**: Income - Expenses (green if positive, red if negative)

### Transaction List

**Mobile (card view)**:
- Checkbox, description, amount
- Date, category badge, ignored badge
- Tap card to edit

**Desktop (table view)**:
- Checkbox column with select-all header
- Date | Description | Amount | Category columns
- Hover highlights row
- Click row to edit

### Drag & Drop Zone

Full-screen overlay when dragging files:
- "Solte os arquivos OFX aqui"
- Processes multiple files

### Success/Error Messages

Toast-style alerts for:
- Import results: "X transações importadas (Y duplicadas)"
- Bulk action results: "X transações atualizadas!"
- Errors: Red alert with retry info

## Data Sources

| Data | Endpoint |
|------|----------|
| Accounts | `GET /financial/accounts` |
| Categories | `GET /financial/categories` |
| Transactions | `GET /financial/accounts/{id}/transactions` |

## Business Rules

### Month Filtering

Transactions filtered by `selectedMonth` and `selectedYear` from `useSelectedMonth` hook.

### Totals Calculation

- Only non-ignored transactions counted
- Credits → Income
- Debits → Expenses
- Balance = Income - Expenses

### OFX Import

1. Files dropped or selected via input
2. Only `.ofx` files processed
3. Each file uploaded to `POST /accounts/{id}/transactions/import`
4. Response includes `ImportedCount` and `DuplicateCount`
5. Transaction list refreshed after import

### Bulk Operations

All bulk operations call `PATCH /accounts/{accountId}/transactions/{id}`:
- Category change: `{ category_id: number | null }`
- Ignore/Restore: `{ is_ignored: boolean }`

### Filter Persistence

Filters stored in `localStorage` via `usePersistedFilters` hook.

## Click Behaviors

| Element | Action |
|---------|--------|
| Transaction row/card | Opens TransactionEditModal |
| Checkbox | Toggles selection (stops propagation) |
| "Nova Transação" | Opens TransactionCreateModal |
| "Importar OFX" | Opens file picker |
| "Selecionar todas" | Selects all visible transactions |
| "Definir categoria" dropdown item | Sets category on selected |
| "Ignorar" | Marks selected as ignored |
| "Restaurar" | Unmarks selected as ignored |

## Modals

### TransactionEditModal

See [modals.md](./modals.md#transactioneditmodal)

### TransactionCreateModal

See [modals.md](./modals.md#transactioncreatemodal)

## Links to Other Features

- **Categories**: Used for classification
- **Budgets**: Transactions counted in actual spending
- **Planned Entries**: Can be linked via edit modal
- **Patterns**: Can create patterns from transaction
- **Tags**: Can add tags to transactions
