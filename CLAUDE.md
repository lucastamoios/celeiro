<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

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

| Action | Command |
|--------|---------|
| Deploy code | `git push origin master` (auto-deployed via GitHub Actions) |
| Deploy Caddyfile | `cd ~/Code/Work/vodsafe && make master-staging` |
| View logs | `ssh master-staging` then `docker logs -f celeiro_backend` |
| Manual redeploy | Go to GitHub Actions → "Build and Deploy" → "Run workflow" |

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Deployment Flow                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  git push master ──► GitHub Actions (.github/workflows/deploy.yml)  │
│                              │                                       │
│                              ▼                                       │
│                    1. Build Docker images                            │
│                    2. Push to ghcr.io                                │
│                    3. SSH to server                                  │
│                    4. Copy docker-compose.prod.yml                   │
│                    5. Create .env from GitHub Secrets                │
│                    6. docker compose up -d                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        Server Architecture                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Internet → Caddy (HTTPS) ──► Docker containers                      │
│                    │                                                 │
│   celeiro.catru.tech:                                                │
│     ├── /auth/*, /financial/*, etc → backend:9080                   │
│     └── /* → frontend:9081                                           │
│                                                                      │
│   backoffice.catru.tech:                                             │
│     ├── /api/* → backend:9080 (uri strip_prefix /api)               │
│     └── /* → backoffice:9082                                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Separation of Concerns

| Component | Managed By | Location |
|-----------|------------|----------|
| Container deployment | GitHub Actions | `celeiro/.github/workflows/deploy.yml` |
| Docker Compose | Git (celeiro repo) | `celeiro/docker-compose.prod.yml` |
| Secrets | GitHub Secrets | Settings → Secrets → Actions |
| Caddyfile routing | Ansible (vodsafe repo) | `vodsafe/infra/roles/master/templates/Caddyfile.j2` |

### GitHub Secrets Required

These secrets must be set in GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `SSH_HOST` | Server IP (5.161.217.193) |
| `SSH_USER` | SSH user (vodsafe) |
| `SSH_KEY` | SSH private key for deployment |
| `DB_USER` | PostgreSQL user |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_NAME` | PostgreSQL database name |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_WEBHOOK_SECRET` | Resend webhook validation secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |

### Adding New Backend Routes

1. Add route in `backend/internal/web/router.go`
2. If new path prefix (e.g., `/newpath/*`), add to Caddyfile:
   - Edit `vodsafe/infra/roles/master/templates/Caddyfile.j2`
   - Add path to `@api` matcher (for celeiro.catru.tech)
   - Run `make master-staging` from vodsafe repo

### Backoffice API Pattern

Backoffice uses `/api` prefix for all backend calls:
- Frontend calls: `/api/auth/validate/`, `/api/backoffice/users`, etc.
- Caddy strips `/api` prefix before proxying to backend
- Backend sees: `/auth/validate/`, `/backoffice/users`, etc.

This is configured in:
- `backoffice/src/api/config.ts` - adds `/api` prefix in production
- `backoffice/.dockerignore` - excludes `.env` so production build uses `/api`

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