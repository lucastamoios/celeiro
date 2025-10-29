# Development Guide

Development workflow, conventions, and AI-assisted development practices.

## Development Workflow

This project uses **spec-driven development** with AI coding agents.

### Tools

- **OpenSpec**: Structured specifications in `openspec/`
- **Beads**: Issue tracking in `.beads/` (use `bd` command)
- **Claude Code**: AI-assisted implementation

### Standard Workflow

1. **Plan** - Write specification in OpenSpec format
2. **Track** - Convert spec to Beads issues
3. **Implement** - Code the feature (manually or with Claude Code)
4. **Review** - Manual code review before merging

### Commands

```bash
# OpenSpec commands
/openspec:proposal    # Create new change proposal
/openspec:apply       # Implement approved spec
/openspec:archive     # Archive deployed change

# Beads commands
bd list                      # List open issues
bd show <issue-id>           # View issue details
bd update <issue-id> --status done  # Mark as completed
```

## Code Conventions

### Backend (Go)

**Naming:**
- PascalCase for exported types/functions
- camelCase for internal types/functions
- ALL_CAPS for constants

**Error Handling:**
```go
// Always wrap errors with context
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

**Context:**
```go
// Always first parameter
func (s *UserService) Create(ctx context.Context, user *User) error {
    // ...
}
```

**SQL Queries:**
```go
// Use named parameters with SQLX
query := `INSERT INTO users (email, name) VALUES (:email, :name)`
result, err := db.NamedExec(query, user)
```

**Repository Methods:**
```go
// Standard CRUD naming
Create(ctx context.Context, entity *Entity) error
GetByID(ctx context.Context, id int) (*Entity, error)
Update(ctx context.Context, entity *Entity) error
Delete(ctx context.Context, id int) error
List(ctx context.Context, filters Filters) ([]*Entity, error)
```

### Frontend (React/TypeScript)

**Components:**
- PascalCase, one per file
- Filename matches component name

**Hooks:**
- Always prefix with `use`
- Example: `useTransactions`, `useAuth`

**Types:**
- Define in `types/` for shared interfaces
- Co-locate if only used by one component

**Styling:**
```jsx
// Tailwind utility-first, avoid custom CSS
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
  Submit
</button>
```

**Props:**
```tsx
// Define interface for props
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  // ...
}
```

## Git Workflow

### Branch Strategy

- `master` - Production-ready code
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes

### Commit Messages

```
<type>: <description>

[optional body]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:** feat, fix, docs, refactor, test, chore

**Examples:**
```
feat: add OFX import endpoint

Implements transaction import via POST /api/v1/transactions/import.
Handles duplicate detection using FITID.

🤖 Generated with Claude Code
```

### Pull Requests

1. Create feature branch
2. Implement changes
3. Write/update tests
4. Push and create PR
5. Wait for CI to pass
6. Manual review
7. Merge to master

## Service Boundaries (Critical)

**Golden Rule:** Each repository ONLY accesses its own table(s). No cross-domain JOINs.

See [CLAUDE.md](../CLAUDE.md) Services Architecture section for detailed rules and examples.

### Quick Reference

```go
// ❌ BAD - Repository crossing domains
func (r *TransactionRepository) GetWithUserName(ctx context.Context) {
    query := `SELECT t.*, u.name FROM transactions t JOIN users u...`
    // WRONG
}

// ✅ GOOD - Service composition
func (h *TransactionHandler) Get(w http.ResponseWriter, r *http.Request) {
    tx, _ := h.transactionService.GetByID(ctx, id)
    user, _ := h.userService.GetByID(ctx, tx.UserID)

    response := map[string]interface{}{
        "transaction": tx,
        "user": user,
    }
    json.NewEncoder(w).Encode(response)
}
```

## Testing Strategy

See [testing.md](./testing.md) for comprehensive testing guide.

**Quick Reference:**

### Backend Tests

```bash
make test          # Unit tests
make test-int      # Integration tests
make test-coverage # Coverage report (target: >80%)
```

### Frontend Tests

```bash
npm test           # Jest + React Testing Library
npm run test:e2e   # Playwright (future)
```

## Common Tasks

### Add New Entity

1. Create domain entity in `internal/domain/<entity>.go`
2. Create repository interface
3. Implement repository in `internal/repository/<entity>_repository.go`
4. Create service in `internal/service/<entity>_service.go`
5. Create handler in `internal/web/<entity>_handler.go`
6. Add routes to router
7. Write tests for each layer

### Add Database Migration

```bash
# Create new migration
goose -dir backend/migrations create <name> sql

# Edit the generated file
# Add SQL in -- +goose Up section
# Add rollback in -- +goose Down section

# Apply migration
make migrate-up

# Verify
make migrate-status
```

### Add New API Endpoint

1. Define request/response types
2. Add handler method
3. Register route in router
4. Add validation
5. Write handler tests
6. Update API documentation

## Debugging

### Backend

```bash
# Run with debug logging
LOG_LEVEL=debug make run

# Connect to PostgreSQL
docker exec -it celeiro-postgres psql -U celeiro -d celeiro

# View slow queries
# See database.md for monitoring queries
```

### Frontend

```bash
# Check API calls
# Open DevTools → Network tab

# Inspect state
# Use React DevTools extension

# Check console errors
# Open DevTools → Console tab
```

## Performance Tips

### Backend

- Use `EXPLAIN ANALYZE` for slow queries
- Add indexes for frequently filtered columns
- Use bulk inserts for multiple records
- Implement pagination for list endpoints
- Cache expensive computations

### Frontend

- Use React.memo for expensive components
- Implement virtual scrolling for long lists
- Lazy load routes with React.lazy
- Optimize bundle size (check with `npm run build -- --stats`)
- Use debounce for search inputs

## AI-Assisted Development

### Using Claude Code

Claude Code can help with:
- Implementing OpenSpec specifications
- Writing tests
- Refactoring code
- Generating boilerplate
- Debugging issues

### Best Practices

1. **Be specific**: Provide clear requirements
2. **Review output**: Always review AI-generated code
3. **Test thoroughly**: Don't skip testing AI code
4. **Iterate**: Refine prompts if output isn't right
5. **Document**: Add comments explaining complex logic

### Example Prompts

```
"Implement the TransactionRepository.BulkInsert method according to the spec"

"Write unit tests for the ClassificationService.ApplyRules method"

"Refactor this handler to follow the service boundary rules"

"Add pagination to the GET /transactions endpoint"
```

## Code Quality

### Linting

```bash
# Backend
golangci-lint run ./...

# Frontend
npm run lint
```

### Formatting

```bash
# Backend
go fmt ./...
goimports -w .

# Frontend
npm run format
```

### Pre-commit Checks

Before committing:
1. Run tests
2. Run linter
3. Format code
4. Review changes
5. Update documentation if needed
