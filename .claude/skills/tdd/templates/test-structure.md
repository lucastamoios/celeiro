# Test Structure Templates

## AAA Pattern Template

```go
func Test<EntityName>_<MethodName>_<Scenario>(t *testing.T) {
    // ARRANGE - Setup test data and dependencies
    // Create mocks, test data, expected values

    // ACT - Execute the method being tested
    // Call the function/method once

    // ASSERT - Verify expectations
    // Check results, errors, side effects
}
```

## Unit Test Template (with Mocks)

```go
func TestBudgetService_CreateBudget_ValidData(t *testing.T) {
    // ARRANGE
    mockRepo := &MockBudgetRepository{}
    mockRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

    service := NewBudgetService(mockRepo)

    budget := &domain.Budget{
        Name:   "Monthly Groceries",
        Amount: decimal.NewFromFloat(500.00),
        Type:   domain.BudgetTypeFixed,
    }

    // ACT
    err := service.CreateBudget(context.Background(), budget)

    // ASSERT
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
}
```

## Integration Test Template (with Real DB)

```go
func TestTransactionRepository_BulkInsert_Integration(t *testing.T) {
    // ARRANGE
    db := setupTestContainer(t) // Real PostgreSQL via testcontainers
    defer db.Close()

    repo := NewTransactionRepository(db)

    transactions := []*domain.Transaction{
        {Amount: decimal.NewFromFloat(100.00), Description: "Test 1"},
        {Amount: decimal.NewFromFloat(200.00), Description: "Test 2"},
        {Amount: decimal.NewFromFloat(300.00), Description: "Test 3"},
    }

    // ACT
    result, err := repo.BulkInsert(context.Background(), transactions)

    // ASSERT
    assert.NoError(t, err)
    assert.Equal(t, 3, result.Inserted)

    // Verify in database
    var count int
    db.Get(&count, "SELECT COUNT(*) FROM transactions")
    assert.Equal(t, 3, count)
}
```

## Mock Interface Template

```go
// Create mock in test file
type mockTransactionRepository struct {
    mock.Mock
}

func (m *mockTransactionRepository) BulkInsert(ctx context.Context, txs []*domain.Transaction) (*Result, error) {
    args := m.Called(ctx, txs)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*Result), args.Error(1)
}

func (m *mockTransactionRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Transaction, error) {
    args := m.Called(ctx, id)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*domain.Transaction), args.Error(1)
}
```

## Test Table Pattern (Multiple Scenarios)

```go
func TestBudgetService_CalculateEffectiveAmount(t *testing.T) {
    tests := []struct {
        name     string
        budget   *domain.Budget
        expected decimal.Decimal
        wantErr  bool
    }{
        {
            name: "fixed budget returns amount",
            budget: &domain.Budget{
                Type:   domain.BudgetTypeFixed,
                Amount: decimal.NewFromFloat(500.00),
            },
            expected: decimal.NewFromFloat(500.00),
            wantErr:  false,
        },
        {
            name: "calculated budget sums items",
            budget: &domain.Budget{
                Type: domain.BudgetTypeCalculated,
                Items: []*domain.BudgetItem{
                    {Amount: decimal.NewFromFloat(100.00)},
                    {Amount: decimal.NewFromFloat(200.00)},
                },
            },
            expected: decimal.NewFromFloat(300.00),
            wantErr:  false,
        },
        {
            name: "nil budget returns error",
            budget:   nil,
            expected: decimal.Zero,
            wantErr:  true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            service := NewBudgetService(nil)

            result, err := service.CalculateEffectiveAmount(tt.budget)

            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Equal(t, tt.expected, result)
            }
        })
    }
}
```

## Error Case Template

```go
func TestTransactionService_ImportFromOFX_InvalidFile(t *testing.T) {
    // ARRANGE
    mockParser := &MockOFXParser{}
    mockParser.On("Parse", mock.Anything).Return(nil, errors.New("invalid OFX format"))

    mockRepo := &MockTransactionRepository{}

    service := NewTransactionService(mockRepo, mockParser)

    invalidOFXData := []byte(`<INVALID>not ofx</INVALID>`)

    // ACT
    result, err := service.ImportFromOFX(context.Background(), invalidOFXData, uuid.New())

    // ASSERT
    assert.Error(t, err)
    assert.Nil(t, result)
    assert.Contains(t, err.Error(), "invalid OFX format")

    // Verify repository was NOT called
    mockRepo.AssertNotCalled(t, "BulkInsert")
}
```
