# Code Issues & Technical Debt

Issues discovered during code review. Prioritized by severity.

## Critical Security Issues

### 1. Magic Code Logged in Production
**File:** `backend/internal/application/accounts/auth.go:109`

```go
a.logger.Info(ctx, "🔑 MAGIC CODE", "email", input.Email, "code", code)
```

**Risk:** Authentication codes exposed in logs. If logs are compromised, attackers can intercept magic codes.

**Fix:** Remove this line or guard with environment check.

---

### 2. Hardcoded Organization Fallback
**Files:** All frontend API files (`frontend/src/api/*.ts`)

```typescript
'X-Active-Organization': options.organizationId || '1',
```

**Risk:** If organizationId is undefined/null/0, requests default to org ID 1. This could:
- Cause cross-organization data access
- Mask context errors instead of failing loudly

**Fix:** Throw error if organizationId is missing, or use context properly.

---

## Data Integrity Issues

### 3. Missing Organization Auth Check on Account Deletion
**File:** `backend/internal/application/financial/repository.go`

```sql
DELETE FROM accounts
WHERE account_id = $1 AND organization_id = $2;
```

**Risk:** Only checks org_id, doesn't verify user belongs to that org. Combined with hardcoded fallback (#2), creates auth bypass.

**Fix:** Add user-organization membership verification.

---

### 4. Incomplete Instance Duplication Check
**File:** `backend/internal/application/financial/service.go:1551-1558`

```go
// This is a simplified check - in production you'd want to add month/year fields
// or check creation dates more carefully
if instance.IsActive {
    return nil, errors.New("instance already exists for this month")
}
```

**Risk:** Only checks `IsActive`, not actual month/year. Allows duplicate monthly instances.

**Fix:** Add proper month/year check to prevent duplicates.

---

### 5. Timezone Violation
**File:** `backend/internal/application/accounts/repository.go:376, 458`

```go
err := r.db.Query(ctx, &result, modifyUserQuery, params.UserID, params.Name, params.Email, time.Now())
// ...
return r.db.Run(ctx, modifyUserPasswordQuery, params.UserID, params.PasswordHash, time.Now())
```

**Risk:** Uses `time.Now()` without `.UTC()`. Violates CLAUDE.md timezone rule. Causes bugs when comparing timestamps.

**Fix:** Use `time.Now().UTC()` everywhere.

---

## Code Quality Issues

### 6. Debug Prints in Production
**File:** `backend/internal/web/financial/handler.go:2399-2427`

```go
fmt.Println("[DEBUG] SyncAmazonOrders called")
fmt.Printf("[DEBUG] SyncAmazonOrders - user=%d org=%d\n", userID, organizationID)
// ... 6 more debug prints
```

**Fix:** Remove or replace with proper logger.

---

### 7. Unimplemented Feature Exposed in API
**File:** `backend/internal/application/financial/service.go:1062-1072`

```go
// TODO: Implement classification matching logic in Phase 2
func (s *service) ApplyClassificationRules(...) (..., error) {
    return ..., errors.New("classification logic not implemented yet")
}
```

**Risk:** API endpoint exists but always fails. Confusing for frontend developers.

**Fix:** Remove endpoint until implemented, or implement it.

---

### 8. TODOs in Production Code
**Files:** Multiple

| File | Line | TODO |
|------|------|------|
| accounts/auth.go | 85 | Re-enable auto-registration |
| accounts/auth.go | 271 | Better error message |
| accounts/auth.go | 364 | Re-enable Google auto-registration |
| accounts/repository.go | 70 | Add location fields |
| financial/service.go | 1062-1066 | Implement classification logic |
| financial/repository.go | 722 | Optimize bulk insert |

---

### 9. Silent Error Discarding
**File:** `backend/internal/web/accounts/auth.go:167-182`

```go
_, _ = h.financialService.CreateAccount(r.Context(), financial.CreateAccountInput{...})
// Best-effort: don't fail auth if account creation fails
```

**Risk:** Account creation errors silently ignored. User won't know if default account wasn't created.

**Fix:** Log the error at minimum.

---

### 10. Inconsistent Error Handling in Frontend
**Files:** `frontend/src/api/*.ts`

Some files use `response.json()` for errors, others use `response.text()`:

```typescript
// auth.ts - GOOD
const errorData = await response.json().catch(() => ({}));

// budget.ts - BAD
const error = await response.text();  // Loses JSON structure
```

**Fix:** Standardize on JSON error parsing across all API files.

---

## Business Logic Issues

### 11. Hardcoded Magic Values
**File:** `backend/internal/application/financial/service.go`

```go
// Allow 2% tolerance for rounding differences
if percentDiff > 0.02 { continue }

// ±5 days tolerance for credit card processing delays
if daysDiff > 5 { continue }
```

**Risk:** Non-configurable tolerance values for Amazon sync.

**Fix:** Make configurable or document as constants.

---

### 12. Magic -1 for Field Clearing
**File:** `backend/internal/application/financial/service.go:1469`

```go
SavingsGoalID    *int // Use -1 to clear
```

**Risk:** Using -1 as magic value is non-standard and confusing.

**Fix:** Use separate clear flag or null pointer properly.

---

### 13. Pattern Matching Failures Silent
**File:** `backend/internal/application/financial/service.go:608-613`

```go
if err != nil {
    s.logger.Warn(ctx, "Failed to apply advanced patterns...")
    continue  // Silent continue
}
```

**Risk:** OFX import succeeds but pattern matching fails silently. User not notified.

**Fix:** Return warning count to user.

---

## Missing Features

### 14. No React Error Boundary
**Files:** `frontend/src/`

No ErrorBoundary component found. Unhandled errors crash the entire app.

**Fix:** Add ErrorBoundary wrapper.

---

### 15. No Database Transactions
**File:** `backend/internal/application/financial/`

No transaction handling found (BEGIN/COMMIT/ROLLBACK). Multi-step operations can leave partial state.

**Fix:** Add transaction support for atomic operations.

---

## Inconsistencies

### 16. Timestamp Format Inconsistency
**Files:** Multiple

```go
// accounts/auth.go
SessionCreatedAt: dto.Session.CreatedAt.Format("2006-01-02T15:04:05Z07:00")

// financial/service.go
matchedAt := s.system.Time.Now().Format("2006-01-02T15:04:05Z")
```

**Fix:** Standardize on one format (RFC3339).

---

## Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 2 | Magic code logging, hardcoded org fallback |
| High | 3 | Missing auth checks, instance duplication, timezone |
| Medium | 6 | Debug prints, TODOs, silent errors |
| Low | 5 | Inconsistencies, missing features |

## Recommended Priority

1. **Immediate:** Remove magic code logging (#1)
2. **This week:** Fix org fallback (#2), add auth checks (#3)
3. **This sprint:** Fix timezone issues (#5), remove debug prints (#6)
4. **Backlog:** Clean up TODOs, add error boundary, add transactions
