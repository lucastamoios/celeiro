# Celeiro - Implementation Tasks

> Complete task list for building the Celeiro financial management system.
> Read `CLAUDE.md` for coding conventions and `docs/architecture/DATABASE.md` for schema details.

---

## 🏗️ Phase 1: Foundation & Infrastructure

### 1.1 Backend Setup
- [ ] Initialize Go module (`go mod init github.com/lucastamoios/celeiro`)
- [ ] Install core dependencies (Chi, SQLX, pgx, UUID, Goose)
- [ ] Create directory structure (`cmd/`, `internal/`, `pkg/`)
- [ ] Setup Docker Compose for PostgreSQL + Redis
- [ ] Create Makefile with common targets (run, test, migrate, lint)
- [ ] Configure environment variables (.env.example)

### 1.2 Database Setup
- [ ] Create migrations based on an approved database model
- [ ] Run all migrations to create schema
- [ ] Verify tables created correctly
- [ ] Verify system categories seeded
- [ ] Create database connection pool manager
- [ ] Setup connection health check

### 1.3 Frontend Setup
- [ ] Create React app with Vite + TypeScript (`frontend/`)
- [ ] Install and configure Tailwind CSS
- [ ] Install dependencies (axios, react-router-dom)
- [ ] Create directory structure (`components/`, `pages/`, `services/`, `types/`)
- [ ] Setup API client with axios
- [ ] Configure environment variables (.env)

---

## 📦 Phase 2: Domain Layer (Backend)

### 2.1 Domain Entities
Create Go structs in `backend/internal/application/`:

- [ ] `user.go` - User entity
  ```go
  type User struct {
      UserID       uuid.UUID
      Email        string
      Name         string
      PasswordHash string
      CreatedAt    time.Time
      UpdatedAt    time.Time
  }
  ```

- [ ] `account.go` - Account entity
  ```go
  type Account struct {
      AccountID   uuid.UUID
      UserID      uuid.UUID
      Name        string
      AccountType string // checking, savings, credit
      CreatedAt   time.Time
      UpdatedAt   time.Time
  }
  ```

- [ ] `transaction.go` - Transaction entity with FITID
  ```go
  type Transaction struct {
      TransactionID   uuid.UUID
      AccountID       uuid.UUID
      CategoryID      *uuid.UUID // nullable
      Description     string
      Amount          decimal.Decimal
      TransactionDate time.Time
      TransactionType string // debit, credit
      IsClassified    bool
      OFXFITID        string
      RawOFXData      json.RawMessage
      CreatedAt       time.Time
      UpdatedAt       time.Time
  }
  ```

- [ ] `category.go` - Category entity
  ```go
  type Category struct {
      CategoryID uuid.UUID
      UserID     *uuid.UUID // nullable for system categories
      Name       string
      Icon       string
      Color      string
      IsSystem   bool
      CreatedAt  time.Time
      UpdatedAt  time.Time
  }
  ```

- [ ] `budget.go` - Budget entity with type enum
  ```go
  type BudgetType string
  const (
      BudgetTypeFixed      BudgetType = "fixed"
      BudgetTypeCalculated BudgetType = "calculated"
      BudgetTypeHybrid     BudgetType = "hybrid"
  )
  
  type Budget struct {
      BudgetID   uuid.UUID
      UserID     uuid.UUID
      CategoryID uuid.UUID
      Month      int
      Year       int
      Amount     *decimal.Decimal // nullable for calculated
      Type       BudgetType
      CreatedAt  time.Time
      UpdatedAt  time.Time
  }
  ```

- [ ] `budget_item.go` - BudgetItem entity
  ```go
  type BudgetItem struct {
      BudgetItemID uuid.UUID
      BudgetID     uuid.UUID
      Description  string
      Amount       decimal.Decimal
      CreatedAt    time.Time
      UpdatedAt    time.Time
  }
  ```

- [ ] `classification_rule.go` - ClassificationRule entity
  ```go
  type ClassificationRule struct {
      RuleID     uuid.UUID
      UserID     uuid.UUID
      CategoryID uuid.UUID
      RuleType   string // description, amount, date, combined
      Pattern    string
      Conditions json.RawMessage
      Priority   int
      IsActive   bool
      CreatedAt  time.Time
      UpdatedAt  time.Time
  }
  ```

### 2.2 Repository Interfaces
Define interfaces in `internal/domain/`:

- [ ] `user_repository.go` interface
- [ ] `account_repository.go` interface
- [ ] `transaction_repository.go` interface (with BulkInsert method)
- [ ] `category_repository.go` interface
- [ ] `budget_repository.go` interface
- [ ] `classification_rule_repository.go` interface

---

## 🗄️ Phase 3: Repository Layer (Data Access)

Create implementations in `internal/repository/`:

### 3.1 User Repository
- [ ] `user_repository.go` - SQLX implementation
- [ ] `Create(ctx, user)` - Insert new user
- [ ] `GetByID(ctx, id)` - Fetch by UUID
- [ ] `GetByEmail(ctx, email)` - Fetch by email
- [ ] `Update(ctx, user)` - Update user data
- [ ] Unit tests: `user_repository_test.go`

### 3.2 Account Repository
- [ ] `account_repository.go` - SQLX implementation
- [ ] `Create(ctx, account)` - Insert new account
- [ ] `GetByID(ctx, id)` - Fetch by UUID
- [ ] `ListByUser(ctx, userID)` - List all user accounts
- [ ] `Update(ctx, account)` - Update account
- [ ] `Delete(ctx, id)` - Soft delete
- [ ] Unit tests: `account_repository_test.go`

### 3.3 Transaction Repository ⭐ (Critical)
- [ ] `transaction_repository.go` - SQLX implementation
- [ ] `BulkInsert(ctx, transactions)` - Batch insert with ON CONFLICT
  - Must use `INSERT ... ON CONFLICT (account_id, ofx_fitid) DO NOTHING`
  - Return counts: inserted, skipped
- [ ] `GetByID(ctx, id)` - Fetch by UUID
- [ ] `ListByAccount(ctx, accountID, filters)` - List with pagination/filters
- [ ] `ListUnclassified(ctx, accountID, limit)` - Get unclassified only
- [ ] `UpdateCategory(ctx, txID, categoryID)` - Classify transaction
- [ ] `GetMonthlyByCategory(ctx, userID, month, year)` - Aggregate for dashboard
- [ ] Unit tests: `transaction_repository_test.go`
- [ ] Integration test with testcontainers

### 3.4 Category Repository
- [ ] `category_repository.go` - SQLX implementation
- [ ] `Create(ctx, category)` - Insert category
- [ ] `GetByID(ctx, id)` - Fetch by UUID
- [ ] `ListByUser(ctx, userID)` - List user categories + system categories
- [ ] `ListSystemCategories(ctx)` - Get default 7 categories
- [ ] `Update(ctx, category)` - Update (only non-system)
- [ ] `Delete(ctx, id)` - Delete (prevent if is_system=true)
- [ ] Unit tests: `category_repository_test.go`

### 3.5 Budget Repository
- [ ] `budget_repository.go` - SQLX implementation
- [ ] `Create(ctx, budget)` - Insert budget
- [ ] `GetByID(ctx, id)` - Fetch by UUID (with items via JOIN)
- [ ] `GetByCategoryMonth(ctx, categoryID, month, year)` - Specific budget
- [ ] `ListByUserMonth(ctx, userID, month, year)` - All budgets for month
- [ ] `Update(ctx, budget)` - Update budget
- [ ] `Delete(ctx, id)` - Delete budget (cascade items)
- [ ] `CreateItem(ctx, item)` - Add budget item
- [ ] `DeleteItem(ctx, itemID)` - Remove budget item
- [ ] Unit tests: `budget_repository_test.go`

### 3.6 Classification Rule Repository
- [ ] `classification_rule_repository.go` - SQLX implementation
- [ ] `Create(ctx, rule)` - Insert rule
- [ ] `GetByID(ctx, id)` - Fetch by UUID
- [ ] `ListActiveByUser(ctx, userID)` - Get active rules ordered by priority
- [ ] `Update(ctx, rule)` - Update rule
- [ ] `SetActive(ctx, id, active)` - Enable/disable rule
- [ ] `Delete(ctx, id)` - Delete rule
- [ ] Unit tests: `classification_rule_repository_test.go`

---

## 🎯 Phase 4: Service Layer (Business Logic)

Create services in `internal/application/<service_name>`:

### 4.1 Auth Service
- [ ] `auth_service.go` - Authentication logic
- [ ] `Register(ctx, email, name, password)` - Create user + hash password
- [ ] `Login(ctx, email, password)` - Validate credentials, return token
- [ ] `ValidateToken(ctx, token)` - JWT validation
- [ ] Helper: `hashPassword(password)` - bcrypt hash
- [ ] Helper: `comparePassword(hash, password)` - bcrypt compare
- [ ] Unit tests: `auth_service_test.go`

### 4.2 Transaction Service ⭐ (Critical)
- [ ] `transaction_service.go` - Transaction business logic
- [ ] `ImportFromOFX(ctx, file, accountID)` - Parse OFX + bulk insert
  - Call OFXParser.Parse()
  - Validate transactions
  - Call TransactionRepository.BulkInsert()
  - Return summary: {inserted: N, duplicates: M}
- [ ] `ListUnclassified(ctx, accountID)` - Get unclassified for user
- [ ] `Classify(ctx, txID, categoryID)` - Manually classify
- [ ] `GetMonthlyReport(ctx, userID, month, year)` - Dashboard data
- [ ] Unit tests: `transaction_service_test.go`
- [ ] Integration test with OFX parsing

### 4.3 Classification Service
- [ ] `classification_service.go` - Auto-classification logic
- [ ] `ApplyRules(ctx, transaction)` - Match transaction against rules
  - Get active rules ordered by priority
  - Test each rule (description, amount, date, combined)
  - Return first matching categoryID
- [ ] `ClassifyUnclassified(ctx, accountID)` - Batch classify all unclassified
- [ ] Helper: `matchDescriptionRule(tx, rule)` - Regex/contains matching
- [ ] Helper: `matchAmountRule(tx, rule)` - Range matching
- [ ] Helper: `matchDateRule(tx, rule)` - Weekday/day-of-month matching
- [ ] Helper: `matchCombinedRule(tx, rule)` - AND/OR logic
- [ ] Unit tests: `classification_service_test.go`

### 4.4 Budget Service
- [ ] `budget_service.go` - Budget business logic
- [ ] `CreateBudget(ctx, budget, items)` - Create budget + items in transaction
- [ ] `GetBudget(ctx, categoryID, month, year)` - Get specific budget
- [ ] `CalculateEffectiveAmount(ctx, budget)` - Apply type logic:
  - fixed: return budget.Amount
  - calculated: sum(items.Amount)
  - hybrid: max(budget.Amount, sum(items))
- [ ] `GetBudgetStatus(ctx, categoryID, month, year)` - Compare spent vs budgeted
  - Get budget effective amount
  - Sum transactions for category/month
  - Return: {budgeted: X, spent: Y, status: "ok|warning|over"}
- [ ] `GetDashboard(ctx, userID, month, year)` - All categories status
- [ ] Unit tests: `budget_service_test.go`

### 4.5 Account Service
- [ ] `account_service.go` - Account business logic
- [ ] `CreateAccount(ctx, account)` - Create new account
- [ ] `ListAccounts(ctx, userID)` - List user accounts
- [ ] `UpdateAccount(ctx, account)` - Update account
- [ ] `DeleteAccount(ctx, id)` - Delete (cascade transactions?)
- [ ] Unit tests: `account_service_test.go`

### 4.6 Category Service
- [ ] `category_service.go` - Category business logic
- [ ] `CreateUserCategory(ctx, category)` - Create custom category
- [ ] `ListCategories(ctx, userID)` - System + user categories
- [ ] `UpdateCategory(ctx, category)` - Update (prevent system)
- [ ] `DeleteCategory(ctx, id)` - Delete (prevent system, handle FK)
- [ ] Unit tests: `category_service_test.go`

---

## 🌐 Phase 5: HTTP Layer (Handlers)

Create handlers in `internal/web/`:

### 5.1 Setup HTTP Server
- [ ] `server.go` - HTTP server setup
- [ ] Create Chi router
- [ ] Setup CORS middleware
- [ ] Setup logging middleware
- [ ] Setup auth middleware (JWT validation)
- [ ] Setup error handling middleware
- [ ] Health check endpoint: `GET /health`

### 5.2 Auth Handlers
- [ ] `auth_handler.go` - Authentication endpoints
- [ ] `POST /api/v1/auth/register` - User registration
  - Request: `{email, name, password}`
  - Response: `{user, token}`
- [ ] `POST /api/v1/auth/login` - User login
  - Request: `{email, password}`
  - Response: `{user, token}`
- [ ] Add request validation
- [ ] Add unit tests

### 5.3 Transaction Handlers ⭐ (Critical)
- [ ] `transaction_handler.go` - Transaction endpoints
- [ ] `POST /api/v1/transactions/import` - Import OFX file
  - multipart/form-data with "ofx" field
  - Query param: accountID
  - Response: `{inserted: N, skipped: M}`
- [ ] `GET /api/v1/transactions` - List transactions
  - Query params: accountID, classified (bool), limit, offset
  - Response: `{transactions: [], total: N}`
- [ ] `GET /api/v1/transactions/unclassified` - List unclassified
  - Query param: accountID
  - Response: `{transactions: []}`
- [ ] `PATCH /api/v1/transactions/:id/category` - Classify transaction
  - Request: `{categoryID}`
  - Response: `{transaction}`
- [ ] Add request validation
- [ ] Add unit tests

### 5.4 Budget Handlers
- [ ] `budget_handler.go` - Budget endpoints
- [ ] `POST /api/v1/budgets` - Create budget
  - Request: `{categoryID, month, year, amount, type, items: []}`
  - Response: `{budget}`
- [ ] `GET /api/v1/budgets` - List budgets
  - Query params: userID, month, year
  - Response: `{budgets: []}`
- [ ] `GET /api/v1/budgets/:id` - Get budget with items
  - Response: `{budget, items: []}`
- [ ] `GET /api/v1/budgets/:id/status` - Budget status
  - Response: `{budgeted, spent, status}`
- [ ] `PUT /api/v1/budgets/:id` - Update budget
- [ ] `DELETE /api/v1/budgets/:id` - Delete budget
- [ ] Add request validation
- [ ] Add unit tests

### 5.5 Category Handlers
- [ ] `category_handler.go` - Category endpoints
- [ ] `GET /api/v1/categories` - List categories
  - Response: `{categories: []}`
- [ ] `POST /api/v1/categories` - Create custom category
  - Request: `{name, icon, color}`
  - Response: `{category}`
- [ ] `PUT /api/v1/categories/:id` - Update category
- [ ] `DELETE /api/v1/categories/:id` - Delete category
- [ ] Add request validation
- [ ] Add unit tests

### 5.6 Account Handlers
- [ ] `account_handler.go` - Account endpoints
- [ ] `GET /api/v1/accounts` - List accounts
  - Response: `{accounts: []}`
- [ ] `POST /api/v1/accounts` - Create account
  - Request: `{name, accountType}`
  - Response: `{account}`
- [ ] `PUT /api/v1/accounts/:id` - Update account
- [ ] `DELETE /api/v1/accounts/:id` - Delete account
- [ ] Add request validation
- [ ] Add unit tests

### 5.7 Dashboard Handler
- [ ] `dashboard_handler.go` - Dashboard endpoint
- [ ] `GET /api/v1/dashboard` - Monthly dashboard
  - Query params: month, year
  - Response: `{categories: [{name, budgeted, spent, status}], totals: {}}`
- [ ] Add unit tests

---

## 📦 Phase 6: OFX Parser (Package)

Create OFX parser in `pkg/ofx/`:

### 6.1 OFX Parser Implementation
- [ ] `parser.go` - OFX XML parser
- [ ] `Parse(data []byte) ([]Transaction, error)` - Main parser
  - Handle OFX 1.x (SGML) and OFX 2.x (XML)
  - Extract STMTTRN entries
  - Map fields: FITID, TRNTYPE, DTPOSTED, TRNAMT, MEMO/NAME
  - Handle character encoding (latin1, utf8)
  - Return domain.Transaction structs
- [ ] `parseTransaction(node) Transaction` - Parse single STMTTRN
- [ ] `detectEncoding(data)` - Detect charset from header
- [ ] `convertToUTF8(data, encoding)` - Convert encoding
- [ ] Unit tests: `parser_test.go` with sample OFX files
  - Test debit transaction
  - Test credit transaction
  - Test malformed OFX
  - Test encoding issues

### 6.2 OFX Test Fixtures
- [ ] Create `testdata/` directory
- [ ] Add sample OFX files:
  - `debit_sample.ofx` - Checking account debit
  - `credit_sample.ofx` - Credit card transactions
  - `malformed.ofx` - Invalid OFX for error testing
- [ ] Document OFX format in comments

---

## 🎨 Phase 7: Frontend Components

Create React components in `frontend/src/components/`:

### 7.1 Core Components
- [ ] `Button.tsx` - Reusable button with variants
- [ ] `Input.tsx` - Form input with validation
- [ ] `Select.tsx` - Dropdown select
- [ ] `Modal.tsx` - Modal dialog
- [ ] `Table.tsx` - Generic table component
- [ ] `Card.tsx` - Card container
- [ ] `Badge.tsx` - Status badge (ok, warning, over)
- [ ] `Spinner.tsx` - Loading spinner

### 7.2 Transaction Components
- [ ] `TransactionTable.tsx` - Transaction list table
  - Props: transactions[], onCategoryChange
  - Columns: Date, Description, Amount, Category, Actions
  - Inline category dropdown for unclassified
- [ ] `OFXUploader.tsx` - File upload component
  - Drag-and-drop zone
  - File validation (size, type)
  - Upload progress
  - Result display (inserted/skipped)
- [ ] `TransactionFilters.tsx` - Filter controls
  - Date range picker
  - Category filter
  - Classified/unclassified toggle

### 7.3 Budget Components
- [ ] `BudgetCard.tsx` - Budget summary card
  - Props: budget, spent, status
  - Progress bar
  - Status indicator (green/yellow/red)
- [ ] `BudgetForm.tsx` - Create/edit budget form
  - Type selector (fixed/calculated/hybrid)
  - Amount input (conditional on type)
  - Items list (for calculated/hybrid)
- [ ] `BudgetItemInput.tsx` - Single budget item row
  - Description + amount inputs
  - Add/remove buttons

### 7.4 Category Components
- [ ] `CategoryPicker.tsx` - Category dropdown/picker
  - Props: value, onChange, categories[]
  - Show icon + name
  - Color indicator
- [ ] `CategoryForm.tsx` - Create/edit category form
  - Name, icon, color inputs
  - Icon picker component
- [ ] `CategoryList.tsx` - List of categories
  - System categories (read-only)
  - User categories (editable)

### 7.5 Dashboard Components
- [ ] `DashboardCard.tsx` - Summary card
  - Total budgeted vs spent
  - Month selector
- [ ] `CategoryStatusList.tsx` - List of all category statuses
  - Use BudgetCard for each category
  - Sort by status (over → warning → ok)

---

## 📱 Phase 8: Frontend Pages

Create pages in `frontend/src/pages/`:

### 8.1 Auth Pages
- [ ] `LoginPage.tsx` - Login form
  - Email + password inputs
  - Submit to `/api/v1/auth/login`
  - Store token in localStorage
  - Redirect to dashboard on success
- [ ] `RegisterPage.tsx` - Registration form
  - Email, name, password inputs
  - Submit to `/api/v1/auth/register`
  - Store token and redirect

### 8.2 Dashboard Page
- [ ] `DashboardPage.tsx` - Main dashboard
  - Month selector
  - Total summary card
  - CategoryStatusList component
  - Quick actions (import, create budget)

### 8.3 Transaction Pages
- [ ] `TransactionsPage.tsx` - Transaction list
  - TransactionTable component
  - TransactionFilters component
  - Pagination
  - "Import OFX" button → ImportPage
- [ ] `ImportPage.tsx` - OFX import
  - Account selector dropdown
  - OFXUploader component
  - Success/error display
  - "View Transactions" button

### 8.4 Budget Pages
- [ ] `BudgetsPage.tsx` - Budget list
  - Month selector
  - List of budgets with status
  - "Create Budget" button → BudgetFormPage
- [ ] `BudgetFormPage.tsx` - Create/edit budget
  - BudgetForm component
  - Save and redirect to list

### 8.5 Category Pages
- [ ] `CategoriesPage.tsx` - Category management
  - CategoryList component
  - "Create Category" button → CategoryFormPage
- [ ] `CategoryFormPage.tsx` - Create/edit category
  - CategoryForm component
  - Save and redirect to list

### 8.6 Account Pages
- [ ] `AccountsPage.tsx` - Account list
  - List of accounts with type
  - "Create Account" button
  - Edit/delete actions
- [ ] `AccountFormPage.tsx` - Create/edit account
  - Name + type inputs
  - Save and redirect

---

## 🔧 Phase 9: Frontend Services

Create API services in `frontend/src/services/`:

### 9.1 API Client Setup
- [ ] `api.ts` - Axios instance
  - Base URL from env
  - Request interceptor (add JWT token)
  - Response interceptor (handle 401)
  - Error handler

### 9.2 Auth Service
- [ ] `authService.ts` - Auth API calls
- [ ] `login(email, password)` - POST /auth/login
- [ ] `register(email, name, password)` - POST /auth/register
- [ ] `logout()` - Clear token from localStorage

### 9.3 Transaction Service
- [ ] `transactionService.ts` - Transaction API calls
- [ ] `import(file, accountId)` - POST /transactions/import
- [ ] `list(filters)` - GET /transactions
- [ ] `listUnclassified(accountId)` - GET /transactions/unclassified
- [ ] `updateCategory(id, categoryId)` - PATCH /transactions/:id/category

### 9.4 Budget Service
- [ ] `budgetService.ts` - Budget API calls
- [ ] `create(budget)` - POST /budgets
- [ ] `list(month, year)` - GET /budgets
- [ ] `get(id)` - GET /budgets/:id
- [ ] `getStatus(id)` - GET /budgets/:id/status
- [ ] `update(id, budget)` - PUT /budgets/:id
- [ ] `delete(id)` - DELETE /budgets/:id

### 9.5 Category Service
- [ ] `categoryService.ts` - Category API calls
- [ ] `list()` - GET /categories
- [ ] `create(category)` - POST /categories
- [ ] `update(id, category)` - PUT /categories/:id
- [ ] `delete(id)` - DELETE /categories/:id

### 9.6 Account Service
- [ ] `accountService.ts` - Account API calls
- [ ] `list()` - GET /accounts
- [ ] `create(account)` - POST /accounts
- [ ] `update(id, account)` - PUT /accounts/:id
- [ ] `delete(id)` - DELETE /accounts/:id

### 9.7 Dashboard Service
- [ ] `dashboardService.ts` - Dashboard API calls
- [ ] `getMonthly(month, year)` - GET /dashboard

---

## 🔐 Phase 10: Authentication & Authorization

### 10.1 JWT Implementation
- [ ] `pkg/jwt/` - JWT utilities
- [ ] `GenerateToken(userID)` - Create JWT with claims
- [ ] `ValidateToken(token)` - Parse and validate
- [ ] `RefreshToken(token)` - Refresh expired token
- [ ] Token expiration: 24 hours
- [ ] Use HS256 algorithm
- [ ] Store secret in env var

### 10.2 Auth Middleware
- [ ] `internal/middleware/auth.go` - Auth middleware
- [ ] Extract token from Authorization header
- [ ] Validate token with JWT package
- [ ] Add userID to request context
- [ ] Return 401 if invalid/missing

### 10.3 Frontend Auth
- [ ] `useAuth()` hook - Auth context
- [ ] Store token in localStorage
- [ ] Auto-logout on 401 response
- [ ] Protected routes (require auth)
- [ ] Redirect to login if not authenticated

---

## 🧪 Phase 11: Testing

### 11.1 Backend Unit Tests
- [ ] Check everything was tested, and create more tests if needed
- [ ] All repository methods
- [ ] All service methods
- [ ] All handlers
- [ ] OFX parser with fixtures
- [ ] JWT utilities
- [ ] Target: >80% coverage

### 11.2 Backend Integration Tests
- [ ] Check everything was tested, and create more tests if needed
- [ ] Setup testcontainers for PostgreSQL
- [ ] Transaction import flow (OFX → DB)
- [ ] Classification rule execution
- [ ] Budget calculation logic
- [ ] Full HTTP request/response tests

### 11.3 Frontend Tests
- [ ] Check everything was tested, and create more tests if needed
- [ ] Component unit tests (Jest + RTL)
- [ ] Service mocking
- [ ] User interaction tests
- [ ] Form validation tests

---

## 🚀 Phase 12: DevOps & Deployment

### 12.1 Docker Setup
- [ ] `Dockerfile` for backend
  - Multi-stage build
  - Minimal image (alpine)
- [ ] `Dockerfile` for frontend
  - Build static assets
  - Serve with nginx
- [ ] `docker-compose.yml` for local dev
  - PostgreSQL
  - Redis
  - Backend
  - Frontend

### 12.2 CI/CD
- [ ] GitHub Actions workflow
  - Run tests on PR
  - Lint Go code (golangci-lint)
  - Lint TS/React (eslint)
  - Build Docker images
  - Deploy to staging/prod

### 12.3 Environment Configuration
- [ ] `.env.example` with all variables
- [ ] Backend env vars: DB_URL, JWT_SECRET, PORT
- [ ] Frontend env vars: VITE_API_URL
- [ ] Production secrets management

### 12.4 Monitoring (Optional)
- [ ] Setup OpenTelemetry
- [ ] Add metrics (request count, latency)
- [ ] Add logging (structured JSON)
- [ ] Error tracking (Sentry)

---

## 📝 Phase 13: Documentation

### 13.1 API Documentation
- [ ] Generate OpenAPI spec from code
- [ ] Document all endpoints
- [ ] Request/response examples
- [ ] Error codes and messages

### 13.2 User Documentation
- [ ] How to import OFX files
- [ ] How to create budgets
- [ ] How to classify transactions
- [ ] How to create rules

### 13.3 Developer Documentation
- [ ] Update README with setup instructions
- [ ] Document deployment process
- [ ] Document testing strategy
- [ ] Add architecture diagrams

---

## ✅ Phase 14: MVP Launch Checklist

### 14.1 Core Features
- [ ] User can register/login
- [ ] User can create accounts
- [ ] User can import OFX files
- [ ] Transactions display correctly
- [ ] User can manually classify transactions
- [ ] User can create budgets (all 3 types)
- [ ] Dashboard shows budget status
- [ ] User can create custom categories

### 14.2 Quality Checks
- [ ] All tests passing
- [ ] No console errors
- [ ] Responsive design (mobile + desktop)
- [ ] Error handling (graceful failures)
- [ ] Loading states (spinners)
- [ ] Success/error messages

### 14.3 Performance
- [ ] Transaction list pagination
- [ ] Database queries optimized (use EXPLAIN)
- [ ] Frontend bundle size < 500KB
- [ ] Page load time < 2s

### 14.4 Security
- [ ] Passwords hashed (bcrypt)
- [ ] JWT tokens validated
- [ ] SQL injection prevented (prepared statements)
- [ ] XSS prevention (React escaping)
- [ ] CORS configured correctly
- [ ] HTTPS in production

---

## 🔮 Phase 15: Future Enhancements (Post-MVP)

### 15.1 Auto-Classification
- [ ] Classification rules UI
- [ ] Batch classify unclassified
- [ ] Rule priority management
- [ ] Rule testing interface

### 15.2 Advanced Features
- [ ] Recurring transactions
- [ ] Split transactions (multiple categories)
- [ ] Credit card payment tracking
- [ ] Installment payments
- [ ] Multi-currency support

### 15.3 Analytics
- [ ] Spending trends chart
- [ ] Category comparison
- [ ] Monthly/yearly reports
- [ ] Budget forecasting
- [ ] Export to CSV/PDF

### 15.4 Integrations
- [ ] Bank API integration (Open Banking)
- [ ] Receipt scanning (OCR)
- [ ] Email import (Gmail API)
- [ ] Shared accounts (multi-user)

---

## 🎯 Priority Order for Implementation

**Week 1-2: Foundation**
1. Phase 1: Infrastructure setup
2. Phase 2: Domain entities
3. Phase 3: Repository layer (focus on Transaction)
4. Phase 6: OFX Parser

**Week 3-4: Core Backend**
5. Phase 4: Service layer (Transaction + Auth)
6. Phase 5: HTTP handlers (Transaction + Auth)
7. Phase 10: Authentication

**Week 5-6: Frontend Core**
8. Phase 7: React components
9. Phase 8: Pages (Login, Import, Transactions)
10. Phase 9: API services

**Week 7-8: Budget Features**
11. Budget repository + service + handler
12. Budget frontend (forms, dashboard)
13. Phase 11: Testing

**Week 9: Polish & Deploy**
14. Phase 12: DevOps
15. Phase 13: Documentation
16. Phase 14: Launch checklist

---

## 📌 Critical Path Items (Must Have for MVP)

These are the absolute minimum features needed:

1. ✅ User authentication (register/login)
2. ✅ Account management (CRUD)
3. ✅ OFX import (parse + save transactions)
4. ✅ Transaction list (with filters)
5. ✅ Manual classification (assign category)
6. ✅ Budget creation (all 3 types)
7. ✅ Dashboard (monthly summary)

Everything else can be added post-MVP.

---

**Last Updated:** 2025-10-27
**Tech Stack:** Go + PostgreSQL + React + TypeScript + Tailwind