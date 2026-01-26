# Issues - Planned Entry Pattern UX

## Problems & Gotchas


## [2026-01-26] Pre-existing LSP Errors (NOT related to this plan)

**File:** `backend/internal/application/accounts/auth_test.go`
**Issue:** 12 test functions calling `New()` with incorrect number of arguments
**Missing parameter:** `*config.Config` (7th parameter)
**Lines:** 56, 76, 96, 125, 146, 174, 207, 249, 274, 376, 474, 548

**Root Cause:** Appears to be from a previous refactor that added `*config.Config` to the auth service constructor but didn't update all test call sites.

**Impact on this plan:** NONE - these errors are in the auth domain; our work is in the financial domain.

**Action:** Documented for future cleanup; proceeding with plan execution.
