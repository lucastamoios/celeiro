# Dashboard Screen

**File:** `frontend/src/components/Dashboard.tsx`

## Purpose

Main financial overview showing current month's summary, budget status, and actionable alerts.

## What the User Sees

### Hero Status Card

Shows overall budget health with three states:

| Status | Condition | Message | Color |
|--------|-----------|---------|-------|
| On-track | ≤80% spent | "Você está no caminho certo!" | Green (sage) |
| Warning | 80-100% spent | "Atenção ao orçamento" | Orange (terra) |
| Over-budget | >100% spent | "Orçamento excedido" | Red (rust) |
| No budget | 0 planned | "Configure seu orçamento" | Gray (stone) |

Displays:
- Available amount (or "acima do limite" if negative)
- Actual vs planned spending
- Percentage used
- Progress bar with day-of-month marker (vertical line)
- Spending pace indicator (ahead/behind expected for current day)
- End-of-month projection

### Attention Section

Only appears when there are items needing action:

| Item | Trigger | Action |
|------|---------|--------|
| Uncategorized transactions | Count > 0 | "Categorizar" button → navigates to UncategorizedTransactions |
| Missed planned entries | Status = 'missed' | Informational alert |
| Over-budget categories | Actual > Planned | Shows badge "Excedido" |

### Quick Stats Cards

Three cards showing current month totals:
- **Receitas** (Income): Sum of credit transactions
- **Despesas** (Expenses): Sum of debit transactions
- **Saldo** (Balance): Income - Expenses (green if positive, red if negative)

### Category Expenses Section

Shows top 8 expense categories with:
- Category icon and name
- Amount spent
- Progress bar (colored by budget health)
- Day-of-month marker for budgeted categories
- Percentage of budget (if budgeted) or percentage of total (if not)
- Pace indicator (+X% or -X% vs expected)

### Planned Entries Summary

Footer showing planned entry status:
- Matched (green dot)
- Pending (orange dot)
- Missed (red dot) - only if > 0

### All Organized Message

Shows green "Tudo Organizado!" card when:
- No uncategorized transactions
- No attention items

## Data Sources

| Data | API Endpoint |
|------|--------------|
| Accounts | `GET /financial/accounts` |
| Categories | `GET /financial/categories` |
| Transactions | `GET /financial/accounts/{id}/transactions` (per account) |
| Uncategorized | `GET /financial/transactions/uncategorized` |
| Category budgets | `getCategoryBudgets()` |
| Planned entries | `getPlannedEntriesForMonth()` |

## Business Rules

1. **Month Selection**: Uses most recent transaction date, falls back to current date
2. **Ignored Transactions**: Excluded from all calculations
3. **Income Categories**: Excluded from expense budget progress bar
4. **Day Progress**: Calculated as `currentDay / daysInMonth`
5. **Expected Spending**: `totalPlanned * dayProgressPercent / 100`
6. **Spending Pace**: `(actual - expected) / expected * 100`

## Click Behaviors

| Element | Action |
|---------|--------|
| "Categorizar" button | Calls `onNavigateToUncategorized()` prop |
| Category expense row | No action (view only) |

## Links to Other Features

- **Uncategorized Transactions**: Via "Categorizar" button
- **Budgets**: Budget data displayed but no direct navigation
- **Planned Entries**: Status shown in summary
