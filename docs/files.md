# Key Files

## Quick Lookup (AI Reference)

| If you need to... | Look in... |
|-------------------|------------|
| Add API route | `backend/internal/web/router.go` |
| Handle HTTP request | `backend/internal/web/{domain}/handler.go` |
| Add business logic | `backend/internal/application/{domain}/service.go` |
| Query database | `backend/internal/application/{domain}/repository.go` |
| Add migration | `backend/internal/migrations/` (use `goose create`) |
| Add React page | `frontend/src/components/` + update `App.tsx` |
| Add API client | `frontend/src/api/` |
| Modify auth flow | `backend/internal/application/accounts/auth.go` |
| Parse OFX files | `backend/internal/application/financial/ofx_parser.go` |
| Pattern matching | `backend/internal/application/financial/matching.go` |

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
| Dashboard | Dashboard, BudgetProgressCard, BudgetPacingWidget, IncomePlanningAlert |
| Transactions | TransactionList, TransactionEditModal, TransactionCreateModal, UncategorizedTransactions |
| Categories | CategoryManager, CategoryBudgetDashboard, CategoryTransactionsModal |
| Budgets | MonthlyBudgetCard, BudgetItemForm, CategoryBudgetCard |
| Planned Entries | PlannedEntryCard, PlannedEntryForm, PlannedEntryLinkModal |
| Patterns | PatternCreator, PatternManager, TransactionMatcherModal |
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
| Budgets | financial/budget_progress.go (includes controllable pacing) | CategoryBudgetDashboard.tsx |
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

## Key Service Methods (AI Reference)

### Financial Service (`financial/service.go`)

| Method | Purpose |
|--------|---------|
| CreateCategory | Add new category |
| ListCategories | Get all categories for org |
| ImportTransactionsFromOFX | Parse OFX and insert transactions |
| UpdateTransaction | Modify transaction (category, description, etc.) |
| GetUncategorizedTransactions | Get transactions needing classification |
| CreateCategoryBudget | Set monthly budget for category |
| CreatePlannedEntry | Add expected expense/income |
| MatchTransactionToEntry | Link transaction to planned entry |
| CreatePattern | Add regex-based categorization rule |
| CreateSavingsGoal | Create savings target |

### Accounts Service (`accounts/service.go`)

| Method | Purpose |
|--------|---------|
| RequestMagicCode | Send 4-digit auth code via email |
| Authenticate | Validate code and create session |
| GetByID | Get user with org memberships |
| CreateOrganization | Create new org for user |
| InviteMember | Send org invitation |
| AcceptInvite | Join organization |

### Repository Naming Pattern

| Prefix | Use |
|--------|-----|
| Fetch* | SELECT queries (one or many) |
| Insert* | INSERT queries |
| Modify* | UPDATE queries |
| Remove* | DELETE queries |
