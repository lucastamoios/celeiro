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

