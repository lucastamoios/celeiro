# Documentation

For detailed documentation, see [docs/index.md](./docs/index.md).

Key documents:
- [Architecture](./docs/architecture.md) - System overview, tech stack, data flows
- [Database](./docs/database.md) - Schema, tables, relationships
- [Domains](./docs/domains.md) - Entity models and operations
- [Conventions](./docs/conventions.md) - Naming, patterns, gotchas

---

# Services Architecture

## 🏛️ Service & Repository Boundaries

### Critical Rule: Single Responsibility Per Layer

**Each service/repository ONLY accesses its own domain tables. No cross-domain JOINs or direct table access.**

### ❌ BAD Examples (Violates Boundaries)

```go
// ❌ UserRepository accessing transactions table directly
func (r *UserRepository) GetUserWithTransactionCount(ctx context.Context, userID uuid.UUID) error {
    query := `
        SELECT u.*, COUNT(t.transaction_id) as tx_count
        FROM users u
        LEFT JOIN accounts a ON a.user_id = u.user_id
        LEFT JOIN transactions t ON t.account_id = a.account_id
        WHERE u.user_id = $1
    `
    // WRONG - UserRepository should never touch transactions table
}

// ❌ TransactionService directly querying users table
func (s *TransactionService) GetTransactionsWithUserName(ctx context.Context) error {
    query := `
        SELECT t.*, u.name 
        FROM transactions t
        JOIN accounts a ON a.account_id = t.account_id
        JOIN users u ON u.user_id = a.user_id
    `
    // WRONG - Should use UserService instead
}
```

### ✅ GOOD Examples (Respects Boundaries)

```go
// ✅ Each repository only touches its own table
type UserRepository struct {
    db *sqlx.DB
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
    query := `SELECT * FROM users WHERE user_id = $1`
    // CORRECT - Only accesses users table
}

type TransactionRepository struct {
    db *sqlx.DB
}

func (r *TransactionRepository) ListByAccount(ctx context.Context, accountID uuid.UUID) ([]*domain.Transaction, error) {
    query := `SELECT * FROM transactions WHERE account_id = $1`
    // CORRECT - Only accesses transactions table
}
```

### Service Composition Pattern

When you need data from multiple domains, use **service composition**:

#### Pattern 1: Pass Required IDs (Preferred)

```go
// ✅ BEST - Transaction already has user_id/account_id
// No need to fetch user at all
func (s *TransactionService) ImportFromOFX(ctx context.Context, file []byte, accountID uuid.UUID, userID uuid.UUID) error {
    transactions := s.ofxParser.Parse(file)
    
    // Enrich with IDs passed from caller
    for _, tx := range transactions {
        tx.AccountID = accountID
        // userID can be stored in context or passed separately if needed
    }
    
    return s.transactionRepo.BulkInsert(ctx, transactions)
}
```

#### Pattern 2: Call Services Sequentially (When IDs Not Available)

```go
// ✅ GOOD - Each service handles its own domain
type DashboardService struct {
    userService        *UserService
    transactionService *TransactionService
    budgetService      *BudgetService
}

func (s *DashboardService) GetMonthlyReport(ctx context.Context, userID uuid.UUID, month, year int) (*Report, error) {
    // 1. Get user info
    user, err := s.userService.GetByID(ctx, userID)
    if err != nil {
        return nil, fmt.Errorf("get user: %w", err)
    }
    
    // 2. Get transaction summary (only needs userID)
    txSummary, err := s.transactionService.GetMonthlySummary(ctx, userID, month, year)
    if err != nil {
        return nil, fmt.Errorf("get transactions: %w", err)
    }
    
    // 3. Get budget data
    budgets, err := s.budgetService.ListByMonth(ctx, userID, month, year)
    if err != nil {
        return nil, fmt.Errorf("get budgets: %w", err)
    }
    
    // 4. Compose result
    return &Report{
        User:           user,
        Transactions:   txSummary,
        Budgets:        budgets,
    }, nil
}
```

#### Pattern 3: Orchestrator Service (When Complex)

```go
// ✅ GOOD - Create dedicated orchestrator for complex workflows
type ReportService struct {
    transactionService *TransactionService
    budgetService      *BudgetService
    categoryService    *CategoryService
}

// This service coordinates multiple domains but respects boundaries
func (s *ReportService) GenerateAnnualReport(ctx context.Context, userID uuid.UUID, year int) error {
    // Call each service independently
    // Each service only touches its own tables
    // Orchestrator combines results
}
```

### Repository Access Rules

**Table Ownership Matrix:**

| Repository | Can Access Tables | Cannot Access |
|------------|-------------------|---------------|
| UserRepository | `users` | accounts, transactions, budgets, categories |
| AccountRepository | `accounts` | users, transactions |
| TransactionRepository | `transactions` | users, accounts, categories |
| CategoryRepository | `categories` | users, transactions |
| BudgetRepository | `budgets`, `budget_items` | users, transactions, categories |
| RuleRepository | `classification_rules` | users, transactions, categories |

### When You Need Cross-Domain Data

**Decision Tree:**

1. **Does the target entity already have the ID you need?**
   - YES → Just pass the ID, no service call needed
   - NO → Go to step 2

2. **Is this a simple lookup (one entity)?**
   - YES → Call the other service once
   - NO → Go to step 3

3. **Is this complex orchestration (multiple entities)?**
   - YES → Create an Orchestrator/Coordinator service
   - Example: `DashboardService`, `ReportService`, `AnalyticsService`

### Practical Examples

#### ❌ WRONG: Repository doing JOINs

```go
// TransactionRepository trying to get user info
func (r *TransactionRepository) GetWithUserInfo(ctx context.Context, txID uuid.UUID) error {
    query := `
        SELECT t.*, u.name, u.email
        FROM transactions t
        JOIN accounts a ON t.account_id = a.account_id
        JOIN users u ON a.user_id = u.user_id
        WHERE t.transaction_id = $1
    `
    // WRONG - Repository crossing boundaries
}
```

#### ✅ CORRECT: Service composition

```go
// Handler layer orchestrates
func (h *TransactionHandler) GetTransaction(w http.ResponseWriter, r *http.Request) {
    txID := chi.URLParam(r, "id")
    
    // 1. Get transaction (only tx data)
    tx, err := h.transactionService.GetByID(ctx, txID)
    if err != nil {
        // handle error
    }
    
    // 2. If you need user info, call UserService
    user, err := h.userService.GetByID(ctx, tx.UserID) // if tx has UserID
    if err != nil {
        // handle error
    }
    
    // 3. Compose response
    response := map[string]interface{}{
        "transaction": tx,
        "user":        user,
    }
    json.NewEncoder(w).Encode(response)
}
```

#### ✅ BETTER: Avoid cross-service calls when possible

```go
// Transaction already knows its accountID
// Account already knows its userID
// So pass userID down from the start

func (h *TransactionHandler) Import(w http.ResponseWriter, r *http.Request) {
    userID := getUserIDFromContext(r.Context()) // From JWT
    accountID := r.URL.Query().Get("accountId")
    
    // Pass both IDs - no need to look up user
    err := h.transactionService.ImportFromOFX(ctx, file, accountID, userID)
    // Service never needs to call UserService
}
```

### Key Principles

1. **Repository = Single Table** - Each repo only touches one table (except its owned children like budgets → budget_items)

2. **Service = Single Domain** - Each service only calls its own repository + other services if needed

3. **Prefer Passing IDs** - If you already have the ID, don't fetch the entity

4. **Orchestrator for Complex** - Create dedicated services like DashboardService, ReportService for multi-domain operations

5. **Handler as Thin Coordinator** - Handlers can call multiple services, but keep logic minimal

### When to Break the Rule?

**Only these exceptions are allowed:**

1. **Parent-Child relationships in same domain:**
   ```go
   // ✅ OK - budgets owns budget_items
   func (r *BudgetRepository) GetWithItems(ctx context.Context, id uuid.UUID) error {
       query := `
           SELECT b.*, bi.*
           FROM budgets b
           LEFT JOIN budget_items bi ON bi.budget_id = b.budget_id
           WHERE b.budget_id = $1
       `
       // OK because budget_items belongs to budgets domain
   }
   ```

2. **Read-only reference data via FK (rare):**
   ```go
   // ✅ Acceptable - Just getting category name for display
   func (r *TransactionRepository) ListWithCategoryName(ctx context.Context, accountID uuid.UUID) error {
       query := `
           SELECT t.*, c.name as category_name
           FROM transactions t
           LEFT JOIN categories c ON c.category_id = t.category_id
           WHERE t.account_id = $1
       `
       // Acceptable IF you only need the name for display
       // But prefer calling CategoryService if you need more category data
   }
   ```

### Summary

**Think of services as microservices:**
- Each has its own database (even though they share the same physical DB)
- Communication happens via service calls, not direct table access
- This makes the code easier to:
  - Understand (clear boundaries)
  - Test (mock service dependencies)
  - Refactor (move to actual microservices later if needed)
  - Debug (logs show service call chains)

**Golden Rule: If you're tempted to JOIN tables from different domains, STOP and call the other service instead.**

---

## 🚀 Deployment

### Quick Reference

| Action | How |
|--------|-----|
| Deploy code | `git push origin master` — Dokploy auto-deploys on push |
| Manual redeploy | Dokploy UI → Celeiro project → Backend/Frontend → Redeploy |
| View logs | Dokploy UI → Celeiro → Backend → Logs |
| Manage env vars | Dokploy UI → Celeiro → Backend → Environment |

### Architecture

Deployed via **Dokploy** (self-hosted PaaS). Each service is a separate Dokploy application with its own domain:

| Service | Domain | Dokploy app name |
|---------|--------|-----------------|
| Frontend | `celeiro.laguiar.dev` | `celeiro-frontend-exivdl` |
| Backend | `api.celeiro.laguiar.dev` | `celeiro-backend-dac5dd` |
| Redis | internal only | `celeiro-redis-ayzgq6` |
| Postgres | internal only | `celeiro-postgres-qxbvyc` |

**No path-based routing** — frontend and backend are fully separate domains. The frontend build receives `VITE_API_URL=https://api.celeiro.laguiar.dev` as a build arg.

### Adding New Backend Routes

Just add the route in `backend/internal/web/router.go` — no proxy config changes needed since the backend has its own domain (`api.celeiro.laguiar.dev`).

### Chrome Extension API URL

The extension must point to `https://api.celeiro.laguiar.dev` (not `celeiro.laguiar.dev`, which is the frontend).

### External Services

**Resend (Email)**:
- Dashboard: https://resend.com/emails
- Inbound webhook: `POST /webhooks/email/inbound`
- **Important**: Use `/emails/receiving/:id/attachments/:id` for inbound email attachments (not `/emails/:id/...`)

See [docs/deployment.md](./docs/deployment.md) for full details.

---

## ⏰ Timezone Handling

**Critical**: Always use `time.Now().UTC()` when storing timestamps in PostgreSQL.

```go
// ❌ BAD - Local time interpreted as UTC by Postgres
expiresAt := time.Now().Add(7 * 24 * time.Hour)

// ✅ GOOD - Explicit UTC
expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
```

PostgreSQL stores `TIMESTAMP` without timezone info. If you pass local time, it's stored as-is but compared against UTC later, causing bugs (e.g., invitations expiring immediately).

---

## Design Context

### Users

Brazilian family providers (primarily fathers) who earn enough but lack financial visibility. They carry the weight of providing for their families and need a tool that respects that responsibility — not a flashy fintech app, but a serious stewardship instrument. They use Celeiro to import bank transactions (OFX), categorize spending, plan budgets, and gain clarity on where money goes each month.

### Brand Personality

**Conviction-driven, Warm, Grounded**

- **Voice**: Direct and paternal — speaks to the user as a fellow steward, not a consumer. Uses conviction ("é sua RESPONSABILIDADE") without being preachy. Frames financial management as an act of love and family leadership, not lifestyle optimization.
- **Emotional goals**: Clarity over anxiety, confidence over guilt, stewardship over spending.
- **Core metaphor**: *Celeiro* (granary/storehouse) — like Joseph in Egypt, it's about knowing exactly what you have, what you need, and what to save. The wheat motif runs through the entire visual language.
- **Tagline**: "Para quem foi chamado a prover, não apenas a ganhar."

### Aesthetic Direction

- **Visual tone**: Warm, earthy, intentional — cream backgrounds with golden wheat accents. Premium but not flashy. Feels like a well-made leather-bound ledger, not a Silicon Valley dashboard.
- **Design system**: "Provision Design System" — warm cream palette (stone), golden accents (wheat), muted forest green (sage) for success, burnt orange (terra) for warnings, warm rust (rust) for errors.
- **Typography**: Lora (serif) for display/headings — evokes tradition and weight. Nunito Sans for body — clean and readable.
- **Interactions**: Tactile button press effect (bottom-edge border + translateY on active) — playful but purposeful.
- **Theme**: Light mode only. No dark mode planned.
- **Anti-patterns**: Avoid neon colors, gamification, "fintech bro" aesthetics, cold blue/gray corporate dashboards, overly playful illustrations.

### Design Principles

1. **Clarity over cleverness** — Every element should make the user's financial picture clearer. If a design choice adds visual interest but obscures information, remove it.
2. **Warmth signals trust** — Use warm earth tones (cream, gold, brown) to create a sense of reliability and care. Cold, clinical interfaces feel impersonal for family finance.
3. **Tactile and grounded** — Interactions should feel physical (button press effects, subtle shadows). The interface should feel like a well-organized desk, not a floating cloud dashboard.
4. **Numbers are sacred** — Financial data gets tabular nums, careful alignment, and clear hierarchy. Currency displays use consistent formatting (`.tabular-nums`, dedicated size classes).
5. **Accessible by default** — WCAG AA compliance. 4.5:1 contrast ratios, visible focus indicators, semantic HTML, keyboard-navigable components.

### Key Design Tokens Reference

| Token | Value | Use |
|-------|-------|-----|
| Page bg | `--bg-0` #F6F1E9 | Page background |
| Card bg | `--bg-1` #FFFDF8 | Cards, inputs |
| Accent | `--accent` #C6943A | Primary actions, active states |
| Accent dark | `--accent-dark` #A67A2A | Button borders, hover |
| Text primary | `--text-1` #3D2B1F | Headings |
| Text body | `--text-2` #6B5744 | Body copy |
| Card radius | `--r-md` 12px | Card corners |
| Button radius | `--r-sm` 8px | Button corners |
| Logo | `celeiro-wheat-v4.svg` | Two-tone wheat, 25° tilt |