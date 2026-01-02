# Transaction Matching System Design

## Match Score Algorithm

### Weighted Scoring Model
```go
type MatchScore struct {
    CategoryMatch     float64  // 40% weight - MUST match exactly (0 or 1)
    AmountMatch       float64  // 30% weight - Tolerance-based
    DescriptionMatch  float64  // 20% weight - Fuzzy string matching
    DateMatch         float64  // 10% weight - Proximity scoring
    Score             float64  // Weighted sum [0.0-1.0]
    Confidence        string   // HIGH (>0.7), MEDIUM (0.5-0.7), LOW (<0.5)
}

func CalculateMatchScore(tx Transaction, pattern PlannedEntry) MatchScore {
    score := MatchScore{}

    // Category: MUST match (hard requirement)
    if tx.CategoryID != pattern.CategoryID {
        return score  // Early exit, no match
    }
    score.CategoryMatch = 1.0

    // Amount: Within tolerance (default ±5%)
    tolerance := 0.05
    amountDiff := math.Abs(tx.Amount - pattern.Amount)
    amountDiffPercent := amountDiff / pattern.Amount
    if amountDiffPercent <= tolerance {
        score.AmountMatch = 1.0 - (amountDiffPercent / tolerance)
    }

    // Description: Levenshtein distance
    score.DescriptionMatch = fuzzyMatch(tx.Description, pattern.Description)

    // Date: Within 3 days = full score
    dayDiff := math.Abs(tx.TransactionDate.Day() - pattern.ExpectedDay)
    if dayDiff <= 3 {
        score.DateMatch = 1.0 - (dayDiff / 3.0)
    }

    // Weighted sum
    score.Score = (score.CategoryMatch * 0.4) +
                  (score.AmountMatch * 0.3) +
                  (score.DescriptionMatch * 0.2) +
                  (score.DateMatch * 0.1)

    // Confidence level
    if score.Score >= 0.7 {
        score.Confidence = "HIGH"
    } else if score.Score >= 0.5 {
        score.Confidence = "MEDIUM"
    } else {
        score.Confidence = "LOW"
    }

    return score
}
```

### Fuzzy Matching (Levenshtein Distance)
```go
func fuzzyMatch(s1, s2 string) float64 {
    // Normalize: lowercase, trim whitespace
    s1 = strings.ToLower(strings.TrimSpace(s1))
    s2 = strings.ToLower(strings.TrimSpace(s2))

    // Calculate Levenshtein distance
    distance := levenshteinDistance(s1, s2)
    maxLen := math.Max(len(s1), len(s2))

    // Convert to similarity score [0.0-1.0]
    similarity := 1.0 - (float64(distance) / float64(maxLen))

    return similarity
}
```

## Income Planning Discipline

### Strict Zero-Based Budgeting
Users MUST allocate 99.75% of income to categories. Only 0.25% can remain unplanned.

**Example**:
- Monthly income: R$ 10,000
- Maximum unplanned: R$ 25 (0.25%)
- If unplanned > R$ 25 → Show warning

### Calculation
```go
const UnplannedIncomeThreshold = 0.0025  // 0.25%

func CheckIncomePlanning(userID int, month, year int) (*PlanningReport, error) {
    // 1. Calculate total income for month
    totalIncome := sumTransactions(userID, month, year, "income")

    // 2. Calculate total planned spending (sum of all category budgets)
    totalPlanned := sumCategoryBudgets(userID, month, year)

    // 3. Calculate unallocated
    unallocated := totalIncome - totalPlanned
    unallocatedPercent := unallocated / totalIncome

    // 4. Check threshold
    if unallocatedPercent > UnplannedIncomeThreshold {
        return &PlanningReport{
            Status: "WARNING",
            Message: fmt.Sprintf("%.2f%% of income unallocated (max: 0.25%%)",
                unallocatedPercent * 100),
            TotalIncome: totalIncome,
            TotalPlanned: totalPlanned,
            Unallocated: unallocated,
        }, nil
    }

    return &PlanningReport{Status: "OK"}, nil
}
```

## Reusing Planned Entries as Patterns

### Unified Entity Design
The `planned_entries` table serves dual purpose:
1. **Planned entries**: Future expected transactions (`is_recurrent` flag)
2. **Saved patterns**: Historical transactions saved for reuse

**No new table needed** - just add a flag to distinguish:

```sql
ALTER TABLE planned_entries
ADD COLUMN is_saved_pattern BOOLEAN NOT NULL DEFAULT FALSE;

-- Planned entry (created before transaction happens)
INSERT INTO planned_entries (description, amount, is_recurrent, is_saved_pattern)
VALUES ('Weekly Lunch', 400.00, TRUE, FALSE);

-- Saved pattern (created from existing transaction)
INSERT INTO planned_entries (description, amount, is_recurrent, is_saved_pattern)
VALUES ('Netflix Subscription', 29.90, FALSE, TRUE);
```

### Save Pattern Workflow
1. User categorizes a transaction manually
2. User clicks "Save as Pattern"
3. Create `planned_entry` with:
   - `is_saved_pattern = TRUE`
   - `is_recurrent = FALSE`
   - Description, amount, category from transaction
4. Future similar transactions auto-match

## API Design

### GET /financial/match-suggestions
Returns match suggestions for uncategorized transactions.

**Request**:
```
GET /financial/match-suggestions?transaction_id=123
```

**Response**:
```json
{
  "transactionId": 123,
  "suggestions": [
    {
      "patternId": 456,
      "description": "Weekly Lunch",
      "amount": 400.00,
      "categoryId": 5,
      "categoryName": "Restaurants",
      "matchScore": {
        "categoryMatch": 1.0,
        "amountMatch": 0.95,
        "descriptionMatch": 0.88,
        "dateMatch": 1.0,
        "score": 0.92,
        "confidence": "HIGH"
      }
    }
  ]
}
```

### POST /financial/transactions/{id}/apply-pattern
Applies a matched pattern to a transaction.

**Request**:
```json
{
  "patternId": 456
}
```

**Response**:
```json
{
  "transactionId": 123,
  "categoryId": 5,
  "plannedEntryId": 456,
  "matched": true
}
```

### POST /financial/transactions/{id}/save-as-pattern
Saves a categorized transaction as a reusable pattern.

**Request**:
```json
{
  "saveAsRecurrent": false
}
```

**Response**:
```json
{
  "patternId": 789,
  "description": "Netflix Subscription",
  "amount": 29.90,
  "categoryId": 8
}
```

## Performance Optimization

### Early Exit Strategy
```go
func FindMatches(tx Transaction, patterns []PlannedEntry) []MatchScore {
    matches := []MatchScore{}

    for _, pattern := range patterns {
        // 1. Category filter (fast)
        if tx.CategoryID != pattern.CategoryID {
            continue  // Skip immediately
        }

        // 2. Amount pre-filter (fast)
        amountDiff := math.Abs(tx.Amount - pattern.Amount)
        if amountDiff / pattern.Amount > 0.10 {  // >10% diff
            continue  // Skip expensive fuzzy matching
        }

        // 3. Full scoring (expensive)
        score := CalculateMatchScore(tx, pattern)
        if score.Score >= 0.5 {  // Only return decent matches
            matches = append(matches, score)
        }
    }

    // Sort by score descending
    sort.Slice(matches, func(i, j int) bool {
        return matches[i].Score > matches[j].Score
    })

    return matches
}
```

### Index Strategy
```sql
-- Already exists from category-centric-budgeting
CREATE INDEX idx_planned_entries_category_id ON planned_entries(category_id);
CREATE INDEX idx_planned_entries_user_id ON planned_entries(user_id);

-- Add for pattern matching
CREATE INDEX idx_planned_entries_is_saved_pattern
ON planned_entries(is_saved_pattern)
WHERE is_saved_pattern = TRUE;
```

## Trade-offs

### Decision: Unified table vs Separate patterns table
**Chosen**: Unified (`planned_entries` for both)
**Why**:
- Simpler schema
- Patterns and planned entries are conceptually similar
- Easy to convert planned entry → pattern (just flip flag)
**Trade-off**: Slightly more complex queries (need WHERE clause for filtering)

### Decision: Fuzzy matching algorithm
**Chosen**: Levenshtein distance
**Why**:
- Well-understood, proven algorithm
- Good balance of accuracy and performance
- Available in many Go libraries
**Alternative considered**: Soundex (too loose, many false positives)

### Decision: Confidence thresholds
**Chosen**: 70% auto-apply, 50% suggest, <50% ignore
**Why**:
- Conservative to avoid false positives
- Users still review HIGH confidence matches
- MEDIUM matches require explicit confirmation
**Trade-off**: May miss some valid matches, but better safe than sorry
