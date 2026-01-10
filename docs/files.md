# Key Files

Quick reference for locating files by feature.

## Backend Structure

```
backend/internal/
├── application/
│   ├── accounts/           Auth & user domain
│   │   ├── service.go      User/org business logic
│   │   ├── auth.go         Magic link, password, OAuth
│   │   ├── session.go      Redis session management
│   │   ├── invites.go      Organization invitations
│   │   └── repository.go   User/org data access
│   └── financial/          Main domain
│       ├── service.go      Core business logic
│       ├── repository.go   Data access
│       ├── models.go       Domain models
│       ├── dto.go          Data transfer objects
│       ├── matching.go     Pattern matching core
│       ├── budget_progress.go
│       ├── ofx_parser.go   OFX file parsing
│       ├── income_planning.go
│       ├── savings_goals.go
│       └── tags.go
├── web/
│   ├── router.go           All route definitions
│   ├── accounts/           Auth, org, invite handlers
│   ├── financial/          Financial handlers
│   ├── webhooks/           Email inbound webhook
│   ├── middlewares/        Session, auth, logging
│   ├── validators/         Input validation
│   └── responses/          Response formatting
├── migrations/             SQL migrations (Goose)
├── config/                 Configuration
└── tests/                  Integration tests
```

## Frontend Structure

```
frontend/src/
├── App.tsx                 Main routing
├── api/                    API client modules
│   ├── auth.ts
│   ├── budget.ts
│   ├── transactions.ts
│   ├── savingsGoals.ts
│   └── tags.ts
├── components/
│   ├── Dashboard.tsx
│   ├── CategoryManager.tsx
│   ├── CategoryBudgetDashboard.tsx
│   ├── TransactionList.tsx
│   ├── TransactionEditModal.tsx
│   ├── PlannedEntryCard.tsx
│   ├── PlannedEntryForm.tsx
│   ├── AdvancedPatternCreator.tsx
│   ├── PatternManager.tsx
│   ├── SavingsGoalsPage.tsx
│   ├── TagManager.tsx
│   ├── Login.tsx
│   └── ui/                 Reusable components
├── contexts/
│   ├── AuthContext.tsx     Auth state
│   └── OrganizationContext.tsx
├── hooks/
│   ├── useSelectedMonth.ts
│   ├── usePersistedState.ts
│   ├── useModalDismiss.ts
│   └── useDropdownClose.ts
└── types/                  TypeScript interfaces
```

## Files by Feature

### Categories

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | types/ |
| Service | financial/service.go | - |
| Handler | web/financial/handler.go | - |
| UI | - | CategoryManager.tsx |

### Transactions

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Service | financial/service.go | - |
| OFX Parser | financial/ofx_parser.go | - |
| UI | - | TransactionList.tsx, TransactionEditModal.tsx |

### Budgets

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Progress | financial/budget_progress.go | - |
| UI | - | CategoryBudgetDashboard.tsx, BudgetProgressCard.tsx |

### Planned Entries

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Service | financial/service.go | - |
| UI | - | PlannedEntryCard.tsx, PlannedEntryForm.tsx |

### Pattern Matching

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Core | financial/matching.go | - |
| Service | financial/service.go | - |
| UI | - | AdvancedPatternCreator.tsx, PatternManager.tsx |

### Savings Goals

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Service | financial/savings_goals.go | - |
| API | - | api/savingsGoals.ts |
| UI | - | SavingsGoalsPage.tsx, SavingsGoalCard.tsx |

### Tags

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Service | financial/tags.go | - |
| API | - | api/tags.ts |
| UI | - | TagManager.tsx, TagSelector.tsx |

### Authentication

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Service | accounts/auth.go | - |
| Session | accounts/session.go | - |
| Handler | web/accounts/handlers.go | - |
| Middleware | web/middlewares/middleware.go | - |
| UI | - | Login.tsx |
| Context | - | contexts/AuthContext.tsx |

## Configuration Files

| Purpose | File |
|---------|------|
| Backend env | backend/.env.dev |
| Frontend env | frontend/.env |
| Docker compose | backend/docker-compose.yml |
| Makefile | Makefile (root) |
| GitHub Actions | .github/workflows/docker-publish.yml |

## Common Tasks

| Task | Files to modify |
|------|-----------------|
| Add API endpoint | router.go, handler.go, service.go, repository.go |
| Add database table | migrations/, models.go, dto.go, repository.go |
| Add React component | components/, App.tsx (routing) |
| Add new domain feature | models.go, service.go, repository.go, handler.go, frontend component |
