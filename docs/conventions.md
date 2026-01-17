# Project Conventions

## Decision Trees

### Need Cross-Domain Data?

```
START → Is ID already available (passed from caller)?
  YES → Use the ID directly, no service call needed
  NO  → Is this a simple lookup (one entity)?
        YES → Call the other service once
        NO  → Create orchestrator service (DashboardService, ReportService)
```

### Implementing a New Feature?

```
START → Is this a new domain?
  YES → Create service.go + repository.go in new folder
  NO  → Add to existing service
        → Add handler in web/{domain}/
        → Add route in web/router.go
        → If new table: add migration first
```

### Modifying Planned Entry?

```
START → Is this for ALL future months?
  YES → Modify the parent recurrent entry
  NO  → Is there a monthly instance?
        YES → Modify the instance
        NO  → Create instance first, then modify it
```

## Critical: Service Boundaries

**Each repository only accesses its own domain table. No cross-domain JOINs.**

Use service composition instead:
1. Call first service to get entity
2. Call second service with ID from first
3. Compose response in handler or orchestrator service

**Exception**: Read-only FK lookups for display (e.g., category_name in transaction list).

See CLAUDE.md for detailed examples.

## Naming Conventions

### Backend Repository Methods

| Action | Prefix |
|--------|--------|
| Read one/many | `Fetch` |
| Create | `Insert` |
| Update | `Modify` |
| Delete | `Remove` |

### Backend Service Methods

| Action | Prefix |
|--------|--------|
| Read one | `Get` |
| Read many | `Get` / `List` |
| Create | `Create` |
| Update | `Update` |
| Delete | `Delete` |

### Frontend

| Type | Convention |
|------|------------|
| Components | PascalCase files |
| Hooks | `use` prefix |
| Types | In `types/` for shared |

### Database

| Type | Convention |
|------|------------|
| Tables | snake_case, plural |
| Columns | snake_case |
| Foreign keys | `<table>_id` |

## Timezone Handling

Always use `time.Now().UTC()` when storing timestamps.

PostgreSQL TIMESTAMP has no timezone info. Local time stored as-is causes bugs when compared against UTC.

## Transaction Fields

| Field | Purpose |
|-------|---------|
| description | User-editable, shown in UI |
| original_description | Immutable OFX value, used for pattern matching |

## Budget System

| Type | Calculation |
|------|-------------|
| fixed | Uses planned_amount directly |
| calculated | Sum of all planned entries |
| maior | MAX(fixed amount, sum of planned entries) |

### Planned Entry Types

| Type | Purpose |
|------|---------|
| Recurrent | Template that repeats monthly |
| One-time | Single occurrence |
| Monthly Instance | Generated from recurrent (has parent_entry_id) |

## Pattern System

Unified regex-based pattern system:
- **Patterns**: Regex rules stored in `patterns` table
- Match against `original_description` (immutable) not `description` (user-editable)
- Auto-apply on OFX import and retroactively to existing transactions
- Can set both category and description on matching transactions

### Match Confidence

| Level | Score | Action |
|-------|-------|--------|
| HIGH | >= 0.70 | Auto-apply |
| MEDIUM | 0.50-0.70 | Suggest |
| LOW | < 0.50 | Ignore |

## OFX Import

- Duplicate prevention: UNIQUE (account_id, ofx_fitid)
- Re-importing same file = no duplicates (ON CONFLICT DO NOTHING)
- Original data preserved in raw_ofx_data JSONB

## Git Workflow

| Branch | Purpose |
|--------|---------|
| master | Production-ready |
| feature/<name> | New features |
| fix/<name> | Bug fixes |

Commit format: `<type>: <description>` (types: feat, fix, docs, refactor, test, chore)

## Common Mistakes (AI: Avoid These)

| Mistake | Why It's Wrong | Correct Approach |
|---------|----------------|------------------|
| Cross-domain JOIN in repository | Violates service boundary | Call other service, compose in handler |
| Missing X-Active-Organization header | Financial routes require org context | Always pass header on /financial/* |
| Modify recurrent parent for one month | Changes ALL future instances | Create monthly instance, modify that |
| `time.Now()` without `.UTC()` | Timezone bugs in database | Always `time.Now().UTC()` |
| Match against `description` | User may have edited it | Use `original_description` (immutable) |
| Use `budgets` table | Legacy, being deprecated | Use `category_budgets` |
| Skip `make migrate` after schema change | Table doesn't exist | Run `make migrate` first |
| Return raw SQL errors to client | Security + UX issue | Wrap in domain error |

## External APIs

### Resend Email

| Type | Attachment Endpoint |
|------|---------------------|
| Sent emails | GET /emails/:id/attachments/:id |
| Received (inbound) | GET /emails/receiving/:id/attachments/:id |
