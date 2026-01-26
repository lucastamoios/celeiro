# Learnings - Planned Entry Pattern UX

## Conventions & Patterns

## Task 0: UX Copy + Terminology Alignment

**Date:** 2026-01-26

**Changes:**
- Updated `PatternCreator.tsx` labels:
  - Source field: "Texto do banco (para encontrar)" (was "Descrição contém *")
  - Target field: "Como deve aparecer (renomear para)" (was "Nova descrição *")
- Verified field order: Source (Section 1) appears before Target (Section 2).

**Findings:**
- The component structure already supported the correct field order (Source -> Target).
- Variable names used:
  - Source: `simpleDescriptionText` (simple mode) / `descriptionPattern` (regex mode)
  - Target: `targetDescription`
- No logic changes were required, only JSX label updates.
- `tsc -b` passed successfully.
## Task 1: Backend GetTransactionPatternDraft Update

**Date:** 2026-01-26

**Changes:**
- Updated `GetTransactionPatternDraft` handler in `backend/internal/web/financial/handler.go`:
  - Fixed fallback order: now prefers `OriginalDescription` over `Description` (was reversed)
  - Added validation: returns 400 if transaction has no category
  - Added validation: returns 400 if both descriptions are empty
  - New response fields: `source_text`, `target_description` (empty string)
  - Backward-compat fields preserved: `description`, `category_id`
  - `description_pattern` uses canonical format: `(?i).*${regexp.QuoteMeta(sourceText)}.*`

- Added new error constants in `backend/internal/errors/errors.go`:
  - `ErrTransactionCategoryRequired`
  - `ErrTransactionDescriptionRequired`

- Mapped error codes in `backend/internal/web/responses/responses.go`:
  - `TRANSACTION_CATEGORY_REQUIRED` (400)
  - `TRANSACTION_DESCRIPTION_REQUIRED` (400)

**Patterns Discovered:**
- Error handling pattern: define error in `errors.go`, map to HTTP status/code in `responses.go`
- Response uses `map[string]any` for flexible JSON structure
- `regexp.QuoteMeta()` is Go's equivalent of frontend's `escapeRegex()`

**Edge Cases:**
- Category check happens before description check (fail fast on missing category)
- Empty string check uses `!= ""` after nil check for OriginalDescription pointer

## Task 5: Backend Support for Clearing pattern_id Using Sentinel Value

**Date:** 2026-01-26

**Changes:**
- Updated `modifyPlannedEntryQuery` in `backend/internal/application/financial/repository.go`:
  - Changed `pattern_id = COALESCE($4, pattern_id)` to use CASE statement
  - New pattern: `CASE WHEN $4::int = -1 THEN NULL WHEN $4::int IS NOT NULL THEN $4 ELSE pattern_id END`
  - Added comment to `PatternID` field in params struct: `// Use -1 to clear (set to NULL)`

- Created new integration test file `backend/internal/tests/integration/financial_test.go`:
  - `TestPlannedEntry_ClearPatternID_UsingSentinel`: Verifies sentinel -1 clears pattern_id to NULL
  - `TestPlannedEntry_UpdatePatternID_PreservesExisting`: Verifies nil preserves existing value
  - `TestPlannedEntry_SetPatternID_FromNull`: Verifies setting pattern_id from NULL to valid value

**SQL Pattern for Clearing Nullable Fields:**
```sql
pattern_id = CASE
    WHEN $4::int = -1 THEN NULL
    WHEN $4::int IS NOT NULL THEN $4
    ELSE pattern_id
END
```

**Key Learnings:**
1. COALESCE cannot set NULL - it treats NULL input as "keep existing value"
2. Sentinel value -1 is used because pattern_id is always positive (SERIAL)
3. The same pattern was already used for `savings_goal_id` in the same query
4. Integration tests use raw SQL for setup since repository params are unexported
5. The `patterns` table (renamed from `advanced_patterns`) requires `user_id` and `organization_id`

**Test Setup Pattern:**
- Use `BaseTestSuite` from `base_test_suite.go`
- Create user/org via `CreateUserAndAuthenticate()`
- Insert test data via raw SQL on `test.DB`
- Use `financial.PlannedEntryModel` for scanning results

