# Known Issues

This document tracks bugs and issues discovered during QA testing that need to be fixed.

## Planned Entry Matching Issues

### 1. UnmatchPlannedEntry doesn't clear matched_transaction_id

**Severity**: Medium  
**Location**: `backend/internal/application/financial/service.go` lines 1978-1982  
**Discovered**: 2026-01-25

**Problem**: When unmatching a planned entry, the `UnmatchPlannedEntry` function sets status to "pending" but doesn't clear `matched_transaction_id`. This leaves data in an inconsistent state where:
- Status is "pending" 
- But `matched_transaction_id` still references the old transaction

**Expected Behavior**: When unmatching, both `status` should become "pending" AND `matched_transaction_id` should be cleared (set to NULL).

**Current Code**:
```go
pendingStatus := PlannedEntryStatusPending
_, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
    StatusID: status.StatusID,
    Status:   &pendingStatus,
    // Missing: MatchedTransactionID should be cleared
})
```

**Fix Required**: The `modifyPlannedEntryStatusParams` struct supports `MatchedTransactionID *int` but the code doesn't set it. Need to either:
1. Add a way to explicitly set NULL (e.g., use a sentinel value or separate "clear" fields)
2. Or modify the SQL query to clear matching fields when status becomes "pending"

---

### 2. Reactivate doesn't clear dismissed_at fields

**Severity**: Medium  
**Location**: `backend/internal/application/financial/service.go` (ReactivatePlannedEntry function)  
**Discovered**: 2026-01-25

**Problem**: When reactivating a dismissed planned entry, the function sets status to "pending" but doesn't clear `dismissed_at` and `dismissal_reason`. This leaves data in an inconsistent state where:
- Status is "pending"
- But `dismissed_at` still contains the old dismissal timestamp
- And `dismissal_reason` still contains the old reason

**Expected Behavior**: When reactivating, `status` should become "pending" AND both `dismissed_at` and `dismissal_reason` should be cleared (set to NULL).

**Root Cause**: Same as Issue #1 - the `ModifyPlannedEntryStatus` function uses `COALESCE` in its SQL query, which only updates values that are non-NULL in the params. There's no way to explicitly set a field to NULL.

**SQL Query** (from `repository.go` line ~2288):
```sql
UPDATE planned_entry_statuses SET
    status = COALESCE($2, status),
    matched_transaction_id = COALESCE($3, matched_transaction_id),
    -- etc... COALESCE prevents setting NULL
```

**Fix Required**: Need to modify `ModifyPlannedEntryStatus` to support clearing fields. Options:
1. Add boolean "clear" flags to params (e.g., `ClearMatchedTransactionID bool`)
2. Use sentinel values (e.g., -1 means "clear")
3. Use a wrapper type that distinguishes "not provided" from "explicitly NULL"
4. Create separate SQL queries for different operations (unmatch, reactivate, etc.)

**Note**: This is the same root cause as Issue #1. A single fix that allows explicit NULL setting would resolve both issues.

---

## How to Add Issues

When adding new issues, include:
- **Severity**: Critical / High / Medium / Low
- **Location**: File path and line numbers
- **Discovered**: Date
- **Problem**: Clear description of what's wrong
- **Expected Behavior**: What should happen
- **Fix Required**: Suggested approach
