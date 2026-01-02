# Pattern Management

## Summary
Save categorized transactions as reusable patterns for automatic matching.

## ADDED Requirements

### Requirement: Save transaction as pattern
Users MUST be able to save categorized transactions as patterns.

#### Scenario: POST save transaction as pattern
GIVEN a categorized transaction with ID=123
WHEN sending POST /financial/transactions/123/save-as-pattern with:
```json
{
  "saveAsRecurrent": false
}
```
THEN the response MUST be 201 Created
AND a planned_entry MUST be created with:
- description = transaction.description
- amount = transaction.amount
- category_id = transaction.category_id
- is_saved_pattern = TRUE
- is_recurrent = FALSE
AND the response body MUST contain the created pattern ID

#### Scenario: Save as recurrent pattern
GIVEN a categorized transaction
WHEN saving as pattern with saveAsRecurrent=true
THEN the created pattern MUST have is_recurrent=TRUE
AND future monthly instances SHOULD be generated

### Requirement: Get match suggestions
The system MUST provide match suggestions for uncategorized transactions.

#### Scenario: GET match suggestions for transaction
GIVEN an uncategorized transaction with ID=123
AND 3 saved patterns exist in the same category
WHEN sending GET /financial/match-suggestions?transaction_id=123
THEN the response MUST be 200 OK
AND the response body MUST contain suggestions sorted by score descending
AND each suggestion MUST include:
- patternId
- description
- amount
- categoryId
- matchScore (with all components)

#### Scenario: No suggestions for poor matches
GIVEN a transaction
AND all patterns have match score <0.5
WHEN getting match suggestions
THEN the suggestions array MUST be empty
AND no LOW confidence matches SHOULD be returned

### Requirement: Apply pattern to transaction
Users MUST be able to apply a suggested pattern to a transaction.

#### Scenario: POST apply pattern
GIVEN an uncategorized transaction with ID=123
AND a pattern with ID=456
WHEN sending POST /financial/transactions/123/apply-pattern with:
```json
{
  "patternId": 456
}
```
THEN the response MUST be 200 OK
AND the transaction category MUST be updated to pattern.category_id
AND the transaction SHOULD be linked to the pattern (foreign key or metadata)

### Requirement: Planned entries table schema
The system MUST extend planned_entries to support saved patterns.

#### Scenario: Add is_saved_pattern column
GIVEN the planned_entries table exists
WHEN applying migration for pattern support
THEN a new column MUST be added:
```sql
ALTER TABLE planned_entries
ADD COLUMN is_saved_pattern BOOLEAN NOT NULL DEFAULT FALSE;
```
AND existing rows MUST have is_saved_pattern=FALSE

## Related Capabilities
- Depends on: add-category-centric-budgeting (uses `planned_entries` table)
- Depends on: match-scoring-algorithm (calculates match scores for suggestions)
