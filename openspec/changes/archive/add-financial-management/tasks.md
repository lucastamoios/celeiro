# Implementation Tasks

This file tracks the ordered implementation tasks for the financial management system.

## Phase 1: Database Schema

- [ ] Create migration 00003: Categories table
  - [ ] Add categories table with serial ID
  - [ ] Seed 7 system categories (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros)
  - [ ] Add indexes on user_id and is_system

- [ ] Create migration 00004: Accounts table
  - [ ] Add accounts table with dual FK (user_id, organization_id)
  - [ ] Add composite FK constraint to user_organizations
  - [ ] Add check constraint for account_type (checking, savings, credit)
  - [ ] Add indexes on user_id, organization_id

- [ ] Create migration 00005: Transactions table
  - [ ] Add transactions table with account_id FK
  - [ ] Add unique index on (account_id, ofx_fitid) for deduplication
  - [ ] Add indexes on account_id, category_id, transaction_date
  - [ ] Add partial index for unclassified transactions
  - [ ] Add JSONB column for raw_ofx_data

- [ ] Create migration 00006: Budgets and Budget Items
  - [ ] Add budgets table with category_id FK
  - [ ] Add budget_items table with budget_id FK
  - [ ] Add check constraints for month (1-12) and year
  - [ ] Add indexes on user_id, category_id, month, year

- [ ] Create migration 00007: Classification Rules
  - [ ] Add classification_rules table with category_id FK
  - [ ] Add indexes on user_id, priority, is_active
  - [ ] Add check constraints for rule_type

## Phase 2: OFX Parser

- [ ] Create OFX parser package (backend/pkg/ofx/)
  - [ ] Define Parser interface
  - [ ] Implement format auto-detection (OFX 1.x vs 2.x)
  - [ ] Implement SGML parser for OFX 1.x
  - [ ] Implement XML parser for OFX 2.x
  - [ ] Add transaction data extraction logic
  - [ ] Handle special characters and encoding
  - [ ] Add error handling for malformed files

- [ ] Write OFX parser tests
  - [ ] Unit tests for format detection
  - [ ] Unit tests for OFX 1.x parsing (sample files)
  - [ ] Unit tests for OFX 2.x parsing (sample files)
  - [ ] Unit tests for error cases (malformed, missing fields)
  - [ ] Create testdata/ofx/ with sample OFX files
  - [ ] Target: >90% coverage for parser

## Phase 3: Domain Models

- [ ] Create financial domain models (backend/internal/application/financial/)
  - [ ] Account model (AccountID, UserID, OrganizationID, Name, Type, CreatedAt, UpdatedAt)
  - [ ] Transaction model (TransactionID, AccountID, CategoryID, Amount, Date, Description, FITID, etc.)
  - [ ] Category model (CategoryID, UserID, Name, Icon, IsSystem)
  - [ ] Budget model (BudgetID, UserID, CategoryID, Month, Year, Type, Amount)
  - [ ] BudgetItem model (ItemID, BudgetID, Description, Amount)
  - [ ] ClassificationRule model (RuleID, UserID, CategoryID, Priority, Pattern, etc.)

- [ ] Add model validation methods
  - [ ] Validate account type enum
  - [ ] Validate budget type enum
  - [ ] Validate month/year ranges
  - [ ] Validate amounts (non-negative for budgets)

## Phase 4: Repository Layer

- [ ] Implement AccountRepository
  - [ ] Create(ctx, account) - Insert new account
  - [ ] GetByID(ctx, accountID) - Fetch single account
  - [ ] ListByUser(ctx, userID) - List user's accounts
  - [ ] ListByOrganization(ctx, organizationID) - List org's accounts
  - [ ] Update(ctx, account) - Update account
  - [ ] Delete(ctx, accountID) - Delete with CASCADE
  - [ ] Write unit tests (mock DB or testcontainers)

- [ ] Implement TransactionRepository
  - [ ] BulkInsert(ctx, transactions) - Insert with ON CONFLICT DO NOTHING
  - [ ] GetByID(ctx, transactionID) - Fetch single transaction
  - [ ] ListByAccount(ctx, accountID, limit, offset) - Paginated list
  - [ ] ListByDateRange(ctx, accountID, startDate, endDate) - Filter by date
  - [ ] GetMonthlySummary(ctx, accountID, month, year) - Aggregate query
  - [ ] GetByCategory(ctx, categoryID) - Filter by category
  - [ ] Update(ctx, transaction) - Update transaction (e.g., classify)
  - [ ] Delete(ctx, transactionID) - Delete transaction
  - [ ] Write unit tests

- [ ] Implement CategoryRepository
  - [ ] Create(ctx, category) - Insert user category
  - [ ] GetByID(ctx, categoryID) - Fetch single category
  - [ ] ListByUser(ctx, userID) - List user + system categories
  - [ ] ListSystem(ctx) - List system categories only
  - [ ] Update(ctx, category) - Update category
  - [ ] Delete(ctx, categoryID) - Delete (prevent if is_system)
  - [ ] Write unit tests

- [ ] Implement BudgetRepository
  - [ ] Create(ctx, budget) - Insert budget
  - [ ] CreateItem(ctx, budgetItem) - Insert budget item
  - [ ] GetByID(ctx, budgetID) - Fetch budget with items (JOIN)
  - [ ] ListByMonth(ctx, userID, month, year) - List all budgets for month
  - [ ] ListByCategory(ctx, categoryID) - List budgets for category
  - [ ] Update(ctx, budget) - Update budget
  - [ ] UpdateItem(ctx, budgetItem) - Update budget item
  - [ ] Delete(ctx, budgetID) - Delete with CASCADE to items
  - [ ] DeleteItem(ctx, itemID) - Delete single item
  - [ ] Write unit tests

- [ ] Implement ClassificationRuleRepository
  - [ ] Create(ctx, rule) - Insert rule
  - [ ] GetByID(ctx, ruleID) - Fetch single rule
  - [ ] ListByUser(ctx, userID) - List user's rules ordered by priority
  - [ ] Update(ctx, rule) - Update rule
  - [ ] Delete(ctx, ruleID) - Delete rule
  - [ ] Write unit tests

## Phase 5: Service Layer

- [ ] Implement AccountService
  - [ ] CreateAccount(ctx, userID, organizationID, name, accountType) - Business logic for creation
  - [ ] GetAccount(ctx, accountID, userID) - Validate user owns account
  - [ ] ListAccounts(ctx, userID) - Get user's accounts
  - [ ] UpdateAccount(ctx, accountID, userID, updates) - Validate ownership
  - [ ] DeleteAccount(ctx, accountID, userID) - Validate ownership, cascade transactions
  - [ ] Write unit tests (mock repository)

- [ ] Implement TransactionService
  - [ ] ImportFromOFX(ctx, file, accountID, userID) - Parse OFX, bulk insert, return stats
  - [ ] GetTransaction(ctx, transactionID, userID) - Validate access
  - [ ] ListTransactions(ctx, accountID, userID, filters) - Validate access, apply filters
  - [ ] GetMonthlySummary(ctx, userID, month, year) - Aggregate across accounts
  - [ ] ClassifyTransaction(ctx, transactionID, categoryID, userID) - Manual classification
  - [ ] AutoClassifyTransactions(ctx, accountID, userID) - Apply classification rules
  - [ ] Write unit tests (mock repository and OFX parser)

- [ ] Implement CategoryService
  - [ ] CreateCategory(ctx, userID, name, icon) - Create user category
  - [ ] GetCategory(ctx, categoryID) - Fetch category
  - [ ] ListCategories(ctx, userID) - List system + user categories
  - [ ] UpdateCategory(ctx, categoryID, userID, updates) - Validate ownership, prevent system edits
  - [ ] DeleteCategory(ctx, categoryID, userID) - Prevent system category deletion
  - [ ] Write unit tests

- [ ] Implement BudgetService
  - [ ] CreateBudget(ctx, userID, categoryID, month, year, budgetType, amount) - Create budget
  - [ ] AddBudgetItem(ctx, budgetID, description, amount) - Add item to budget
  - [ ] GetBudget(ctx, budgetID, userID) - Fetch with calculated amount
  - [ ] ListBudgets(ctx, userID, month, year) - List all budgets for month
  - [ ] GetBudgetStatus(ctx, budgetID, userID) - Calculate spent vs budgeted
  - [ ] CalculateFinalAmount(budget, items) - Implement budget type logic (fixed/calculated/hybrid)
  - [ ] UpdateBudget(ctx, budgetID, userID, updates) - Update budget
  - [ ] DeleteBudget(ctx, budgetID, userID) - Delete with cascade
  - [ ] Write unit tests

- [ ] Implement ClassificationRuleService
  - [ ] CreateRule(ctx, userID, categoryID, priority, pattern, ruleType) - Create rule
  - [ ] GetRule(ctx, ruleID, userID) - Fetch rule
  - [ ] ListRules(ctx, userID) - List rules ordered by priority
  - [ ] ApplyRules(ctx, transaction, rules) - First match wins logic
  - [ ] UpdateRule(ctx, ruleID, userID, updates) - Update rule
  - [ ] DeleteRule(ctx, ruleID, userID) - Delete rule
  - [ ] Write unit tests

## Phase 6: HTTP Handlers

- [ ] Implement AccountHandlers (backend/internal/web/financial/accounts.go)
  - [ ] POST /api/v1/accounts - Create account
  - [ ] GET /api/v1/accounts - List accounts
  - [ ] GET /api/v1/accounts/:id - Get single account
  - [ ] PUT /api/v1/accounts/:id - Update account
  - [ ] DELETE /api/v1/accounts/:id - Delete account
  - [ ] Add auth middleware
  - [ ] Add request validation
  - [ ] Add error handling
  - [ ] Write handler tests

- [ ] Implement TransactionHandlers (backend/internal/web/financial/transactions.go)
  - [ ] POST /api/v1/transactions/import - Import OFX file
  - [ ] GET /api/v1/transactions - List transactions (paginated, filtered)
  - [ ] GET /api/v1/transactions/:id - Get single transaction
  - [ ] PUT /api/v1/transactions/:id/classify - Classify transaction
  - [ ] POST /api/v1/transactions/auto-classify - Auto-classify via rules
  - [ ] GET /api/v1/transactions/summary - Monthly summary
  - [ ] Add auth middleware
  - [ ] Add file upload handling (multipart/form-data)
  - [ ] Add request validation
  - [ ] Write handler tests

- [ ] Implement CategoryHandlers (backend/internal/web/financial/categories.go)
  - [ ] POST /api/v1/categories - Create category
  - [ ] GET /api/v1/categories - List categories
  - [ ] GET /api/v1/categories/:id - Get single category
  - [ ] PUT /api/v1/categories/:id - Update category
  - [ ] DELETE /api/v1/categories/:id - Delete category
  - [ ] Add auth middleware
  - [ ] Write handler tests

- [ ] Implement BudgetHandlers (backend/internal/web/financial/budgets.go)
  - [ ] POST /api/v1/budgets - Create budget
  - [ ] POST /api/v1/budgets/:id/items - Add budget item
  - [ ] GET /api/v1/budgets - List budgets (by month/year)
  - [ ] GET /api/v1/budgets/:id - Get budget with items
  - [ ] GET /api/v1/budgets/:id/status - Get budget status (spent vs budgeted)
  - [ ] PUT /api/v1/budgets/:id - Update budget
  - [ ] DELETE /api/v1/budgets/:id - Delete budget
  - [ ] Add auth middleware
  - [ ] Write handler tests

- [ ] Implement ClassificationRuleHandlers (backend/internal/web/financial/rules.go)
  - [ ] POST /api/v1/classification-rules - Create rule
  - [ ] GET /api/v1/classification-rules - List rules
  - [ ] GET /api/v1/classification-rules/:id - Get rule
  - [ ] PUT /api/v1/classification-rules/:id - Update rule
  - [ ] DELETE /api/v1/classification-rules/:id - Delete rule
  - [ ] Add auth middleware
  - [ ] Write handler tests

- [ ] Register all routes in router
  - [ ] Add financial routes to Chi router
  - [ ] Apply auth middleware to all financial endpoints
  - [ ] Add CORS configuration

## Phase 7: Integration Tests

- [ ] Write end-to-end integration tests
  - [ ] Full OFX import flow (upload → parse → store → deduplicate)
  - [ ] Transaction classification flow (manual + auto)
  - [ ] Budget creation and tracking flow
  - [ ] Organization isolation verification (user can't access other org's data)
  - [ ] Use testcontainers for PostgreSQL
  - [ ] Use sample OFX files from testdata/
  - [ ] Target: All critical paths covered

- [ ] Write API integration tests
  - [ ] Test all endpoints with auth
  - [ ] Test error cases (401, 403, 404, 500)
  - [ ] Test pagination
  - [ ] Test filtering and sorting

## Phase 8: Documentation

- [ ] Update API documentation
  - [ ] Document all new endpoints
  - [ ] Add request/response examples
  - [ ] Document error codes
  - [ ] Add authentication requirements

- [ ] Update deployment documentation
  - [ ] Add new environment variables if needed
  - [ ] Document migration process
  - [ ] Update database setup instructions

## Phase 9: Deployment

- [ ] Run migrations on staging
  - [ ] Verify migration 00003 (categories)
  - [ ] Verify migration 00004 (accounts)
  - [ ] Verify migration 00005 (transactions)
  - [ ] Verify migration 00006 (budgets)
  - [ ] Verify migration 00007 (classification_rules)

- [ ] Deploy backend to staging
  - [ ] Verify all endpoints work
  - [ ] Test OFX import with real bank files
  - [ ] Verify organization isolation

- [ ] Production deployment
  - [ ] Run migrations
  - [ ] Deploy backend
  - [ ] Monitor logs for errors
  - [ ] Verify all features work

## Acceptance Criteria

- [ ] All migrations run successfully on clean database
- [ ] OFX parser handles both OFX 1.x (SGML) and 2.x (XML)
- [ ] FITID deduplication prevents duplicate imports
- [ ] Classification rules execute in priority order
- [ ] Budget calculations work for all three types (fixed, calculated, hybrid)
- [ ] All endpoints protected by auth middleware
- [ ] Organization isolation enforced (users can't access other orgs' data)
- [ ] >80% test coverage on business logic
- [ ] Integration tests with testcontainers pass
- [ ] API returns proper error codes (401, 403, 404, 500)
