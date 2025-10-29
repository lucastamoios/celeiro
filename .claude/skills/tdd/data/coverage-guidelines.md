# Test Coverage Guidelines

## What to Test

### Repository Layer ✅

**DO test:**
- CRUD operations work correctly
- Unique constraints are enforced
- Foreign keys are respected
- Complex queries return correct data
- SQL errors are handled properly
- Transactions work correctly

**Example:**
```go
func TestTransactionRepository_Create_UniqueConstraint(t *testing.T)
func TestTransactionRepository_GetByAccountID_OrderByDate(t *testing.T)
func TestTransactionRepository_BulkInsert_Rollback(t *testing.T)
```

### Service Layer ✅

**DO test:**
- Business logic is correct
- Validation rules are enforced
- Error handling is appropriate
- Service composition works
- Edge cases are handled
- State transitions are valid

**Example:**
```go
func TestBudgetService_CreateBudget_ValidatesAmount(t *testing.T)
func TestTransactionService_ImportFromOFX_SkipsDuplicates(t *testing.T)
func TestUserService_Register_ChecksEmailUniqueness(t *testing.T)
```

### Handler Layer ✅

**DO test:**
- Request parsing is correct
- Response format is correct
- HTTP status codes are appropriate
- Error responses are well-formed
- Authentication/authorization is enforced
- Content-Type headers are set

**Example:**
```go
func TestTransactionHandler_Import_Returns201OnSuccess(t *testing.T)
func TestTransactionHandler_Import_Returns400OnInvalidFile(t *testing.T)
func TestTransactionHandler_Import_Returns401WhenUnauthorized(t *testing.T)
```

## What NOT to Test ❌

### Language Features
Don't test Go standard library or language features:

```go
// ❌ WRONG - Testing language feature
func TestAppendWorks(t *testing.T) {
    list := []int{1, 2}
    list = append(list, 3)
    assert.Equal(t, 3, len(list))
}

// ❌ WRONG - Testing map access
func TestMapGet(t *testing.T) {
    m := map[string]int{"a": 1}
    assert.Equal(t, 1, m["a"])
}
```

### Framework Internals
Don't test Chi, SQLX, or other frameworks:

```go
// ❌ WRONG - Testing Chi router
func TestChiRoutesWork(t *testing.T) {
    r := chi.NewRouter()
    r.Get("/test", handler)
    // Testing Chi's routing, not your code
}

// ❌ WRONG - Testing SQLX behavior
func TestSQLXSelect(t *testing.T) {
    db.Select(&result, "SELECT * FROM users")
    // Testing SQLX, not your logic
}
```

### Database Engine Behavior
Don't test PostgreSQL internals:

```go
// ❌ WRONG - Testing PostgreSQL
func TestPostgreSQLUniqueConstraint(t *testing.T) {
    // INSERT duplicate...
    // PostgreSQL will handle this, not your test
}
```

### Third-Party Libraries
Don't test external libraries:

```go
// ❌ WRONG - Testing decimal package
func TestDecimalAddition(t *testing.T) {
    a := decimal.NewFromFloat(1.0)
    b := decimal.NewFromFloat(2.0)
    c := a.Add(b)
    assert.Equal(t, decimal.NewFromFloat(3.0), c)
}
```

### Trivial Code
Don't test simple getters/setters or data structures:

```go
// ❌ WRONG - Testing trivial getter
func TestUser_GetEmail(t *testing.T) {
    user := &User{Email: "test@example.com"}
    assert.Equal(t, "test@example.com", user.GetEmail())
}

// ❌ WRONG - Testing struct initialization
func TestBudget_New(t *testing.T) {
    budget := &Budget{Name: "Test"}
    assert.Equal(t, "Test", budget.Name)
}
```

## Minimum Test Cases per Method

### For Each New Method/Function

**Required Tests (4 minimum):**

1. **Happy Path** - Normal successful execution
2. **Invalid Input** - What happens with bad data?
3. **Boundary Conditions** - Empty lists, nil values, zero amounts
4. **Error Handling** - Dependencies fail, database errors

### Example: TransactionRepository.BulkInsert

```go
// 1. Happy Path ✅
func TestTransactionRepository_BulkInsert_Success(t *testing.T)

// 2. Duplicate Handling ✅
func TestTransactionRepository_BulkInsert_SkipsDuplicates(t *testing.T)

// 3. Boundary Condition ✅
func TestTransactionRepository_BulkInsert_EmptyList(t *testing.T)

// 4. Error Handling ✅
func TestTransactionRepository_BulkInsert_DatabaseError(t *testing.T)
```

## Test Types

### Unit Tests (Primary)
- Test single function/method in isolation
- Use mocks for dependencies
- Fast execution (<10ms per test)
- Location: Next to source file

**Use for:**
- Business logic validation
- Error handling
- Input validation
- State management

### Integration Tests (Secondary)
- Test interaction with real dependencies
- Use real database (testcontainers)
- Slower execution (~100ms per test)
- Location: `internal/test/integration/`

**Use for:**
- Database operations
- API endpoint flows
- External service integration
- Complex workflows

## Coverage Metrics

### Target Coverage
- **Repository Layer**: 80%+ (high database interaction)
- **Service Layer**: 90%+ (core business logic)
- **Handler Layer**: 70%+ (thinner layer)

### What 100% Coverage Doesn't Mean
- ❌ All bugs are caught
- ❌ Code is perfect
- ❌ Tests are high quality

### What Good Coverage Does Mean
- ✅ Main paths are tested
- ✅ Error cases are handled
- ✅ Refactoring is safer
- ✅ Bugs are easier to find

## Test Maintenance

### When to Update Tests

**Always update when:**
- Method signature changes
- Business logic changes
- New edge case discovered
- Bug is fixed

**Don't update when:**
- Refactoring internal implementation (tests should still pass)
- Renaming variables
- Code formatting

### Red Flags

**Bad tests that need improvement:**
- Tests that fail randomly (flaky)
- Tests that test implementation details
- Tests that are too slow (>1 second)
- Tests that depend on other tests
- Tests that require manual setup
- Tests with unclear assertions

**Example of bad test:**
```go
// ❌ Testing implementation detail
func TestBudgetService_CreateBudget_CallsRepositoryOnce(t *testing.T) {
    // This test will break if we add caching, even though behavior is same
    mockRepo.AssertNumberOfCalls(t, "Create", 1)
}
```

**Example of good test:**
```go
// ✅ Testing behavior
func TestBudgetService_CreateBudget_SavesBudgetCorrectly(t *testing.T) {
    // Test that budget is saved with correct data, regardless of how
    assert.Equal(t, "Monthly Groceries", savedBudget.Name)
}
```
