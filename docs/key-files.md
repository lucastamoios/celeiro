# Key Files Map

Quick reference for finding files when implementing common tasks.

## Backend Structure

```
backend/
├── cmd/                    # Entry points (not commonly modified)
├── internal/
│   ├── application/        # Business logic layer
│   │   ├── accounts/       # Auth, users, organizations
│   │   └── financial/      # Core financial logic (MOST WORK HERE)
│   ├── web/                # HTTP handlers
│   │   ├── router.go       # All API routes defined here
│   │   ├── accounts/       # Auth handlers
│   │   └── financial/      # Financial API handlers
│   └── migrations/         # SQL migrations (Goose)
└── pkg/                    # Reusable packages
```

## Frontend Structure

```
frontend/src/
├── App.tsx                 # Main routing
├── api/                    # API client functions
├── components/             # All UI components
├── contexts/               # React context (auth)
└── types/                  # TypeScript interfaces
```

---

## Common Tasks

### Add New API Endpoint

1. **Define route**: `backend/internal/web/router.go`
2. **Add handler**: `backend/internal/web/financial/handler.go` (or accounts/)
3. **Add service method**: `backend/internal/application/financial/service.go`
4. **Add repository method**: `backend/internal/application/financial/repository.go`

### Add New Database Table

1. **Create migration**: `backend/internal/migrations/XXXXX_name.sql`
2. **Add model**: `backend/internal/application/financial/models.go`
3. **Add DTO**: `backend/internal/application/financial/dto.go`
4. **Add repository methods**: `backend/internal/application/financial/repository.go`

### Add New React Component

1. **Create component**: `frontend/src/components/NewComponent.tsx`
2. **Add types**: `frontend/src/types/` (if shared)
3. **Add API call**: `frontend/src/api/` (if new endpoint)
4. **Import in App.tsx** or parent component

### Modify Transaction Import (OFX)

- **Parser**: `backend/internal/application/financial/ofx_parser.go`
- **Tests**: `backend/internal/application/financial/ofx_parser_test.go`
- **Import endpoint**: Handler calls `ImportOFX` -> Service -> Repository

### Modify Budget Calculations

- **Budget progress logic**: `backend/internal/application/financial/budget_progress.go`
- **Tests**: `backend/internal/application/financial/budget_progress_test.go`
- **Budget types**: fixed, calculated, maior (max of fixed or sum of planned entries)

### Modify Pattern Matching

- **Core matching logic**: `backend/internal/application/financial/matching.go`
- **Matching service**: `backend/internal/application/financial/matching_service.go`
- **Advanced patterns**: `backend/internal/application/financial/advanced_patterns_service.go`
- **Tests**: `backend/internal/application/financial/matching_test.go`

---

## Key Files by Domain

### Authentication

| Purpose | File |
|---------|------|
| Auth service | `backend/internal/application/accounts/service.go` |
| Auth handlers | `backend/internal/web/accounts/handlers.go` |
| Session middleware | `backend/internal/web/middlewares/session.go` |
| Login UI | `frontend/src/components/Login.tsx` |

### Transactions

| Purpose | File |
|---------|------|
| Transaction models | `backend/internal/application/financial/models.go` |
| Transaction service | `backend/internal/application/financial/service.go` |
| Transaction repository | `backend/internal/application/financial/repository.go` |
| OFX parser | `backend/internal/application/financial/ofx_parser.go` |
| Transaction list UI | `frontend/src/components/TransactionList.tsx` |

### Categories

| Purpose | File |
|---------|------|
| Category models | `backend/internal/application/financial/models.go` |
| Category endpoints | Look for `ListCategories`, `CreateCategory` in service/handler |

### Budgets

| Purpose | File |
|---------|------|
| Budget models | `backend/internal/application/financial/models.go` |
| Budget progress | `backend/internal/application/financial/budget_progress.go` |
| Category budget dashboard | `frontend/src/components/CategoryBudgetDashboard.tsx` |
| Budget card | `frontend/src/components/CategoryBudgetCard.tsx` |

### Planned Entries

| Purpose | File |
|---------|------|
| Planned entry models | `backend/internal/application/financial/models.go` |
| Planned entry form | `frontend/src/components/PlannedEntryForm.tsx` |
| Monthly instances | Look for `GenerateMonthlyInstances` in service |

### Pattern Matching

| Purpose | File |
|---------|------|
| Pattern matching core | `backend/internal/application/financial/matching.go` |
| Advanced patterns | `backend/internal/application/financial/advanced_patterns_service.go` |
| Pattern creator UI | `frontend/src/components/AdvancedPatternCreator.tsx` |
| Pattern manager UI | `frontend/src/components/PatternManager.tsx` |
| Match suggestions UI | `frontend/src/components/MatchSuggestions.tsx` |

---

## API Routes Quick Reference

All routes defined in `backend/internal/web/router.go`:

```
/auth/request/              POST  Request magic link
/auth/validate/             POST  Validate magic code
/accounts/me/               GET   Get current user

/financial/categories       GET   List categories
/financial/categories       POST  Create category
/financial/accounts         GET   List accounts
/financial/accounts         POST  Create account
/financial/accounts/{id}/transactions     GET   List transactions
/financial/accounts/{id}/transactions/import POST Import OFX

/financial/budgets/categories         GET   List category budgets
/financial/budgets/categories         POST  Create category budget
/financial/budgets/categories/{id}    PUT   Update category budget

/financial/planned-entries            GET   List planned entries
/financial/planned-entries            POST  Create planned entry
/financial/planned-entries/{id}/generate POST Generate monthly instance

/financial/advanced-patterns          GET   List advanced patterns
/financial/advanced-patterns          POST  Create advanced pattern

/financial/match-suggestions          GET   Get match suggestions
/financial/transactions/{id}/apply-pattern    POST Apply pattern
/financial/transactions/{id}/save-as-pattern  POST Save as pattern
```

---

## Configuration Files

| Purpose | File |
|---------|------|
| Backend env vars | `backend/.env.dev` |
| Frontend env vars | `frontend/.env` |
| Docker compose | `backend/docker-compose.yml` |
| Makefile | `backend/Makefile` |
