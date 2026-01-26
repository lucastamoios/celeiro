# Known Issues

This document tracks bugs and issues discovered during QA testing that need to be fixed.

## Planned Entry Matching Issues

### ~~1. UnmatchPlannedEntry doesn't clear matched_transaction_id~~ ✅ FIXED

**Status**: FIXED (2026-01-26)  
**Severity**: Medium  
**Location**: `backend/internal/application/financial/service.go`  
**Discovered**: 2026-01-25

**Problem**: When unmatching a planned entry, the `UnmatchPlannedEntry` function was using `ModifyPlannedEntryStatus` which uses COALESCE in SQL, preventing NULL values from being set.

**Fix Applied**: Created dedicated `ClearPlannedEntryMatch` repository function that explicitly sets `matched_transaction_id`, `matched_amount`, and `matched_at` to NULL when unmatching.

**Commit**: `8f7ba3d` - "fix: properly clear match/dismissal fields when resetting planned entry status"

---

### ~~2. Reactivate doesn't clear dismissed_at fields~~ ✅ FIXED

**Status**: FIXED (2026-01-26)  
**Severity**: Medium  
**Location**: `backend/internal/application/financial/service.go`  
**Discovered**: 2026-01-25

**Problem**: When reactivating a dismissed planned entry, the function was using `ModifyPlannedEntryStatus` which uses COALESCE in SQL, preventing `dismissed_at` and `dismissal_reason` from being cleared.

**Fix Applied**: Created dedicated `ClearPlannedEntryDismissal` repository function that explicitly sets `dismissed_at` and `dismissal_reason` to NULL when reactivating.

**Commit**: `8f7ba3d` - "fix: properly clear match/dismissal fields when resetting planned entry status"

---

## How to Add Issues

When adding new issues, include:
- **Severity**: Critical / High / Medium / Low
- **Location**: File path and line numbers
- **Discovered**: Date
- **Problem**: Clear description of what's wrong
- **Expected Behavior**: What should happen
- **Fix Required**: Suggested approach
