# Project Context - Celeiro

## Purpose

Celeiro is a personal financial management system that enables users to:
- Import bank transactions via OFX files
- Automatically classify transactions using rules
- Track monthly budgets by category
- Visualize spending patterns

**Vision:** Make personal finance management effortless through automation and intelligent categorization.

## Tech Stack

### Backend
- **Language:** Go 1.24+
- **HTTP Framework:** Chi router
- **Database:** PostgreSQL 16 (persistent) + Redis (sessions)
- **SQL:** SQLX with direct SQL queries (no heavy ORM)
- **Migrations:** Goose
- **Auth:** Passwordless magic codes via email
- **Testing:** Testcontainers for integration tests

### Frontend
- **Framework:** React 18 + TypeScript
- **Styling:** Tailwind CSS (utility-first)
- **Build Tool:** Vite
- **State:** Context API (simple), React Query (future)
- **HTTP Client:** Axios

### DevOps
- **Containers:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Monitoring:** OpenTelemetry + Grafana + Loki (future)

### AI Development Tools
- **Specs:** OpenSpec (spec-driven development)
- **Tasks:** Beads (issue tracking)
- **Agent:** Claude Code

## Project Conventions

### Code Style

#### Backend (Go)
- **Naming:** PascalCase for exports, camelCase for internal
- **Errors:** Always wrap with context: `fmt.Errorf("context: %w", err)`
- **Context:** First parameter always `ctx context.Context`
- **SQL:** Named parameters via SQLX (`db.NamedExec()`)
- **Comments:** Exported functions must have doc comments
- **Testing:** Table-driven tests preferred

#### Frontend (React/TypeScript)
- **Components:** PascalCase, one per file
- **Hooks:** Always prefix with `use` (e.g., `useTransactions`)
- **Types:** Shared types in `types/`, co-locate if component-specific
- **CSS:** Tailwind utility-first, avoid custom CSS
- **Props:** Define interface for all component props

### Architecture Patterns

**Service Boundaries (CRITICAL):**
- Each repository accesses ONLY its own table(s)
- No cross-domain JOINs in repositories
- Use service composition for multi-domain data
- See CLAUDE.md "Services Architecture" for detailed rules

**Layer Structure:**
```
Handler (HTTP) → Service (Business Logic) → Repository (Data Access)
```

**Authentication:**
- Passwordless magic codes (4-digit, 10-minute expiration)
- Session management via Redis
- Auto-registration for new users
- RBAC for authorization

**Multi-Tenant Model:**
- Current: 1 user = 1 organization (seamless single-user UX)
- Future: Multi-user organizations (couples, families)
- All financial data scoped to organization

### Testing Strategy

**Backend:**
- Unit tests alongside code (`*_test.go`)
- Integration tests in `internal/test/integration/`
- Use testcontainers for database tests
- Target: >80% coverage (>90% for critical paths)
- Table-driven tests for multiple scenarios

**Frontend:**
- Jest + React Testing Library
- MSW for API mocking
- Test behavior, not implementation
- Target: >70% overall, >85% for critical components

**Critical Test Paths:**
- OFX parsing and import
- Transaction classification
- Budget calculations
- Authentication flow

### Git Workflow

**Branches:**
- `master` - Production-ready code
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes

**Commits:**
```
<type>: <description>

[optional body]

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, docs, refactor, test, chore

**Pull Requests:**
1. Create feature branch
2. Implement changes
3. Ensure tests pass
4. Create PR with clear description
5. Wait for CI
6. Manual review
7. Merge to master

## Domain Context

### Financial Management Domain

**Core Entities:**
- **User:** Person using the system (authenticated via email)
- **Organization:** Multi-tenant container (currently 1:1 with user)
- **Account:** Bank account (checking, savings, credit)
- **Transaction:** Financial transaction from OFX import
- **Category:** Spending category (system or user-defined)
- **Budget:** Monthly spending limit per category
- **Classification Rule:** Auto-categorization rule

**Key Workflows:**
1. **Import Flow:** Upload OFX → Parse transactions → Deduplicate via FITID → Store
2. **Classification Flow:** New transaction → Apply rules by priority → Assign category
3. **Budget Tracking:** Monthly aggregation → Compare spent vs budgeted → Show status

**Business Rules:**
- FITID is unique per account (prevents duplicate imports)
- Transactions start unclassified (category_id = NULL)
- First matching classification rule wins (by priority order)
- Budget types: fixed (user-defined), calculated (sum of items), hybrid (max of both)
- Missing budget defaults to previous month's actual spending

### OFX Format

**Open Financial Exchange** - Industry standard for bank data exchange
- XML-based format
- Contains FITID (unique transaction identifier)
- Includes transaction date, amount, type, description
- Separate files for checking/savings vs credit cards

**Example OFX Transaction:**
```xml
<STMTTRN>
  <TRNTYPE>DEBIT
  <DTPOSTED>20250101
  <TRNAMT>-50.00
  <FITID>2025010112345
  <NAME>RESTAURANT XYZ
</STMTTRN>
```

## Important Constraints

### Technical Constraints
- **Single Database:** PostgreSQL only (no distributed databases)
- **Synchronous Processing:** No async job queues yet (keep it simple)
- **Email Dependency:** Magic codes require working email service
- **Session Storage:** Redis required for sessions (can fall back to in-memory for dev)

### Business Constraints
- **Personal Use:** Designed for individuals/couples, not businesses
- **Manual OFX Upload:** No direct bank API integration (security + simplicity)
- **Credit as Debit:** Credit card spending treated as immediate debit (simplicity)
- **Single Currency:** BRL only (no multi-currency support yet)

### Security Constraints
- **No Password Storage:** Passwordless auth only
- **Email Verification:** Magic codes sent to verified emails
- **Organization Isolation:** Users cannot access other orgs' data
- **HTTPS Required:** Production must use HTTPS
- **Session Expiration:** Sessions must expire (Redis TTL)

### Performance Constraints
- **Transaction Table Growth:** Expect 100-1000 tx/month per user
- **Dashboard Load:** Monthly aggregation must be <2s
- **OFX Import:** Bulk insert must handle 1000+ transactions efficiently
- **Index Strategy:** Critical paths must have proper indexes

## External Dependencies

### Required Services
- **PostgreSQL 16:** Primary database (persistent data)
- **Redis:** Session storage (transient data)
- **SMTP Server:** Email delivery for magic codes (SMTPGO, local fallback)

### Optional Services
- **Grafana + Loki:** Observability (future)
- **Sentry:** Error tracking (future)

### Third-Party Libraries
- **Backend:** Chi, SQLX, pgx, Goose, Redis client
- **Frontend:** React, Axios, Tailwind CSS
- **Testing:** Testcontainers, Jest, RTL, MSW

## Development Workflow

### Spec-Driven Development
1. Create OpenSpec proposal for new feature
2. Review and approve proposal
3. Convert to Beads issues
4. Implement following TDD
5. Review code
6. Archive OpenSpec change

### Implementation Order
1. Database migrations
2. Domain models
3. Repositories (with tests)
4. Services (with tests)
5. Handlers (with tests)
6. Frontend components
7. Integration tests
8. Documentation updates

## Current State

### Implemented (Existing Code)
- ✅ Authentication system (magic codes)
- ✅ RBAC (roles, permissions)
- ✅ Organization multi-tenancy
- ✅ Session management
- ✅ User registration/login
- ✅ Database migrations for auth layer

### Pending Implementation (Documented)
- ⏳ Financial tables (accounts, transactions, categories, budgets)
- ⏳ OFX parser
- ⏳ Transaction import service
- ⏳ Classification engine
- ⏳ Budget management
- ⏳ Dashboard aggregations
- ⏳ Frontend UI

### Documentation Status
- ✅ Complete database schema (unified auth + financial)
- ✅ Authentication system documented
- ✅ Architecture patterns defined
- ✅ Service boundaries specified
- ✅ Testing strategy defined
- ✅ Development workflow established

## Next Steps

Create OpenSpec proposals for:
1. Financial database migrations (accounts, transactions, categories, budgets)
2. Domain models for financial entities
3. Repository layer (one proposal per domain)
4. Service layer (transaction, budget, classification)
5. Handler layer (REST API endpoints)
6. OFX parser implementation
7. Frontend components

Each proposal will be converted to Beads issues for tracking.
