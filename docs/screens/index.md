# Frontend Screens Documentation

Overview of all application screens and their behaviors.

## Screen Map

| Screen | File | Description |
|--------|------|-------------|
| [Login](./login.md) | `Login.tsx` | Authentication (magic link / password) |
| [Dashboard](./dashboard.md) | `Dashboard.tsx` | Financial overview and alerts |
| [Transactions](./transactions.md) | `TransactionList.tsx` | Transaction list with OFX import |
| [Budgets](./budgets.md) | `CategoryBudgetDashboard.tsx` | Budget planning and tracking |
| [Savings Goals](./savings-goals.md) | `SavingsGoalsPage.tsx` | Long-term savings tracking |
| [Settings](./settings.md) | `SettingsPage.tsx` | Configuration hub (5 tabs) |

## Modal Components

Reusable modal components used across screens. See [modals.md](./modals.md).

## Navigation Flow

```
Login → Dashboard
           ↓
    ┌──────┼──────┬──────────┐
    ↓      ↓      ↓          ↓
Transactions  Budgets  Goals  Settings
    ↓          ↓              ↓
    └── Shared Month Navigation ──┘
```

## Shared State

| State | Hook | Screens |
|-------|------|---------|
| Month/Year selection | `useSelectedMonth` | Transactions, Budgets |
| Auth token | `useAuth` | All screens |
| Organization | `useOrganization` | All authenticated screens |

## File Locations

| Type | Path |
|------|------|
| Screens | `frontend/src/components/` |
| Modals | `frontend/src/components/` |
| Hooks | `frontend/src/hooks/` |
| API clients | `frontend/src/api/` |
| Types | `frontend/src/types/` |
