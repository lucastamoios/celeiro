# Key Files Map

Quick reference for finding files when implementing common tasks.

## Backend Structure

```
backend/internal/
├── application/
│   ├── accounts/           # Auth domain
│   │   ├── service.go      # User/org business logic
│   │   ├── auth.go         # Magic link authentication
│   │   └── session.go      # Redis session management
│   └── financial/          # MAIN DOMAIN - most work here
│       ├── service.go      # Business logic (45K lines)
│       ├── repository.go   # Data access (56K lines)
│       ├── models.go       # Domain models
│       ├── dto.go          # Data transfer objects
│       ├── matching.go     # Pattern matching core
│       ├── matching_service.go
│       ├── advanced_patterns_service.go
│       ├── budget_progress.go
│       ├── ofx_parser.go   # OFX file parsing
│       └── income_planning.go
├── web/
│   ├── router.go           # ALL route definitions
│   ├── accounts/           # Auth HTTP handlers
│   ├── financial/          # Financial HTTP handlers
│   └── middlewares/        # Session, logging middleware
└── migrations/             # SQL migrations (Goose format)
```

## Frontend Structure

```
frontend/src/
├── App.tsx                 # Main routing and layout
├── api/                    # API client functions
├── components/
│   ├── Dashboard.tsx               # Main dashboard
│   ├── CategoryManager.tsx         # Category CRUD + patterns
│   ├── CategoryBudgetDashboard.tsx # Budget overview
│   ├── TransactionList.tsx         # Transaction list
│   ├── TransactionEditModal.tsx    # Edit transaction
│   ├── AdvancedPatternCreator.tsx  # Create patterns
│   ├── PatternManager.tsx          # Manage patterns
│   ├── UncategorizedTransactions.tsx
│   ├── MatchSuggestions.tsx
│   └── Login.tsx
├── contexts/
│   └── AuthContext.tsx     # Auth state management
└── types/                  # TypeScript interfaces
```

---

## Common Tasks

### Add New API Endpoint

1. **Route**: `backend/internal/web/router.go`
2. **Handler**: `backend/internal/web/financial/handler.go`
3. **Service method**: `backend/internal/application/financial/service.go`
4. **Repository method**: `backend/internal/application/financial/repository.go`

### Add New Database Table

1. **Migration**: `backend/internal/migrations/XXXXX_name.sql`
2. **Model**: `backend/internal/application/financial/models.go`
3. **DTO**: `backend/internal/application/financial/dto.go`
4. **Repository**: `backend/internal/application/financial/repository.go`

### Add New React Component

1. **Component**: `frontend/src/components/NewComponent.tsx`
2. **Types**: `frontend/src/types/` (if shared)
3. **API call**: `frontend/src/api/` (if new endpoint)
4. **Import**: In `App.tsx` or parent component

---

## Key Files by Feature

### Categories

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | `financial/models.go` (CategoryModel) | `types/` |
| Service | `financial/service.go` (GetCategories, CreateCategory) | - |
| Handler | `web/financial/handler.go` (ListCategories) | - |
| UI | - | `CategoryManager.tsx` |

### Transactions

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | `financial/models.go` (TransactionModel) | - |
| Service | `financial/service.go` | - |
| OFX Parser | `financial/ofx_parser.go` | - |
| UI | - | `TransactionList.tsx`, `TransactionEditModal.tsx` |

### Budgets

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Model | `financial/models.go` (CategoryBudgetModel) | - |
| Budget Progress | `financial/budget_progress.go` | - |
| Service | `financial/service.go` | - |
| UI | - | `CategoryBudgetDashboard.tsx`, `BudgetProgressCard.tsx` |

### Pattern Matching

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Core matching | `financial/matching.go` | - |
| Matching service | `financial/matching_service.go` | - |
| Advanced patterns | `financial/advanced_patterns_service.go` | - |
| Pattern UI | - | `AdvancedPatternCreator.tsx`, `PatternManager.tsx` |
| Suggestions UI | - | `MatchSuggestions.tsx` |

### Authentication

| Purpose | Backend | Frontend |
|---------|---------|----------|
| Auth service | `accounts/auth.go` | - |
| Session | `accounts/session.go` | - |
| Handler | `web/accounts/handlers.go` | - |
| Middleware | `web/middlewares/middleware.go` | - |
| UI | - | `Login.tsx` |
| Context | - | `contexts/AuthContext.tsx` |

---

## Configuration Files

| Purpose | File |
|---------|------|
| Backend env | `backend/.env.dev` |
| Frontend env | `frontend/.env` |
| Docker compose | `backend/docker-compose.yml` |
| Backend Makefile | `backend/Makefile` |
| Root Makefile | `Makefile` |

---

## Test Files

Tests are co-located with source files:

| Source | Test |
|--------|------|
| `service.go` | `service_test.go` |
| `matching.go` | `matching_test.go` |
| `budget_progress.go` | `budget_progress_test.go` |
| `ofx_parser.go` | `ofx_parser_test.go` |
| `matching_service.go` | `matching_service_test.go` |
