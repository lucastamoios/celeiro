# Design: Refactor Pattern System

## Context

The Celeiro financial app has two pattern systems that evolved independently:

1. **Simple Patterns**: Stored in `planned_entries` with `is_saved_pattern=true`. Created by saving a transaction. Only stores category + description text (no regex). Applies category only, not description.

2. **Advanced Patterns**: Stored in `classification_rules`. Uses regex for matching. Applies both category AND a normalized description.

This creates confusion: users don't understand why "Save as Pattern" doesn't work the same as creating an "Advanced Pattern". Additionally, when users edit transaction descriptions, pattern matching becomes unreliable.

## Goals / Non-Goals

### Goals
- Single, unified pattern system (regex-based)
- Preserve original transaction descriptions for reliable matching
- Clear separation between "what the bank sent" and "what the user named it"
- Simpler codebase with less pattern-related complexity

### Non-Goals
- Automatic conversion of simple patterns to regex patterns
- Backward compatibility with old API endpoints
- Supporting non-regex pattern matching

## Decisions

### Decision 1: Single Pattern Type (Regex-based)
**What**: Remove simple patterns, keep only regex patterns renamed to just "Patterns"
**Why**: 
- Simple patterns only match exact descriptions (unreliable)
- Advanced patterns are more powerful and flexible
- One system is easier to understand and maintain

**Alternatives considered**:
- Keep both but unify the UI → Still confusing, two systems
- Auto-convert simple to regex → Complex, edge cases

### Decision 2: Immutable Original Description
**What**: Add `original_description` column populated during OFX import, never modified
**Why**:
- Pattern matching needs stable input
- User edits should not break matching
- Audit trail of what bank sent vs. user's name

**Schema**:
```sql
ALTER TABLE transactions 
ADD COLUMN original_description TEXT;

-- Migration: copy existing descriptions
UPDATE transactions 
SET original_description = description 
WHERE original_description IS NULL;
```

### Decision 3: Display Logic
**What**: Show `description` if set, otherwise `original_description`
**Why**: User's custom name takes precedence for display, but matching uses original

**Implementation**:
```go
// In DTO or frontend
func (t Transaction) DisplayDescription() string {
    if t.Description != "" {
        return t.Description
    }
    return t.OriginalDescription
}
```

### Decision 4: Pattern Matching Always Uses Original
**What**: `matchesPattern` function uses `original_description` field
**Why**: Ensures consistent matching regardless of user edits

**Before**:
```go
if !descRegex.MatchString(tx.Description) {
    return false
}
```

**After**:
```go
if !descRegex.MatchString(tx.OriginalDescription) {
    return false
}
```

## Risks / Trade-offs

### Risk: Migration Complexity
Existing transactions don't have `original_description`.
**Mitigation**: Migration copies current `description` to `original_description`. This is imperfect (some may already be edited) but preserves current matching behavior.

### Risk: API Breaking Changes
Endpoints change from `/advanced-patterns/` to `/patterns/`.
**Mitigation**: Deploy frontend and backend together. No versioning needed for internal API.

### Trade-off: Losing Simple Pattern Simplicity
Simple patterns were easy to create (one click).
**Mitigation**: Add "Create Pattern from Transaction" button that opens pattern form pre-filled with transaction data. User can tweak regex before saving.

## Migration Plan

### Phase 1: Add Infrastructure (Non-breaking)
1. Add `original_description` column (nullable)
2. Update OFX import to populate both fields
3. Update pattern matching to prefer `original_description` when available

### Phase 2: Data Migration
1. Run migration to copy `description` → `original_description` for existing transactions
2. Verify data integrity

### Phase 3: Remove Simple Patterns (Breaking)
1. Remove `is_saved_pattern` column
2. Remove simple pattern endpoints
3. Update frontend to remove simple pattern UI

### Phase 4: Rename Advanced → Patterns
1. Rename table `classification_rules` → `patterns`
2. Rename endpoints `/advanced-patterns/` → `/patterns/`
3. Update all code references

### Rollback
- Phase 1-2: Safe, no breaking changes
- Phase 3-4: Requires reverting code and re-running down migrations

## Open Questions

1. **Should we auto-generate regex from simple patterns before deletion?**
   - Proposal: No, let users manually recreate important patterns
   - Reason: Simple patterns are too basic (exact match) to reliably convert

2. **Should `description` column be nullable or empty string?**
   - Proposal: Nullable (NULL means "use original")
   - Reason: Clear semantic difference vs. empty string

