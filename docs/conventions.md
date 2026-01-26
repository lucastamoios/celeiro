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

### Planned Entry Matching

When matching a transaction to a planned entry (`MatchPlannedEntryToTransaction`):

1. **Status update**: Entry status → `matched`, links `matched_transaction_id`
2. **Amount adjustment**: Entry amount updated based on transaction amount
3. **Transaction update**: Copies `description` and `category_id` from entry to transaction

**Amount adjustment rules:**

| Entry Type | Behavior |
|------------|----------|
| Exact amount (`amount` only) | Replace with transaction amount |
| Range (`amount_min`/`amount_max`) | Expand range if transaction outside bounds |

This ensures planned entries learn from actual transaction amounts over time.

### Clearing Status Fields (Unmatch / Reactivate)

The generic `ModifyPlannedEntryStatus` uses `COALESCE` in SQL, which **cannot set fields to NULL**. For operations that need to clear fields:

| Operation | Repository Function | Fields Cleared |
|-----------|---------------------|----------------|
| Unmatch | `ClearPlannedEntryMatch` | `matched_transaction_id`, `matched_amount`, `matched_at` |
| Reactivate | `ClearPlannedEntryDismissal` | `dismissed_at`, `dismissal_reason` |

**Why dedicated functions?** The COALESCE pattern `COALESCE($1, existing_value)` treats Go's `nil` as "don't change" rather than "set to NULL". Dedicated clearing functions use explicit `SET field = NULL` statements.

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
- Re-importing uses `ON CONFLICT DO UPDATE` with selective field updates
- Original data preserved in raw_ofx_data JSONB

### Re-Import Behavior

When re-importing an OFX file with existing transactions (same `account_id` + `ofx_fitid`):

| Field | Behavior | Reason |
|-------|----------|--------|
| `amount` | Updated | Bank corrections happen |
| `transaction_date` | Updated | Date adjustments |
| `ofx_*` fields | Updated | Raw OFX data refresh |
| `description` | **Preserved** | User edits kept (bank version in `original_description`) |
| `transaction_type` | **Preserved** | Prevents silent debit/credit flips |
| `original_description` | **Preserved** | Immutable for pattern matching |
| `category_id`, `notes`, `tags` | **Preserved** | User annotations kept |

**Why `transaction_type` is immutable**: Banks (especially Nubank) sometimes report the same transaction differently across OFX exports. Locking at first import prevents budgets/reports from breaking.

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
| Use `Modify*` to clear fields to NULL | COALESCE preserves old values | Use dedicated `Clear*` functions (see below) |

## External APIs

### Resend Email

| Type | Attachment Endpoint |
|------|---------------------|
| Sent emails | GET /emails/:id/attachments/:id |
| Received (inbound) | GET /emails/receiving/:id/attachments/:id |
