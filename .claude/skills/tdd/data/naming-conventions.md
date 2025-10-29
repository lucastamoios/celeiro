# Test Naming Conventions

## Function Naming Pattern

```
Test<EntityName>_<MethodName>_<Scenario>
```

### Components

1. **EntityName**: The struct/type being tested
2. **MethodName**: The method/function being tested
3. **Scenario**: What case this test covers

## Good Examples

```go
// ✅ Repository tests
func TestTransactionRepository_BulkInsert_Success(t *testing.T)
func TestTransactionRepository_BulkInsert_WithDuplicateFITID(t *testing.T)
func TestTransactionRepository_BulkInsert_EmptyList(t *testing.T)
func TestTransactionRepository_BulkInsert_DatabaseError(t *testing.T)

// ✅ Service tests
func TestBudgetService_CreateBudget_ValidData(t *testing.T)
func TestBudgetService_CreateBudget_NullAmount(t *testing.T)
func TestBudgetService_CalculateEffectiveAmount_FixedType(t *testing.T)
func TestBudgetService_CalculateEffectiveAmount_CalculatedType(t *testing.T)

// ✅ Handler tests
func TestTransactionHandler_Import_ValidOFXFile(t *testing.T)
func TestTransactionHandler_Import_MissingFile(t *testing.T)
func TestTransactionHandler_Import_UnauthorizedUser(t *testing.T)

// ✅ Parser tests
func TestOFXParser_Parse_ValidOFX(t *testing.T)
func TestOFXParser_Parse_InvalidXML(t *testing.T)
func TestOFXParser_Parse_MissingRequiredFields(t *testing.T)
```

## Bad Examples

```go
// ❌ Missing entity name
func TestImport(t *testing.T)
func TestValidData(t *testing.T)

// ❌ Missing scenario
func TestTransactionRepository_BulkInsert(t *testing.T)
func TestBudgetService_CreateBudget(t *testing.T)

// ❌ Testing multiple things
func TestBudgetService_Everything(t *testing.T)
func TestTransactionRepository_AllMethods(t *testing.T)

// ❌ Unclear scenario
func TestBudgetService_CreateBudget_Test1(t *testing.T)
func TestBudgetService_CreateBudget_Case2(t *testing.T)
```

## File Naming

### Pattern
```
<source_file>_test.go
```

### Examples

```
Source File                     Test File
─────────────────────────────   ─────────────────────────────────
transaction_service.go     →    transaction_service_test.go
budget_repository.go       →    budget_repository_test.go
ofx_parser.go             →    ofx_parser_test.go
user_handler.go           →    user_handler_test.go
```

## Test File Location

Place test files **next to** the code being tested:

```
internal/service/
├── transaction_service.go
└── transaction_service_test.go  ← Same directory

internal/repository/
├── budget_repository.go
└── budget_repository_test.go    ← Same directory

pkg/ofx/
├── parser.go
└── parser_test.go               ← Same directory
```

## Scenario Naming Guidelines

### Common Scenario Suffixes

#### Success Cases
- `_Success`
- `_ValidData`
- `_HappyPath`

#### Error Cases
- `_InvalidData`
- `_NullInput`
- `_MissingRequiredField`
- `_DatabaseError`
- `_UnauthorizedUser`

#### Edge Cases
- `_EmptyList`
- `_ZeroAmount`
- `_NegativeValue`
- `_BoundaryValue`

#### Business Rules
- `_FixedType` (for budget type)
- `_CalculatedType` (for budget type)
- `_WithDuplicateFITID` (for transaction)
- `_ExpiredToken` (for auth)

## Test Organization

Group related tests using comments:

```go
package service_test

import "testing"

// === CreateBudget Tests ===

func TestBudgetService_CreateBudget_ValidData(t *testing.T) { }
func TestBudgetService_CreateBudget_NullAmount(t *testing.T) { }
func TestBudgetService_CreateBudget_InvalidType(t *testing.T) { }

// === UpdateBudget Tests ===

func TestBudgetService_UpdateBudget_ValidData(t *testing.T) { }
func TestBudgetService_UpdateBudget_NotFound(t *testing.T) { }

// === CalculateEffectiveAmount Tests ===

func TestBudgetService_CalculateEffectiveAmount_FixedType(t *testing.T) { }
func TestBudgetService_CalculateEffectiveAmount_CalculatedType(t *testing.T) { }
```
