# Match Scoring Algorithm

## Summary
Weighted fuzzy matching algorithm to automatically link transactions to planned entries or saved patterns.

## ADDED Requirements

### Requirement: Weighted match scoring
The system MUST calculate match scores using weighted components.

#### Scenario: Calculate full match score
GIVEN a transaction with category="Restaurants", amount=R$ 420, description="RESTAURANTE QUINTAL", date=5th
AND a pattern with category="Restaurants", amount=R$ 400, description="Weekly Lunch", expected_day=5
WHEN calculating match score
THEN the score MUST include:
- CategoryMatch = 1.0 (exact match)
- AmountMatch = 0.90 (within 5% tolerance)
- DescriptionMatch ≈ 0.30 (fuzzy match)
- DateMatch = 1.0 (same day)
- Final Score = (1.0 * 0.4) + (0.90 * 0.3) + (0.30 * 0.2) + (1.0 * 0.1) = 0.77
- Confidence = "HIGH"

#### Scenario: Category mismatch early exit
GIVEN a transaction with category="Restaurants"
AND a pattern with category="Transport"
WHEN calculating match score
THEN the scoring MUST exit immediately with Score = 0
AND no fuzzy matching SHOULD be performed

### Requirement: Fuzzy description matching
The system MUST use Levenshtein distance for fuzzy string matching.

#### Scenario: Similar descriptions match
GIVEN transaction description="RESTAURANTE XYZ LTDA"
AND pattern description="Restaurante XYZ"
WHEN calculating description match
THEN the similarity score MUST be >0.80 (very similar)

#### Scenario: Normalize strings before matching
GIVEN transaction description="  NETFLIX  BRASIL  "
AND pattern description="netflix brasil"
WHEN calculating description match
THEN strings MUST be normalized (lowercase, trimmed) before comparison
AND the similarity score MUST be 1.0 (exact match after normalization)

### Requirement: Amount tolerance matching
The system MUST allow configurable amount tolerance for matching.

#### Scenario: Amount within tolerance matches
GIVEN a pattern with amount=R$ 100.00
AND default tolerance=5%
WHEN matching a transaction with amount=R$ 102.00
THEN AmountMatch MUST be >0.90 (2% difference, within 5% tolerance)

#### Scenario: Amount outside tolerance fails
GIVEN a pattern with amount=R$ 100.00
AND tolerance=5%
WHEN matching a transaction with amount=R$ 120.00
THEN AmountMatch MUST be 0.0 (20% difference, outside tolerance)

### Requirement: Confidence level classification
The system MUST classify matches by confidence level.

#### Scenario: HIGH confidence (≥70%)
GIVEN a match score of 0.75
WHEN determining confidence level
THEN confidence MUST be "HIGH"
AND the match MAY be auto-applied

#### Scenario: MEDIUM confidence (50-70%)
GIVEN a match score of 0.65
WHEN determining confidence level
THEN confidence MUST be "MEDIUM"
AND the match MUST be suggested to user for confirmation

#### Scenario: LOW confidence (<50%)
GIVEN a match score of 0.42
WHEN determining confidence level
THEN confidence MUST be "LOW"
AND the match SHOULD NOT be shown to user

## Related Capabilities
- Depends on: add-category-centric-budgeting (needs `planned_entries` table)
- Related to: pattern-management (matches against saved patterns)
