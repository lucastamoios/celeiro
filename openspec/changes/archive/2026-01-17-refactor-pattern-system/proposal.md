# Refactor Pattern System

## Why

The current pattern system has two types of patterns:
1. **Simple patterns** (PlannedEntry with `is_saved_pattern=true`) - Only applies category, not description
2. **Advanced patterns** (classification_rules with regex) - Applies both category and description

This dual system creates confusion and maintenance overhead. Additionally, when users edit a transaction's description, the original OFX description is lost, making pattern matching unreliable since it matches against the (potentially edited) description.

## What Changes

### 1. **BREAKING** - Remove Simple Patterns
- Remove `is_saved_pattern` flag from `planned_entries`
- Remove simple pattern-related endpoints and logic
- Keep only the advanced regex-based patterns (renamed to just "Patterns")

### 2. **BREAKING** - Rename Advanced Patterns to Patterns
- Rename `classification_rules` table to `patterns` 
- Rename `AdvancedPattern` to `Pattern` in code
- Update all API endpoints from `/advanced-patterns/` to `/patterns/`

### 3. Add Original Description Field
- Add `original_description` column to `transactions` table
- Populate during OFX import with the cleaned OFX description
- This field is immutable after import

### 4. Pattern Matching Uses Original Description
- Pattern regex matching MUST use `original_description`, never the user-edited `description`
- This ensures consistent matching even after user edits

### 5. Description Display Logic
- If `description` is NULL or empty, display `original_description`
- If `description` is set, display `description` (user's custom name)
- User edits only modify `description`, never `original_description`

## Impact

### Affected Components

**Database**:
- New migration: Add `original_description` to `transactions`
- New migration: Rename `classification_rules` to `patterns`
- New migration: Remove `is_saved_pattern` from `planned_entries`
- Data migration: Copy existing `description` to `original_description` for existing transactions

**Backend**:
- `internal/application/financial/models.go` - Update TransactionModel
- `internal/application/financial/dto.go` - Update Transaction DTO
- `internal/application/financial/advanced_patterns_service.go` - Rename to `patterns_service.go`
- `internal/application/financial/matching_service.go` - Update to use original_description
- `internal/application/financial/ofx_parser.go` - Populate original_description
- `internal/application/financial/repository.go` - Update queries
- `internal/web/financial/handler.go` - Rename endpoints
- Remove all `is_saved_pattern` related code

**Frontend**:
- `frontend/src/components/PatternManager.tsx` - Remove simple patterns section
- `frontend/src/components/TransactionList.tsx` - Remove "Save as Pattern" button, show original_description
- `frontend/src/types/budget.ts` - Remove PlannedEntry pattern types
- `frontend/src/api/budget.ts` - Remove simple pattern APIs

### Dependencies
- Depends on existing transaction matching system (8/10 tasks complete)
- Will obsolete parts of `add-transaction-matching-system` change

## Risks

### Data Migration
**Risk**: Existing transactions lose their original descriptions
**Mitigation**: Migration copies current `description` to `original_description` for all existing transactions before any edits are made

### Breaking API Changes
**Risk**: Frontend/mobile clients break
**Mitigation**: 
- Coordinate frontend/backend deployment
- Update all API calls in single release

### Pattern Loss
**Risk**: Users lose their saved simple patterns
**Mitigation**:
- Provide migration guide to convert important simple patterns to regex patterns
- Simple patterns only store category, so impact is minimal

## Success Criteria

1. Only one pattern type exists (regex-based)
2. All new transactions have `original_description` populated
3. Pattern matching uses `original_description` for regex evaluation
4. User-edited `description` is displayed when set, otherwise `original_description`
5. Editing description does NOT affect pattern matching
6. "Save as Pattern" workflow creates a proper regex pattern (not a simple pattern)

