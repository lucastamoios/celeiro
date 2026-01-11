# Budgets Screen (CategoryBudgetDashboard)

**File:** `frontend/src/components/CategoryBudgetDashboard.tsx`

## Purpose

Monthly budget planning and tracking. Manage category budgets, planned entries, and match transactions.

## What the User Sees

### Month Navigation Header

- Previous/Next month arrows
- Current month name and year
- "Mês atual" badge if viewing current month
- "Hoje" button to return to current month
- Action buttons: "+ Entrada", "+ Orçamento"

### Monthly Summary Card

| Metric | Description |
|--------|-------------|
| Planejado | Sum of planned amounts (expenses only) |
| Gasto | Sum of actual spending (expenses only) |
| Progresso | Percentage bar with color-coded status |

Quick stats footer:
- Number of categories
- Number of planned entries
- "Copiar do mês anterior" link (if previous month has budgets and current is empty)

### MonthlyBudgetCard

Renders via `MonthlyBudgetCard.tsx`. Shows:

**Category Budgets (Expense)**
- Category icon, name, color
- Planned vs actual amount
- Progress bar with health indicator
- Variance percentage
- Edit/Delete actions
- Click opens CategoryTransactionsModal

**Category Budgets (Income)**
- Similar to expenses but tracked separately
- Shows actual income vs planned

**Planned Entries Section**
- List of expected transactions
- Status badges: pending, matched, dismissed, missed
- Expected day/range
- Amount or amount range
- Linked savings goal indicator
- Actions: match, unmatch, dismiss, undismiss, edit, delete

### Empty State

When no budgets/entries:
- Icon placeholder
- "Nenhum orçamento para {month} {year}"
- "Copiar do mês anterior" button (if applicable)
- "Criar Orçamento" button

## Modals

### Create/Edit Budget Modal

Fields:
- **Categoria**: Dropdown (disabled when editing)
- **Tipo de Orçamento**: fixed, calculated, maior
- **Valor Planejado**: Required for fixed, optional for others

See [modals.md](./modals.md) for PlannedEntryForm details.

### Transaction Matcher Modal

Opens when clicking "match" on a planned entry. Shows:
- Transactions for the same month
- Filter by category
- Search by description
- Select to link

### CategoryTransactionsModal

Opens when clicking a category budget card. Shows:
- Actual vs planned amounts
- List of transactions in that category
- List of planned entries in that category
- Click-through to edit transactions/entries

## Data Sources

| Data | Source |
|------|--------|
| Category budgets | `getCategoryBudgets()` |
| Planned entries | `getPlannedEntriesForMonth()` |
| Categories | `GET /financial/categories` |
| Transactions | `GET /financial/accounts/{id}/transactions` |
| Savings goals | `listSavingsGoals()` |

## Business Rules

### Actual Spending Calculation

For "Maior" budget type, actual = Planned Entries + Unmatched Transactions:

1. Build set of matched transaction IDs per month
2. Add planned entry amounts (expenses only, not dismissed)
   - Use `MatchedAmount` if matched, else `Amount`
3. Add unmatched transaction amounts (debits only)
4. Income categories tracked separately via credit transactions

### Budget Types

| Type | Behavior |
|------|----------|
| `fixed` | User sets planned amount manually |
| `calculated` | Sum of linked planned entries |
| `maior` | Max of fixed amount or sum of entries |

### Planned Entry Status

| Status | Meaning |
|--------|---------|
| `pending` | Not yet matched, expected date not passed |
| `matched` | Linked to a transaction |
| `dismissed` | User dismissed (excluded from calculations) |
| `missed` | Expected date passed, not matched |

### Consolidation

Locks a budget to prevent changes. Used for closing past months.

## Click Behaviors

| Element | Action |
|---------|--------|
| Category budget card | Opens CategoryTransactionsModal |
| "+ Orçamento" | Opens create budget modal |
| "+ Entrada" | Opens create planned entry modal |
| Edit budget icon | Opens edit budget modal |
| Delete budget icon | Deletes budget (with confirmation in delete month) |
| Match entry | Opens TransactionMatcherModal |
| Unmatch entry | Calls `unmatchPlannedEntry()`, refreshes spending |
| Dismiss entry | Calls `dismissPlannedEntry()`, refreshes spending |
| Undismiss entry | Calls `undismissPlannedEntry()`, refreshes spending |
| "Copiar do mês anterior" | Calls `copyCategoryBudgetsFromMonth()` |
| Consolidate | Locks budgets via `consolidateCategoryBudget()` |

## Links to Other Features

- **Transactions**: Via CategoryTransactionsModal click-through
- **Savings Goals**: Linked to planned entries
- **Patterns**: Advanced patterns can auto-create planned entries
- **Dashboard**: Budget data displayed on dashboard
