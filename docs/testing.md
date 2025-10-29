# Testing Strategy

Comprehensive testing guide for backend and frontend.

## Overview

**Testing Philosophy:**
- Write tests that provide value
- Test behavior, not implementation
- Aim for >80% coverage but don't chase 100%
- Integration tests catch more bugs than unit tests
- Prefer fast, isolated tests

## Backend Testing (Go)

### Test Types

1. **Unit Tests** - Test individual functions/methods
2. **Integration Tests** - Test with real database (testcontainers)
3. **E2E Tests** - Test full HTTP request/response cycle

### Running Tests

```bash
# All tests
make test

# Integration tests only
make test-int

# With coverage report
make test-coverage

# Specific package
go test ./internal/repository/...

# Specific test
go test -run TestTransactionRepository_BulkInsert ./internal/repository/
```

### Unit Test Structure

```go
func TestUserService_Create(t *testing.T) {
    // Arrange
    mockRepo := NewMockUserRepository()
    service := NewUserService(mockRepo)
    user := &User{Email: "test@example.com", Name: "Test"}

    // Act
    err := service.Create(context.Background(), user)

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, user.UserID)
    assert.Equal(t, 1, mockRepo.CreateCallCount)
}
```

### Table-Driven Tests

```go
func TestClassificationService_MatchDescriptionRule(t *testing.T) {
    tests := []struct {
        name        string
        description string
        pattern     string
        matchType   string
        want        bool
    }{
        {
            name:        "exact match",
            description: "IFOOD",
            pattern:     "IFOOD",
            matchType:   "exact",
            want:        true,
        },
        {
            name:        "regex match",
            description: "IFOOD *1234",
            pattern:     "IFOOD.*",
            matchType:   "regex",
            want:        true,
        },
        {
            name:        "no match",
            description: "UBER",
            pattern:     "IFOOD",
            matchType:   "exact",
            want:        false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got := matchDescriptionRule(tt.description, tt.pattern, tt.matchType)
            assert.Equal(t, tt.want, got)
        })
    }
}
```

### Integration Tests with Testcontainers

```go
func TestTransactionRepository_Integration(t *testing.T) {
    // Start PostgreSQL container
    ctx := context.Background()
    pgContainer, err := postgres.RunContainer(ctx,
        testcontainers.WithImage("postgres:16-alpine"),
        postgres.WithDatabase("test"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)

    // Get connection string
    connStr, err := pgContainer.ConnectionString(ctx)
    require.NoError(t, err)

    // Connect and run migrations
    db, err := sqlx.Connect("postgres", connStr)
    require.NoError(t, err)
    defer db.Close()

    runMigrations(t, db)

    // Create repository
    repo := NewTransactionRepository(db)

    // Test BulkInsert
    transactions := []*Transaction{
        {AccountID: 1, Description: "Test 1", Amount: decimal.NewFromInt(100)},
        {AccountID: 1, Description: "Test 2", Amount: decimal.NewFromInt(200)},
    }

    inserted, skipped, err := repo.BulkInsert(ctx, transactions)
    require.NoError(t, err)
    assert.Equal(t, 2, inserted)
    assert.Equal(t, 0, skipped)

    // Test duplicate detection
    inserted, skipped, err = repo.BulkInsert(ctx, transactions)
    require.NoError(t, err)
    assert.Equal(t, 0, inserted)
    assert.Equal(t, 2, skipped)
}
```

### HTTP Handler Tests

```go
func TestTransactionHandler_Import(t *testing.T) {
    // Create test server
    mockService := NewMockTransactionService()
    handler := NewTransactionHandler(mockService)
    router := chi.NewRouter()
    router.Post("/import", handler.Import)

    // Create test file
    body := &bytes.Buffer{}
    writer := multipart.NewWriter(body)
    part, _ := writer.CreateFormFile("ofx", "test.ofx")
    part.Write([]byte("OFX file content"))
    writer.Close()

    // Make request
    req := httptest.NewRequest("POST", "/import?accountId=1", body)
    req.Header.Set("Content-Type", writer.FormDataContentType())
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    // Assert response
    assert.Equal(t, http.StatusOK, w.Code)

    var response map[string]int
    json.Unmarshal(w.Body.Bytes(), &response)
    assert.Equal(t, 2, response["inserted"])
    assert.Equal(t, 0, response["skipped"])
}
```

### Mocking

Use interfaces for dependencies:

```go
// Define interface
type UserRepository interface {
    Create(ctx context.Context, user *User) error
    GetByID(ctx context.Context, id int) (*User, error)
}

// Mock implementation
type MockUserRepository struct {
    CreateFunc      func(ctx context.Context, user *User) error
    GetByIDFunc     func(ctx context.Context, id int) (*User, error)
    CreateCallCount int
}

func (m *MockUserRepository) Create(ctx context.Context, user *User) error {
    m.CreateCallCount++
    if m.CreateFunc != nil {
        return m.CreateFunc(ctx, user)
    }
    return nil
}

func (m *MockUserRepository) GetByID(ctx context.Context, id int) (*User, error) {
    if m.GetByIDFunc != nil {
        return m.GetByIDFunc(ctx, id)
    }
    return &User{UserID: id}, nil
}
```

## Frontend Testing (React)

### Test Types

1. **Component Tests** - Test component rendering and interaction
2. **Hook Tests** - Test custom hook logic
3. **Integration Tests** - Test component composition
4. **E2E Tests** - Test full user flows (Playwright, future)

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific file
npm test TransactionTable.test.tsx
```

### Component Test Structure

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionTable } from './TransactionTable';

describe('TransactionTable', () => {
  const mockTransactions = [
    {
      id: 1,
      description: 'Test Transaction',
      amount: 100,
      date: '2025-01-01',
      categoryId: null,
    },
  ];

  it('renders transactions correctly', () => {
    render(<TransactionTable transactions={mockTransactions} />);

    expect(screen.getByText('Test Transaction')).toBeInTheDocument();
    expect(screen.getByText('R$ 100.00')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category selected', () => {
    const mockOnChange = jest.fn();

    render(
      <TransactionTable
        transactions={mockTransactions}
        onCategoryChange={mockOnChange}
      />
    );

    const categorySelect = screen.getByRole('combobox');
    fireEvent.change(categorySelect, { target: { value: '2' } });

    expect(mockOnChange).toHaveBeenCalledWith(1, 2);
  });
});
```

### Testing with API Calls

```tsx
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { TransactionsPage } from './TransactionsPage';

// Setup mock server
const server = setupServer(
  rest.get('/api/v1/transactions', (req, res, ctx) => {
    return res(
      ctx.json({
        transactions: [
          { id: 1, description: 'Test', amount: 100 },
        ],
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('TransactionsPage', () => {
  it('loads and displays transactions', async () => {
    render(<TransactionsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  it('handles API errors', async () => {
    server.use(
      rest.get('/api/v1/transactions', (req, res, ctx) => {
        return res(ctx.status(500));
      })
    );

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error loading transactions')).toBeInTheDocument();
    });
  });
});
```

### Testing Custom Hooks

```tsx
import { renderHook, act } from '@testing-library/react';
import { useTransactions } from './useTransactions';

describe('useTransactions', () => {
  it('fetches transactions on mount', async () => {
    const { result } = renderHook(() => useTransactions(1));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.transactions).toHaveLength(2);
    });
  });

  it('refetches when account changes', async () => {
    const { result, rerender } = renderHook(
      ({ accountId }) => useTransactions(accountId),
      { initialProps: { accountId: 1 } }
    );

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(2);
    });

    rerender({ accountId: 2 });

    await waitFor(() => {
      expect(result.current.transactions).toHaveLength(3);
    });
  });
});
```

## OFX Parser Testing

```go
func TestOFXParser_Parse(t *testing.T) {
    tests := []struct {
        name     string
        file     string
        want     int
        wantErr  bool
    }{
        {
            name:    "valid debit OFX",
            file:    "testdata/debit_sample.ofx",
            want:    10,
            wantErr: false,
        },
        {
            name:    "valid credit OFX",
            file:    "testdata/credit_sample.ofx",
            want:    25,
            wantErr: false,
        },
        {
            name:    "malformed OFX",
            file:    "testdata/malformed.ofx",
            want:    0,
            wantErr: true,
        },
    }

    parser := NewOFXParser()

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            data, err := os.ReadFile(tt.file)
            require.NoError(t, err)

            transactions, err := parser.Parse(data)

            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
                assert.Len(t, transactions, tt.want)

                // Verify FITID is set
                for _, tx := range transactions {
                    assert.NotEmpty(t, tx.OFXFITID)
                }
            }
        })
    }
}
```

## Coverage Targets

### Backend

- **Overall:** >80%
- **Critical paths:** >90%
  - OFX parser
  - Transaction import
  - Classification rules
  - Budget calculations

### Frontend

- **Overall:** >70%
- **Critical components:** >85%
  - Transaction table
  - OFX uploader
  - Budget form
  - Dashboard

## Continuous Integration

Tests run automatically on:
- Every push to feature branches
- Every pull request
- Before merge to master

**CI Pipeline:**

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.24'
      - run: make test
      - run: make test-int
      - run: make test-coverage

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test -- --coverage
```

## Test Data Management

### Backend

Create test fixtures in `testdata/`:

```
testdata/
├── ofx/
│   ├── debit_sample.ofx
│   ├── credit_sample.ofx
│   └── malformed.ofx
└── sql/
    └── seed_test_data.sql
```

### Frontend

Use MSW (Mock Service Worker) for API mocking:

```tsx
// src/mocks/handlers.ts
export const handlers = [
  rest.get('/api/v1/transactions', (req, res, ctx) => {
    return res(ctx.json({ transactions: mockTransactions }));
  }),
];
```

## Performance Testing

### Load Testing (Future)

```bash
# Using k6
k6 run scripts/load-test.js

# Test scenarios:
# - 100 concurrent users
# - Import 1000 transactions
# - List transactions with pagination
# - Calculate monthly dashboard
```

### Benchmarks

```go
func BenchmarkTransactionRepository_BulkInsert(b *testing.B) {
    // Setup
    db := setupTestDB(b)
    repo := NewTransactionRepository(db)
    transactions := generateTransactions(1000)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        repo.BulkInsert(context.Background(), transactions)
    }
}
```

## Best Practices

1. **Test behavior, not implementation** - Don't test private methods
2. **One assertion per test** - Keep tests focused
3. **Use descriptive names** - Test name should describe what it tests
4. **Arrange-Act-Assert** - Follow AAA pattern
5. **Don't test the framework** - Test your code, not React/Go stdlib
6. **Mock external dependencies** - Databases, APIs, file system
7. **Clean up after tests** - Use defer for cleanup
8. **Test error cases** - Don't just test happy path
9. **Keep tests fast** - Slow tests won't be run
10. **Review test coverage** - But don't chase 100%
