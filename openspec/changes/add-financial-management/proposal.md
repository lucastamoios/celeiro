# Add Financial Management System

## Why

Celeiro currently has authentication and user management but lacks the core financial management capabilities that define its purpose. Users need to import bank transactions, classify spending, and track budgets to manage their personal finances effectively.

Without these features, Celeiro is just an auth scaffold with no value proposition.

## What Changes

This change adds the complete financial management layer to Celeiro:

- **Database schema** for accounts, transactions, categories, and budgets (migrations 00003-00007)
- **OFX parser** to extract transaction data from bank export files
- **Domain models** for all financial entities (Account, Transaction, Category, Budget, etc.)
- **Repository layer** for data access with organization scoping
- **Service layer** for business logic (import, classification, budget calculations)
- **HTTP handlers** for REST API endpoints
- **Frontend components** for UI (future phase, not in this change)

**Architecture:**
- Builds on existing auth/organization foundation
- Accounts linked to both user + organization (enables future sharing)
- Serial IDs throughout (performance)
- FITID deduplication prevents duplicate imports
- Classification rules with priority ordering
- Three budget types: fixed, calculated, hybrid

**NOT in scope:**
- Frontend UI (separate change)
- Advanced analytics (separate change)
- Multi-currency support (future)
- Bank API integration (future)

## Impact

### Affected Specs
- **NEW:** financial-accounts
- **NEW:** financial-transactions
- **NEW:** financial-categories
- **NEW:** financial-budgets
- **NEW:** ofx-parser

### Affected Code
- `backend/internal/migrations/` - Add migrations 00003-00007
- `backend/internal/application/financial/` - New package for financial domain
- `backend/internal/web/financial/` - New handlers
- `backend/pkg/ofx/` - New OFX parser package
- Database schema extends existing auth tables

### Dependencies
- Requires existing auth system (users, organizations, roles)
- Requires PostgreSQL with existing migrations 00001-00002
- Requires existing middleware for session management

### Breaking Changes
**None** - This is purely additive. Existing auth functionality unchanged.

### Migration Path
1. Run new migrations (00003-00007) to add financial tables
2. Seed system categories
3. Deploy new code (backwards compatible)
4. No data migration needed (net new features)

## Success Criteria

- [ ] All migrations run successfully on clean database
- [ ] OFX parser handles both OFX 1.x (SGML) and 2.x (XML)
- [ ] FITID deduplication prevents duplicate imports
- [ ] Classification rules execute in priority order
- [ ] Budget calculations work for all three types
- [ ] All endpoints protected by auth middleware
- [ ] Organization isolation enforced (users can't access other orgs' data)
- [ ] >80% test coverage on business logic
- [ ] Integration tests with testcontainers pass
- [ ] API returns proper error codes (401, 403, 404, 500)
