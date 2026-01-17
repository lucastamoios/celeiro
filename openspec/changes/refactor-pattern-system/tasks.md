# Implementation Tasks: Refactor Pattern System

## 1. Database Migrations
- [x] 1.1 Add `original_description` column to `transactions` table
- [x] 1.2 Create data migration to copy `description` → `original_description` for existing transactions
- [x] 1.3 Rename `classification_rules` table to `patterns`
- [x] 1.4 Remove `is_saved_pattern` column from `planned_entries` table
- [x] 1.5 Clean up any orphaned simple patterns data

## 2. Backend - Models & Repository
- [x] 2.1 Update `TransactionModel` to include `original_description`
- [x] 2.2 Update `Transaction` DTO to include `original_description`
- [x] 2.3 Rename `AdvancedPatternModel` to `PatternModel`
- [x] 2.4 Rename `AdvancedPattern` DTO to `Pattern`
- [x] 2.5 Update repository queries to use new table name `patterns`
- [x] 2.6 Update `insertTransactionQuery` to populate `original_description`

## 3. Backend - Services
- [x] 3.1 Rename `advanced_patterns_service.go` to `patterns_service.go`
- [x] 3.2 Update `matchesPattern` to use `original_description` for regex matching
- [x] 3.3 Remove all `is_saved_pattern` related service methods
- [x] 3.4 Remove `SaveTransactionAsPattern` method (simple pattern creation)
- [x] 3.5 Update OFX parser to set `original_description` during import
- [x] 3.6 **Fix auto-apply during import**: Update OFX import to apply regex patterns to new transactions
- [x] 3.7 Create unified `AutoApplyPatterns(transactionID)` that checks all active patterns
- [x] 3.8 **Implement retroactive application**: Complete `applyPatternRetroactively()` method
  - [x] 3.8.1 Fetch all uncategorized transactions for user/organization
  - [x] 3.8.2 Evaluate pattern against each transaction using `original_description`
  - [x] 3.8.3 Apply pattern to matching transactions (update category + description)
  - [x] 3.8.4 Return count of updated transactions

## 4. Backend - API Handlers
- [x] 4.1 Rename `/financial/advanced-patterns/` endpoints to `/financial/patterns/`
- [x] 4.2 Remove `/financial/transactions/{id}/save-as-pattern` endpoint
- [x] 4.3 Remove `/financial/planned-entries?is_saved_pattern=true` endpoint
- [x] 4.4 Update router to reflect new endpoint paths
- [x] 4.5 Add new endpoint to create pattern from transaction (opens pattern form pre-filled)
- [x] 4.6 Add `POST /financial/patterns/{id}/apply-retroactively` endpoint
  - [x] 4.6.1 Returns `{ "updated_count": N }` with number of transactions updated

## 5. Frontend - Types & API
- [x] 5.1 Update `frontend/src/types/transaction.ts` to include `original_description`
- [x] 5.2 Remove `PlannedEntry` pattern-related types from `budget.ts`
- [x] 5.3 Remove `saveTransactionAsPattern`, `getSavedPatterns` from `api/budget.ts`
- [x] 5.4 Update pattern API calls to use `/patterns/` instead of `/advanced-patterns/`

## 6. Frontend - Components
- [x] 6.1 Update `TransactionList.tsx`:
  - [x] 6.1.1 Display `original_description` when `description` is empty
  - [x] 6.1.2 Remove "Save as Pattern" button
  - [x] 6.1.3 Add "Create Pattern" button that opens pattern form pre-filled
- [x] 6.2 Update `PatternManager.tsx`:
  - [x] 6.2.1 Remove "Simple Patterns" section entirely
  - [x] 6.2.2 Rename "Advanced Patterns" section to just "Patterns"
  - [x] 6.2.3 Update API calls to new endpoints
  - [x] 6.2.4 Add "Apply to existing" button on each pattern card
  - [x] 6.2.5 Show confirmation dialog and result count after retroactive apply
- [x] 6.3 Update `AdvancedPatternCreator.tsx`:
  - [x] 6.3.1 Rename component to `PatternCreator.tsx`
  - [x] 6.3.2 Update imports and references
  - [x] 6.3.3 Add "Apply to existing transactions" checkbox (default: checked)
  - [x] 6.3.4 Show result count after pattern creation if retroactive was enabled

## 7. Testing & Documentation
- [x] 7.1 Update existing pattern matching tests
- [x] 7.2 Add tests for `original_description` preservation
- [x] 7.3 Add tests ensuring pattern matching uses `original_description`
- [x] 7.4 Update API documentation
- [x] 7.5 Manual testing of migration on existing data

