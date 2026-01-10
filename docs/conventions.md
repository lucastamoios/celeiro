# Project Conventions

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
| Saved Pattern | For transaction matching (is_saved_pattern=true) |

## Pattern System

Two pattern types:
1. **Saved Patterns**: PlannedEntry with is_saved_pattern=true, matches by similarity
2. **Advanced Patterns**: Regex-based in advanced_patterns table

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

## Common Mistakes

1. Cross-domain JOINs in repos - use service composition
2. Missing X-Active-Organization header for /financial/* endpoints
3. Modifying recurrent parent for monthly change - generate instance first
4. Not running `make migrate` after schema changes
5. Using local time instead of UTC for timestamps
6. Matching against `description` instead of `original_description`

## External APIs

### Resend Email

| Type | Attachment Endpoint |
|------|---------------------|
| Sent emails | GET /emails/:id/attachments/:id |
| Received (inbound) | GET /emails/receiving/:id/attachments/:id |
