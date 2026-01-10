# Key Files

## Backend Structure

```
backend/internal/
├── application/
│   ├── accounts/           Auth & user domain
│   │   ├── service.go      User/org business logic
│   │   ├── auth.go         Magic link, password, OAuth
│   │   ├── session.go      Redis sessions
│   │   ├── invites.go      Invitations
│   │   └── repository.go   Data access
│   └── financial/          Main domain
│       ├── service.go      Core business logic
│       ├── repository.go   Data access
│       ├── models.go       Domain models
│       ├── dto.go          Data transfer objects
│       ├── matching.go     Pattern matching
│       ├── budget_progress.go
│       ├── ofx_parser.go
│       ├── savings_goals.go
│       └── tags.go
├── web/
│   ├── router.go           Route definitions
│   ├── accounts/           Auth handlers
│   ├── financial/          Financial handlers
│   ├── webhooks/           Email webhook
│   └── middlewares/        Auth, logging
├── migrations/             SQL migrations
└── tests/                  Integration tests
```

## Frontend Structure

```
frontend/src/
├── App.tsx                 Routing
├── api/                    API clients
├── components/             UI components (~32 total)
├── contexts/               Auth, Organization
├── hooks/                  useSelectedMonth, usePersistedState, etc.
└── types/                  TypeScript interfaces
```

### Component Categories

| Category | Components |
|----------|------------|
| Dashboard | Dashboard, BudgetProgressCard, IncomePlanningAlert |
| Transactions | TransactionList, TransactionEditModal, TransactionCreateModal, UncategorizedTransactions |
| Categories | CategoryManager, CategoryBudgetDashboard, CategoryTransactionsModal |
| Budgets | MonthlyBudgetCard, BudgetItemForm, CategoryBudgetCard |
| Planned Entries | PlannedEntryCard, PlannedEntryForm, PlannedEntryLinkModal |
| Patterns | AdvancedPatternCreator, PatternManager, TransactionMatcherModal |
| Savings | SavingsGoalsPage, SavingsGoalCard |
| Tags | TagManager, TagSelector |
| Auth | Login, AcceptInvite |
| Settings | AccountSettings, OrganizationSettings, SettingsPage |
| Organization | OrganizationSwitcher, InviteMemberModal |
| UI | ui/ folder (buttons, inputs, modals) |

## Files by Feature

| Feature | Backend | Frontend |
|---------|---------|----------|
| Categories | financial/models.go, service.go | CategoryManager.tsx |
| Transactions | financial/service.go, ofx_parser.go | TransactionList.tsx |
| Budgets | financial/budget_progress.go | CategoryBudgetDashboard.tsx |
| Planned Entries | financial/service.go | PlannedEntryCard.tsx |
| Patterns | financial/matching.go | PatternManager.tsx |
| Savings Goals | financial/savings_goals.go | SavingsGoalsPage.tsx |
| Tags | financial/tags.go | TagManager.tsx |
| Auth | accounts/auth.go, session.go | Login.tsx, AuthContext.tsx |

## Configuration

| Purpose | File |
|---------|------|
| Backend env | backend/.env.dev |
| Frontend env | frontend/.env |
| Docker | backend/docker-compose.yml |
| Makefile | Makefile (root) |
| CI/CD | .github/workflows/docker-publish.yml |

## Common Tasks

| Task | Files to modify |
|------|-----------------|
| Add API endpoint | router.go → handler → service → repository |
| Add database table | migrations/ → models.go → dto.go → repository |
| Add React component | components/ + App.tsx (if page) |
