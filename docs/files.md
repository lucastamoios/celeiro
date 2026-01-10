# Key Files

Quick reference for locating files by feature.

## Backend Structure

```
backend/internal/
├── application/
│   ├── accounts/           Auth domain
│   │   ├── service.go      User/org business logic
│   │   ├── auth.go         Magic link authentication
│   │   └── session.go      Redis session management
│   └── financial/          Main domain (most code here)
│       ├── service.go      Business logic
│       ├── repository.go   Data access
│       ├── models.go       Domain models
│       ├── dto.go          Data transfer objects
│       ├── matching.go     Pattern matching core
│       ├── budget_progress.go
│       ├── ofx_parser.go   OFX file parsing
│       └── income_planning.go
├── web/
│   ├── router.go           All route definitions
│   ├── accounts/           Auth handlers
│   ├── financial/          Financial handlers
│   └── middlewares/        Session, logging
└── migrations/             SQL migrations (Goose)
```

## Frontend Structure

```
frontend/src/
├── App.tsx                 Main routing
├── api/                    API client functions
├── components/
│   ├── Dashboard.tsx
│   ├── CategoryManager.tsx
│   ├── CategoryBudgetDashboard.tsx
│   ├── TransactionList.tsx
│   ├── TransactionEditModal.tsx
│   ├── AdvancedPatternCreator.tsx
│   ├── PatternManager.tsx
│   └── Login.tsx
├── contexts/
│   └── AuthContext.tsx     Auth state
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
| UI | - | TransactionList.tsx |

### Budgets

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | financial/models.go | - |
| Progress | financial/budget_progress.go | - |
| UI | - | CategoryBudgetDashboard.tsx |

### Pattern Matching

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Core | financial/matching.go | - |
| Service | financial/matching_service.go | - |
| Advanced | financial/advanced_patterns_service.go | - |
| UI | - | AdvancedPatternCreator.tsx, PatternManager.tsx |

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

## Common Tasks

| Task | Files to modify |
|------|-----------------|
| Add API endpoint | router.go, handler.go, service.go, repository.go |
| Add database table | migrations/, models.go, dto.go, repository.go |
| Add React component | components/, App.tsx (routing) |
