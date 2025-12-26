# Development Guide

Development workflow, conventions, and commands.

## Development Workflow

This project uses **spec-driven development** with AI coding agents.

### Tools

- **OpenSpec**: Structured specifications in `openspec/`
- **Claude Code**: AI-assisted implementation

### Standard Workflow

1. **Plan** - Write specification in OpenSpec format
2. **Implement** - Code the feature
3. **Review** - Manual code review before merging

### Commands

```bash
# OpenSpec commands
/openspec:proposal    # Create new change proposal
/openspec:apply       # Implement approved spec
/openspec:archive     # Archive deployed change
```

---

## Code Conventions

### Backend (Go)

**Naming:**
- PascalCase for exported types/functions
- camelCase for internal
- ALL_CAPS for constants

**Error Handling:**
```go
if err != nil {
    return fmt.Errorf("failed to create user: %w", err)
}
```

**Context always first:**
```go
func (s *Service) Method(ctx context.Context, ...) error
```

**SQL with SQLX:**
```go
query := `INSERT INTO users (email, name) VALUES (:email, :name)`
result, err := db.NamedExec(query, user)
```

**Repository method naming:**
```go
Create(ctx, entity) error
GetByID(ctx, id) (*Entity, error)
Update(ctx, entity) error
Delete(ctx, id) error
List(ctx, filters) ([]*Entity, error)
```

### Frontend (React/TypeScript)

- Components: PascalCase, one per file
- Hooks: `use` prefix
- Types: `types/` for shared, co-locate if single-use
- Styling: Tailwind utility-first

---

## Git Workflow

### Branches

- `master` - Production-ready
- `feature/<name>` - New features
- `fix/<name>` - Bug fixes

### Commit Messages

```
<type>: <description>

[optional body]

[Co-authored-by footer if AI-assisted]
```

Types: feat, fix, docs, refactor, test, chore

---

## Common Tasks

### Add Database Migration

```bash
cd backend
goose -dir ./internal/migrations create <name> sql
# Edit the generated file
make migrate
```

### Add New API Endpoint

1. Add route in `backend/internal/web/router.go`
2. Add handler method in `backend/internal/web/financial/handler.go`
3. Add service method in `backend/internal/application/financial/service.go`
4. Add repository method if needed

### Run Tests

```bash
cd backend
make test                    # All tests
go test ./... -run TestName  # Specific test
```

### Code Quality

```bash
# Backend
golangci-lint run ./...
go fmt ./...

# Frontend
npm run lint
npm run format
```

---

## Related Docs

- [gotchas.md](./gotchas.md) - Project conventions and pitfalls
- [key-files.md](./key-files.md) - Where to find things
- [testing.md](./testing.md) - Testing details
- [troubleshooting.md](./troubleshooting.md) - Common issues
