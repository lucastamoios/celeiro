# TDD Dialogue Examples

## Example 1: Clear Entity

**User:** "Add a method to calculate budget effective amount"

**Claude:**
```
I'll test BudgetService.CalculateEffectiveAmount() method.

Test file: internal/service/budget_service_test.go
Entity under test: BudgetService

Writing failing test first...
```

## Example 2: Ambiguous Entity

**User:** "Implement OFX import validation"

**Claude:**
```
I need clarification on which entity to test:

1. OFXParser.Validate() in pkg/ofx/
   - Tests if OFX file format is valid

2. TransactionService.ImportFromOFX() in internal/service/
   - Tests business logic including validation

3. TransactionHandler.Import() in internal/web/
   - Tests HTTP request validation

Which entity should I write tests for?
```

## Example 3: Multiple Scenarios

**User:** "Test the BulkInsert method"

**Claude:**
```
Testing TransactionRepository.BulkInsert() method.

Test file: internal/repository/transaction_repository_test.go
Entity under test: TransactionRepository

I'll write tests for these main cases:
1. Happy path - Insert new transactions
2. Duplicate FITID - Skip duplicates correctly
3. Empty list - Handle gracefully
4. Database error - Return appropriate error

Starting with test 1 (happy path)...
```

## Example 4: Asking for Clarification

**User:** "Add validation to the transaction import"

**Claude:**
```
Before I write tests, I need to clarify where this validation should live:

Option A: OFXParser.Parse() - Validate OFX file structure
Option B: TransactionService.ImportFromOFX() - Validate business rules
Option C: TransactionHandler.Import() - Validate HTTP request

Also, what validation rules?
- Amount cannot be zero?
- Date cannot be in future?
- Description required?
- Account must exist?

Please specify the entity and validation rules.
```

## Example 5: Stopping Before Implementation

**User:** "Add a CreateBudget method"

**Claude:**
```
❌ STOP - Need to write test first!

I'll test BudgetService.CreateBudget() method.

Test file: internal/service/budget_service_test.go
Entity under test: BudgetService

Writing failing test for happy path:
- Valid budget data
- Should call repository.Create()
- Should return no error

[Shows test code...]

Run test → FAILS as expected (method doesn't exist yet)

Now I can implement CreateBudget() to make this test pass.
```
