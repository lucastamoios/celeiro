# Architecture

System architecture and design patterns for Celeiro.

## System Layers

Celeiro is built with **two complementary layers**:

1. **Authentication & Authorization Layer** - User management, roles, permissions
2. **Financial Management Layer** - Accounts, transactions, budgets

See [auth-system.md](./auth-system.md) for authentication details.

## Backend Architecture

**Pattern: Repository → Service → Handler**

```
┌─────────────┐
│   Handler   │  HTTP layer - Chi router
│   (web/)    │
└──────┬──────┘
       │
┌──────▼──────┐
│   Service   │  Business logic
│  (service/) │
└──────┬──────┘
       │
┌──────▼──────┐
│ Repository  │  Data access - SQLX
│(repository/)│
└──────┬──────┘
       │
┌──────▼──────┐
│ PostgreSQL  │
└─────────────┘
```

## Request Flow Example

**Transaction Import Flow:**

1. `POST /api/v1/transactions/import` → `TransactionHandler.Import()`
2. Handler validates request and extracts file
3. Handler calls `TransactionService.ImportFromOFX(ctx, file, accountID)`
4. Service uses `OFXParser.Parse(file)` to extract transactions
5. Service calls `TransactionRepository.BulkInsert(ctx, transactions)`
6. Repository executes `INSERT ... ON CONFLICT (account_id, ofx_fitid) DO NOTHING`
7. Returns count of inserted vs duplicates

## Service Boundaries

Each service and repository ONLY accesses its own domain tables. See [CLAUDE.md](../CLAUDE.md) for detailed service boundary rules.

**Key Principle:** No cross-domain JOINs in repositories. Use service composition instead.

### Example: Getting Dashboard Data

```go
// ❌ BAD - Repository doing cross-domain JOIN
func (r *TransactionRepository) GetWithUserInfo(ctx context.Context) {
    query := `SELECT t.*, u.name FROM transactions t JOIN users u...`
    // WRONG - crosses domain boundaries
}

// ✅ GOOD - Service composition
func (s *DashboardService) GetMonthlyReport(ctx context.Context, userID int) (*Report, error) {
    // Each service touches only its own domain
    user, _ := s.userService.GetByID(ctx, userID)
    txSummary, _ := s.transactionService.GetMonthlySummary(ctx, userID, month, year)
    budgets, _ := s.budgetService.ListByMonth(ctx, userID, month, year)

    return &Report{User: user, Transactions: txSummary, Budgets: budgets}, nil
}
```

## Frontend Architecture

**Component Structure:**

- `pages/` - Route-level components (Dashboard, Transactions, Budgets)
- `components/` - Reusable UI (TransactionTable, CategoryPicker, BudgetCard)
- `services/` - API clients (axios wrappers)
- `types/` - Shared TypeScript interfaces

**State Management:**

- React Context API for global state (auth, current user)
- Component state for local UI state
- React Query (future) for server state caching

## Data Model Overview

### Layer 1: Auth & Organizations
```
users ← user_organizations → organizations
  ↓
roles → permissions
```

### Layer 2: Financial Management
```
organizations → accounts → transactions → categories
users → budgets → budget_items
users → classification_rules
```

**Key Integration:**
- Accounts linked to both `user_id` (owner) and `organization_id` (scope)
- Financial data isolated by organization
- Current: 1 user = 1 organization (auto-created)
- Future: Multi-user organizations (shared finances)

See [database.md](./database.md) for complete unified schema.

## Directory Structure

```
celeiro/
├── backend/              # Go API + PostgreSQL
│   ├── cmd/             # Entry points
│   ├── internal/        # Private application code
│   │   ├── domain/      # Entities and interfaces
│   │   ├── repository/  # Data access layer
│   │   ├── service/     # Business logic layer
│   │   └── web/         # HTTP handlers
│   ├── migrations/      # SQL migrations (Goose)
│   └── pkg/             # Reusable packages
│       └── ofx/         # OFX parser
├── frontend/            # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route-level pages
│   │   ├── services/    # API clients
│   │   └── types/       # TypeScript interfaces
│   └── public/
├── docs/                # Documentation
└── .beads/              # Beads issue tracking
```

## Key Design Decisions

### 1. Repository Pattern

**Why:** Separates data access from business logic, makes testing easier

- Each repository handles ONE table (plus child tables like budget → budget_items)
- No business logic in repositories
- Returns domain entities, not DB-specific types

### 2. Service Layer for Business Logic

**Why:** Centralizes business rules, coordinates multiple repositories

- Services can call other services
- Services contain transaction boundaries
- Services handle complex calculations (budget types, classification rules)

### 3. Thin HTTP Handlers

**Why:** Keeps HTTP concerns separate from business logic

- Handlers do: validation, auth, request/response mapping
- Handlers don't do: business logic, direct DB access

### 4. SQLX over ORM

**Why:**
- Full control over SQL queries
- No N+1 query problems
- Easier to optimize performance
- Named parameters for safety

### 5. Budget Type Flexibility

Three budget types support different user preferences:

```go
type BudgetType string

const (
    BudgetTypeFixed      BudgetType = "fixed"      // User sets amount
    BudgetTypeCalculated BudgetType = "calculated" // Sum of items
    BudgetTypeHybrid     BudgetType = "hybrid"     // max(fixed, sum(items))
)
```

**Calculation logic:**

```go
func (b *Budget) CalculateFinalAmount() decimal.Decimal {
    itemsSum := b.CalculateItemsSum()

    switch b.Type {
    case BudgetTypeFixed:
        return b.Amount
    case BudgetTypeCalculated:
        return itemsSum
    case BudgetTypeHybrid:
        return max(b.Amount, itemsSum)
    }
}
```

## Security Architecture

### Authentication (Passwordless)

- **Magic codes** (4-digit, 10-minute expiration)
- **Email-based** login (no passwords)
- **Auto-registration** for new users
- **Session tokens** stored in Redis
- **Validated** on every API request

See [auth-system.md](./auth-system.md) for complete details.

### Authorization (RBAC)

- **User context** extracted from session
- **Middleware** adds session to request context
- **Services** enforce organization boundaries
- **Database constraints** prevent cross-organization access

**Session Context:**
```go
type SessionInfo struct {
    UserID        int
    Email         string
    Name          string
    Organizations []OrganizationWithPermissions
}
```

### Access Control Example

```go
func (h *AccountHandler) List(w http.ResponseWriter, r *http.Request) {
    session := contextual.GetSession(r.Context())

    // Get user's organization
    orgID := session.Organizations[0].OrganizationID

    // Only fetch accounts for this organization
    accounts, err := h.service.ListByOrganization(ctx, orgID)
}
```

### Data Protection

- **No passwords** (passwordless auth = no password leaks)
- **Prepared statements** prevent SQL injection
- **React auto-escaping** prevents XSS
- **CORS** configured for specific origins
- **HTTPS** enforced in production
- **Organization isolation** prevents cross-tenant data access

## Performance Considerations

### Database Indexes

Critical indexes for performance (see [database.md](./database.md) for full list):

```sql
-- Transaction lookups by account + date
CREATE INDEX idx_transactions_account_date
ON transactions(account_id, transaction_date DESC);

-- Find unclassified transactions
CREATE INDEX idx_transactions_unclassified
ON transactions(account_id) WHERE is_classified = false;

-- Monthly aggregations by category
CREATE INDEX idx_transactions_category_month
ON transactions(category_id, DATE_TRUNC('month', transaction_date));
```

### Transaction Growth

- Expected: 100 transactions/month per user
- 1,000 users × 5 years = ~6M rows
- Future: Partition by transaction_date if > 10M rows

### Query Optimization

- Pagination on all list endpoints
- Limit result sets (max 1000 rows)
- Use aggregate queries for dashboards
- Avoid N+1 queries (use JOINs or batch loading)
