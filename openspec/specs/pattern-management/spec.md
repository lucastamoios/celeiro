# pattern-management Specification

## Purpose
TBD - created by archiving change add-transaction-matching-system. Update Purpose after archive.
## Requirements
### Requirement: Create pattern from transaction
Users MUST be able to create a regex-based pattern from an existing transaction.

#### Scenario: Create pattern from transaction
GIVEN a transaction with ID=123
WHEN creating a pattern from that transaction (via UI flow)
THEN the pattern form SHOULD be pre-filled with:
- target_category_id = transaction.category_id
- target_description = transaction.description (or original_description when description is empty)
- description_pattern = an escaped "contains" regex derived from the transaction text
AND the user can edit and save the pattern

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

### Requirement: Planned entries can reference patterns
Planned entries MUST be able to reference a regex-based pattern.

#### Scenario: planned_entries supports pattern linkage
GIVEN the planned_entries table exists
WHEN using pattern-linked planned entries
THEN planned_entries MUST include:
- pattern_id (nullable foreign key to patterns)
AND planned entries with pattern_id != NULL are considered linked to that pattern

