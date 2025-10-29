# TDD Feature Implementation Examples

## Example 1: New Feature - Budget Calculation

### Step 1: RED - Write Failing Test

```go
// internal/service/budget_service_test.go
func TestBudgetService_CalculateEffectiveAmount_FixedType(t *testing.T) {
    // Arrange
    budget := &domain.Budget{
        Type:   domain.BudgetTypeFixed,
        Amount: decimal.NewFromFloat(500.00),
    }
    service := NewBudgetService(nil) // Will implement later

    // Act
    amount := service.CalculateEffectiveAmount(budget)

    // Assert
    assert.Equal(t, decimal.NewFromFloat(500.00), amount)
}
```

**Run test → FAILS (method doesn't exist)**

### Step 2: GREEN - Implement Minimal Code

```go
// internal/service/budget_service.go
func (s *BudgetService) CalculateEffectiveAmount(budget *domain.Budget) decimal.Decimal {
    if budget.Type == domain.BudgetTypeFixed {
        return *budget.Amount
    }
    return decimal.Zero
}
```

**Run test → PASSES**

### Step 3: REFACTOR - Add More Test Cases

```go
func TestBudgetService_CalculateEffectiveAmount_CalculatedType(t *testing.T) {
    // Test for calculated budget with items
    // ...
}

func TestBudgetService_CalculateEffectiveAmount_HybridType(t *testing.T) {
    // Test for hybrid budget
    // ...
}
```

**Improve implementation to handle all cases.**

## Example 2: Bug Fix Workflow

### Step 1: RED - Reproduce Bug with Test

```go
func TestTransactionRepository_BulkInsert_SkipsDuplicateFITID(t *testing.T) {
    // Arrange
    repo := setupTestDB(t)
    tx1 := &domain.Transaction{OFXFITID: "12345", AccountID: accountID}
    tx2 := &domain.Transaction{OFXFITID: "12345", AccountID: accountID} // Duplicate

    // Act
    repo.BulkInsert(ctx, []*domain.Transaction{tx1})
    result, err := repo.BulkInsert(ctx, []*domain.Transaction{tx2})

    // Assert
    require.NoError(t, err)
    assert.Equal(t, 0, result.Inserted) // Should skip duplicate
    assert.Equal(t, 1, result.Skipped)
}
```

**Run test → FAILS (bug reproduced)**

### Step 2: GREEN - Fix the Bug

```go
func (r *TransactionRepository) BulkInsert(ctx context.Context, txs []*domain.Transaction) (*Result, error) {
    query := `
        INSERT INTO transactions (...)
        VALUES (...)
        ON CONFLICT (account_id, ofx_fitid) DO NOTHING
        RETURNING transaction_id
    `
    // Implementation that handles duplicates correctly
}
```

**Run test → PASSES**

## Example 3: Multiple Scenarios

### Testing TransactionRepository.BulkInsert

```go
// 1. Happy Path
func TestTransactionRepository_BulkInsert_Success(t *testing.T) {
    repo := setupTestDB(t)
    transactions := []*domain.Transaction{
        {Amount: decimal.NewFromFloat(100.00), AccountID: accountID},
        {Amount: decimal.NewFromFloat(200.00), AccountID: accountID},
        {Amount: decimal.NewFromFloat(300.00), AccountID: accountID},
    }

    result, err := repo.BulkInsert(context.Background(), transactions)

    assert.NoError(t, err)
    assert.Equal(t, 3, result.Inserted)
    assert.Equal(t, 0, result.Skipped)
}

// 2. Duplicate FITID
func TestTransactionRepository_BulkInsert_SkipsDuplicates(t *testing.T) {
    // ... (shown above)
}

// 3. Empty List
func TestTransactionRepository_BulkInsert_EmptyList(t *testing.T) {
    repo := setupTestDB(t)

    result, err := repo.BulkInsert(context.Background(), []*domain.Transaction{})

    assert.NoError(t, err)
    assert.Equal(t, 0, result.Inserted)
}

// 4. Database Error
func TestTransactionRepository_BulkInsert_DatabaseError(t *testing.T) {
    // Use mock that returns error
    mockDB := &mockDatabase{shouldFail: true}
    repo := NewTransactionRepository(mockDB)

    _, err := repo.BulkInsert(context.Background(), []*domain.Transaction{{...}})

    assert.Error(t, err)
}
```
