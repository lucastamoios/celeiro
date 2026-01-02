# Deterministic Pattern Matching

## Summary
Regex-based deterministic matching algorithm to automatically categorize transactions using saved patterns from `advanced_patterns` table.

## ADDED Requirements

### Requirement: Deterministic pattern matching
The system MUST use deterministic matching where a transaction either matches a pattern or it doesn't.

#### Scenario: All criteria match
GIVEN a transaction with description="UBER TRIP 123", amount=R$ 25.00, date=2024-12-15 (Sunday, weekday=0)
AND a pattern with:
  - description_pattern="(?i)uber"
  - amount_min=10.00, amount_max=100.00
  - weekday_pattern="(0|6)"
WHEN evaluating the pattern
THEN the transaction MUST match
AND category MUST be set to pattern.target_category_id
AND description MAY be renamed to pattern.target_description

#### Scenario: Description pattern fails
GIVEN a transaction with description="NETFLIX SUBSCRIPTION"
AND a pattern with description_pattern="(?i)uber"
WHEN evaluating the pattern
THEN the transaction MUST NOT match
AND no further criteria SHOULD be evaluated (early exit)

#### Scenario: Amount outside range fails
GIVEN a transaction with amount=R$ 150.00
AND a pattern with amount_min=10.00, amount_max=100.00
WHEN evaluating the pattern
THEN the transaction MUST NOT match

#### Scenario: Optional criteria not specified
GIVEN a transaction with amount=R$ 50.00
AND a pattern with:
  - description_pattern="(?i)uber"
  - amount_min=NULL, amount_max=NULL (not specified)
WHEN evaluating the pattern
THEN amount range check MUST be skipped
AND only description_pattern MUST be evaluated

### Requirement: Handle multiple matches
The system MUST handle cases where multiple patterns match a single transaction.

#### Scenario: Single pattern matches
GIVEN a transaction that matches exactly ONE pattern
WHEN applying patterns
THEN the pattern MUST be auto-applied without user confirmation

#### Scenario: Multiple patterns match
GIVEN a transaction that matches TWO or more patterns
WHEN applying patterns
THEN the system MUST NOT auto-apply any pattern
AND the system MUST return all matching patterns as suggestions
AND the user MUST select which pattern to apply

#### Scenario: No patterns match
GIVEN a transaction that matches ZERO patterns
WHEN applying patterns
THEN the transaction MUST remain uncategorized
AND the system SHOULD return empty suggestions

### Requirement: Pattern evaluation order
The system MUST evaluate patterns efficiently.

#### Scenario: Early exit on failure
GIVEN a pattern with description_pattern, amount_min, amount_max, date_pattern
WHEN the first criterion fails (e.g., description_pattern doesn't match)
THEN remaining criteria MUST NOT be evaluated
AND pattern evaluation MUST move to next pattern

#### Scenario: Only evaluate active patterns
GIVEN patterns where is_active=false
WHEN matching transactions
THEN inactive patterns MUST be skipped entirely

### Requirement: Regex matching
The system MUST use Go's regexp package for pattern matching.

#### Scenario: Case-insensitive matching
GIVEN description_pattern="(?i)netflix"
AND transaction description="NETFLIX BRASIL"
WHEN matching
THEN pattern MUST match (case insensitive via (?i) flag)

#### Scenario: Invalid regex handling
GIVEN description_pattern="[invalid("
WHEN loading patterns
THEN the pattern MUST be marked as inactive or skipped
AND an error SHOULD be logged
AND matching MUST continue with other patterns

## Related Capabilities
- Uses: `advanced_patterns` table (migration 00013)
- Related to: pattern-management (CRUD for patterns)
- Related to: income-planning-discipline (budget allocation warnings)
