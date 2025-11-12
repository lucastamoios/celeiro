# Transaction Matching System - Technical Specification

## Executive Summary

A unified system for:
1. **Planning future expenses** (planned entries)
2. **Saving transaction patterns** (templates from past transactions)
3. **Automatically matching** new transactions to templates
4. **Budget warnings** when planned spending deviates from income

**Key Decision:** Use a **single entity** (`transaction_templates`) that serves both purposes, since a planned entry IS a transaction template, and a saved transaction pattern IS a planned entry for future months.

---

## 1. Unified Entity: `transaction_templates`

### 1.1 Conceptual Model

A `transaction_template` represents:
- **As Planned Entry:** "I plan to spend $150 on groceries on the 5th"
- **As Transaction Pattern:** "I always spend ~$150 on groceries around the 5th"
- **As Both:** A recurring rent payment that is both planned AND pattern

### 1.2 Database Schema

```sql
CREATE TABLE transaction_templates (
    template_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),

    -- Classification
    category_id INTEGER NOT NULL REFERENCES categories(category_id),
    description VARCHAR(255) NOT NULL,

    -- Amount
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
    amount_tolerance DECIMAL(5,2) DEFAULT 0.25, -- 25% tolerance for matching

    -- Temporal
    month INTEGER CHECK (month >= 1 AND month <= 12), -- NULL if applies to all months
    year INTEGER CHECK (year >= 2000), -- NULL if recurrent across years
    expected_day_of_month INTEGER CHECK (expected_day_of_month >= 1 AND expected_day_of_month <= 31),

    -- Recurrence
    is_recurrent BOOLEAN NOT NULL DEFAULT FALSE,
    recurrence_frequency VARCHAR(20), -- 'monthly', 'weekly', 'biweekly', 'yearly'

    -- Template source
    template_type VARCHAR(20) NOT NULL CHECK (template_type IN ('manual', 'auto_learned')),
    -- 'manual': User created as planned entry
    -- 'auto_learned': System detected pattern from past transactions

    -- Matching rules (for auto-matching incoming transactions)
    enable_auto_match BOOLEAN NOT NULL DEFAULT TRUE,
    match_description_keywords TEXT[], -- Array of keywords to match in transaction descriptions

    -- Tracking
    times_matched INTEGER NOT NULL DEFAULT 0, -- How many transactions matched this template
    last_matched_at TIMESTAMP,

    -- Per-month instantiation (if template is recurrent)
    -- When recurrent template is copied to a specific month, it creates instances
    parent_template_id INTEGER REFERENCES transaction_templates(template_id),
    -- If not NULL, this is an instance of a recurrent template for a specific month

    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- Constraints
    CHECK (is_recurrent = FALSE OR recurrence_frequency IS NOT NULL),
    CHECK (NOT is_recurrent OR (month IS NULL AND year IS NULL)), -- Recurrent templates don't have specific month/year
    CHECK (parent_template_id IS NULL OR (month IS NOT NULL AND year IS NOT NULL)) -- Instances must have month/year
);

CREATE INDEX idx_transaction_templates_lookup ON transaction_templates(user_id, organization_id, month, year);
CREATE INDEX idx_transaction_templates_category ON transaction_templates(category_id);
CREATE INDEX idx_transaction_templates_recurrent ON transaction_templates(is_recurrent) WHERE is_recurrent = TRUE;
CREATE INDEX idx_transaction_templates_parent ON transaction_templates(parent_template_id) WHERE parent_template_id IS NOT NULL;
CREATE INDEX idx_transaction_templates_matching ON transaction_templates(enable_auto_match, category_id) WHERE enable_auto_match = TRUE;
```

### 1.3 Template Instances vs Parent Templates

**Parent Template (Recurrent):**
```sql
-- "Monthly rent"
template_id: 1
description: "Rent payment"
amount: 1500.00
month: NULL
year: NULL
is_recurrent: TRUE
recurrence_frequency: 'monthly'
parent_template_id: NULL
```

**Template Instance (Specific Month):**
```sql
-- "November 2025 rent instance"
template_id: 100
description: "Rent payment"
amount: 1500.00
month: 11
year: 2025
is_recurrent: FALSE
parent_template_id: 1 -- Links back to parent
```

**Why this structure?**
- Parent template = master definition
- Instances = monthly copies that can be modified independently
- User can change November's rent without affecting December

---

## 2. Template-Transaction Linking

### 2.1 Table: `template_matches`

```sql
CREATE TABLE template_matches (
    match_id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES transaction_templates(template_id),
    transaction_id INTEGER NOT NULL REFERENCES transactions(transaction_id),

    -- Match metadata
    match_confidence DECIMAL(5,4) NOT NULL CHECK (match_confidence >= 0 AND match_confidence <= 1),
    -- 1.0 = perfect match, 0.5 = weak match

    match_method VARCHAR(20) NOT NULL CHECK (match_method IN ('manual', 'auto_exact', 'auto_fuzzy')),
    -- 'manual': User linked manually
    -- 'auto_exact': System matched exactly (description + amount + category)
    -- 'auto_fuzzy': System matched with fuzzy logic

    matched_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(transaction_id) -- One transaction can only match one template
);

CREATE INDEX idx_template_matches_template ON template_matches(template_id);
CREATE INDEX idx_template_matches_transaction ON template_matches(transaction_id);
```

---

## 3. Matching Algorithm

### 3.1 Matching Score Calculation

When a new transaction is created, calculate match score with each potential template:

```go
type MatchScore struct {
    TemplateID      int
    Score           float64 // 0.0 to 1.0
    DescriptionMatch float64
    AmountMatch     float64
    DateMatch       float64
    CategoryMatch   float64
}

func (s *service) CalculateMatchScore(transaction Transaction, template TransactionTemplate) MatchScore {
    var score MatchScore
    score.TemplateID = template.TemplateID

    // 1. Category match (40% weight) - must match exactly
    if transaction.CategoryID != template.CategoryID {
        return score // Score = 0, no match if category doesn't match
    }
    score.CategoryMatch = 1.0

    // 2. Amount match (30% weight)
    tolerance := template.AmountTolerance // e.g., 0.25 = 25%
    amountDiff := math.Abs(transaction.Amount.Sub(template.Amount).InexactFloat64())
    amountDiffPercent := amountDiff / template.Amount.InexactFloat64()

    if amountDiffPercent <= tolerance {
        // Within tolerance
        score.AmountMatch = 1.0 - (amountDiffPercent / tolerance) // Closer = higher score
    } else {
        return score // Outside tolerance, no match
    }

    // 3. Description match (20% weight)
    score.DescriptionMatch = s.fuzzyMatchDescription(transaction.Description, template.Description, template.MatchDescriptionKeywords)

    // 4. Date match (10% weight) - if template has expected day of month
    if template.ExpectedDayOfMonth != nil {
        transactionDay := transaction.TransactionDate.Day()
        expectedDay := *template.ExpectedDayOfMonth
        dayDiff := math.Abs(float64(transactionDay - expectedDay))

        if dayDiff <= 3 {
            // Within 3 days
            score.DateMatch = 1.0 - (dayDiff / 3.0)
        }
    } else {
        score.DateMatch = 1.0 // No expectation, so doesn't hurt score
    }

    // Calculate weighted total
    score.Score = (score.CategoryMatch * 0.4) +
                  (score.AmountMatch * 0.3) +
                  (score.DescriptionMatch * 0.2) +
                  (score.DateMatch * 0.1)

    return score
}
```

### 3.2 Fuzzy Description Matching

```go
func (s *service) fuzzyMatchDescription(transactionDesc, templateDesc string, keywords []string) float64 {
    transactionDesc = strings.ToLower(strings.TrimSpace(transactionDesc))
    templateDesc = strings.ToLower(strings.TrimSpace(templateDesc))

    // Exact match
    if transactionDesc == templateDesc {
        return 1.0
    }

    // Check if template description is substring of transaction
    if strings.Contains(transactionDesc, templateDesc) {
        return 0.9
    }

    // Check keywords (if provided)
    if len(keywords) > 0 {
        matchCount := 0
        for _, keyword := range keywords {
            if strings.Contains(transactionDesc, strings.ToLower(keyword)) {
                matchCount++
            }
        }
        if matchCount > 0 {
            return float64(matchCount) / float64(len(keywords))
        }
    }

    // Levenshtein distance (edit distance)
    distance := levenshteinDistance(transactionDesc, templateDesc)
    maxLen := math.Max(float64(len(transactionDesc)), float64(len(templateDesc)))
    similarity := 1.0 - (float64(distance) / maxLen)

    if similarity > 0.6 {
        return similarity
    }

    return 0.0
}
```

### 3.3 Auto-Matching Flow

```go
func (s *service) CreateTransaction(ctx context.Context, input CreateTransactionInput) (*Transaction, error) {
    // 1. Create transaction as usual
    transaction, err := s.repo.CreateTransaction(ctx, input)
    if err != nil {
        return nil, err
    }

    // 2. Find matching templates
    templates, err := s.repo.FetchMatchableTemplates(ctx, FetchMatchableTemplatesParams{
        UserID:         input.UserID,
        OrganizationID: input.OrganizationID,
        CategoryID:     input.CategoryID,
        Month:          transaction.TransactionDate.Month(),
        Year:           transaction.TransactionDate.Year(),
    })
    if err != nil {
        return nil, err
    }

    // 3. Calculate match scores
    var bestMatch *MatchScore
    for _, template := range templates {
        score := s.CalculateMatchScore(*transaction, template)

        if score.Score >= 0.7 { // 70% confidence threshold
            if bestMatch == nil || score.Score > bestMatch.Score {
                bestMatch = &score
            }
        }
    }

    // 4. Auto-link if high confidence match found
    if bestMatch != nil && bestMatch.Score >= 0.8 {
        // Auto-link with high confidence
        err = s.repo.CreateTemplateMatch(ctx, CreateTemplateMatchParams{
            TemplateID:      bestMatch.TemplateID,
            TransactionID:   transaction.TransactionID,
            MatchConfidence: decimal.NewFromFloat(bestMatch.Score),
            MatchMethod:     "auto_exact",
        })
        if err != nil {
            return nil, err
        }

        // Update template stats
        err = s.repo.IncrementTemplateMatchCount(ctx, bestMatch.TemplateID)
        if err != nil {
            return nil, err
        }
    } else if bestMatch != nil && bestMatch.Score >= 0.7 {
        // Suggest match to user (return in transaction response)
        transaction.SuggestedTemplateID = &bestMatch.TemplateID
        transaction.SuggestedMatchScore = bestMatch.Score
    }

    return transaction, nil
}
```

---

## 4. Auto-Learning Transaction Patterns

### 4.1 Pattern Detection

After user manually categorizes similar transactions multiple times, suggest creating a template:

```go
func (s *service) DetectRecurringPattern(ctx context.Context, userID, orgID, categoryID int) (*TransactionTemplate, error) {
    // Find transactions with similar descriptions/amounts
    // over last 3 months

    transactions, err := s.repo.FetchTransactionsForPatternDetection(ctx, FetchTransactionsForPatternDetectionParams{
        UserID:         userID,
        OrganizationID: orgID,
        CategoryID:     categoryID,
        MonthsBack:     3,
    })
    if err != nil {
        return nil, err
    }

    // Group by similar description (fuzzy clustering)
    clusters := s.clusterTransactionsByDescription(transactions)

    // Find clusters with 3+ transactions
    for _, cluster := range clusters {
        if len(cluster) >= 3 {
            // Detected recurring pattern!

            // Calculate average amount
            avgAmount := decimal.Zero
            for _, tx := range cluster {
                avgAmount = avgAmount.Add(tx.Amount)
            }
            avgAmount = avgAmount.Div(decimal.NewFromInt(int64(len(cluster))))

            // Calculate average day of month
            totalDay := 0
            for _, tx := range cluster {
                totalDay += tx.TransactionDate.Day()
            }
            avgDay := totalDay / len(cluster)

            // Calculate amount variance
            variance := s.calculateAmountVariance(cluster)
            tolerance := decimal.NewFromFloat(variance * 1.5) // 1.5x variance as tolerance

            // Suggest template to user
            template := &TransactionTemplate{
                UserID:              userID,
                OrganizationID:      orgID,
                CategoryID:          categoryID,
                Description:         s.extractCommonDescription(cluster),
                Amount:              avgAmount,
                AmountTolerance:     tolerance,
                ExpectedDayOfMonth:  &avgDay,
                IsRecurrent:         true,
                RecurrenceFrequency: "monthly",
                TemplateType:        "auto_learned",
                EnableAutoMatch:     true,
            }

            return template, nil
        }
    }

    return nil, nil // No pattern detected
}
```

### 4.2 User Confirmation Flow

```go
// API endpoint: GET /financial/templates/suggestions
// Returns auto-detected patterns for user to confirm

{
  "suggested_templates": [
    {
      "pattern_id": "temp_1",
      "description": "Netflix subscription",
      "category_name": "Entertainment",
      "avg_amount": 15.99,
      "frequency": "monthly",
      "detected_from": 4, // 4 transactions
      "last_occurrence": "2025-10-15",
      "sample_transactions": [
        {"date": "2025-08-15", "amount": 15.99, "description": "NETFLIX.COM"},
        {"date": "2025-09-15", "amount": 15.99, "description": "Netflix"},
        {"date": "2025-10-15", "amount": 15.99, "description": "NETFLIX SUBSCRIPTION"}
      ]
    }
  ]
}

// User clicks "Save as Template"
// POST /financial/templates/accept-suggestion
{
  "pattern_id": "temp_1",
  "adjust_description": "Netflix Subscription", // User can tweak
  "adjust_amount": 15.99
}
```

---

## 5. Budget Planning & Warnings

### 5.1 Income Tracking

Need to add income tracking to compare against planned expenses:

```sql
CREATE TABLE income_sources (
    income_source_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),

    source_name VARCHAR(255) NOT NULL, -- "Salary", "Freelance", "Investment"
    amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),

    -- Recurrence
    is_recurrent BOOLEAN NOT NULL DEFAULT TRUE,
    recurrence_frequency VARCHAR(20), -- 'monthly', 'biweekly', 'yearly'
    expected_day_of_month INTEGER,

    -- Tracking
    month INTEGER CHECK (month >= 1 AND month <= 12),
    year INTEGER CHECK (year >= 2000),

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, organization_id, source_name, month, year)
);
```

### 5.2 Budget Variance Warnings

**Planning Discipline Thresholds (Strict Budget Control):**

**1. Income Planning:** 0.25% of income can remain unplanned
- Income $10,000 → max $25 unplanned
- Income $5,000 → max $12.50 unplanned
- Income $1,000 → max $2.50 unplanned

**2. Category Variance:** Very strict tracking
- **1% deviation** → Warning (e.g., planned $1000, actual $1010)
- **10% deviation** → Critical error (e.g., planned $1000, actual $1100)

These strict thresholds ensure users intentionally plan nearly all their income and stay tightly aligned with their category budgets.

```go
type BudgetWarning struct {
    WarningType    string          // 'over_budget', 'under_budget', 'exceeds_income', 'insufficient_planning'
    Severity       string          // 'info', 'warning', 'critical'
    Message        string
    CurrentAmount  decimal.Decimal
    PlannedAmount  decimal.Decimal
    VarianceAmount decimal.Decimal
    VariancePercent float64
}

const (
    // Planning discipline: only 0.25% of income can remain unallocated
    UnplannedIncomeThreshold = 0.0025 // 0.25%

    // Category variance thresholds (strict budget discipline)
    CategoryVarianceWarningThreshold  = 0.01 // 1% deviation triggers warning
    CategoryVarianceCriticalThreshold = 0.10 // 10% deviation triggers critical error
)

func (s *service) CheckBudgetWarnings(ctx context.Context, userID, orgID, month, year int) ([]BudgetWarning, error) {
    var warnings []BudgetWarning

    // 1. Get all category budgets for month
    budgets, err := s.repo.FetchCategoryBudgets(ctx, FetchCategoryBudgetsParams{
        UserID:         userID,
        OrganizationID: orgID,
        Month:          month,
        Year:           year,
    })
    if err != nil {
        return nil, err
    }

    // 2. Calculate total planned spending
    totalPlanned := decimal.Zero
    for _, budget := range budgets {
        totalPlanned = totalPlanned.Add(budget.PlannedAmount)
    }

    // 3. Get income for month
    income, err := s.repo.FetchMonthlyIncome(ctx, FetchMonthlyIncomeParams{
        UserID:         userID,
        OrganizationID: orgID,
        Month:          month,
        Year:           year,
    })
    if err != nil {
        return nil, err
    }

    totalIncome := decimal.Zero
    for _, inc := range income {
        totalIncome = totalIncome.Add(inc.Amount)
    }

    // 4. Check if planned spending EXCEEDS income (overspending)
    if totalPlanned.GreaterThan(totalIncome) {
        overage := totalPlanned.Sub(totalIncome)
        overagePercent := overage.Div(totalIncome).Mul(decimal.NewFromInt(100)).InexactFloat64()

        warnings = append(warnings, BudgetWarning{
            WarningType:     "exceeds_income",
            Severity:        "critical",
            Message:         fmt.Sprintf("⚠️ Planned spending exceeds income by $%.2f (%.2f%%)", overage.InexactFloat64(), overagePercent),
            CurrentAmount:   totalPlanned,
            PlannedAmount:   totalIncome,
            VarianceAmount:  overage,
            VariancePercent: overagePercent,
        })
    }

    // 5. Check if TOO MUCH income is unplanned (insufficient planning)
    // CRITICAL: Only 0.25% of income can remain unallocated
    if totalIncome.GreaterThan(decimal.Zero) {
        unplanned := totalIncome.Sub(totalPlanned)

        // Calculate allowed unplanned amount (0.25% of income)
        allowedUnplanned := totalIncome.Mul(decimal.NewFromFloat(UnplannedIncomeThreshold))

        if unplanned.GreaterThan(allowedUnplanned) {
            excessUnplanned := unplanned.Sub(allowedUnplanned)
            unplannedPercent := unplanned.Div(totalIncome).Mul(decimal.NewFromInt(100)).InexactFloat64()

            severity := "warning"
            if unplannedPercent > 5.0 { // More than 5% unplanned = critical
                severity = "critical"
            }

            warnings = append(warnings, BudgetWarning{
                WarningType:     "insufficient_planning",
                Severity:        severity,
                Message:         fmt.Sprintf("💡 You have $%.2f (%.2f%%) of income unplanned. Please allocate $%.2f more to categories.",
                    unplanned.InexactFloat64(),
                    unplannedPercent,
                    excessUnplanned.InexactFloat64()),
                CurrentAmount:   totalPlanned,
                PlannedAmount:   totalIncome,
                VarianceAmount:  unplanned,
                VariancePercent: unplannedPercent,
            })
        }
    }

    // 6. Check each category for variance (strict: 1% warning, 10% critical)
    for _, budget := range budgets {
        actualSpent, err := s.calculateActualSpent(ctx, budget.CategoryID, month, year)
        if err != nil {
            continue
        }

        if budget.PlannedAmount.IsZero() {
            continue // Can't calculate variance if no plan
        }

        variance := actualSpent.Sub(budget.PlannedAmount)
        variancePercent := variance.Div(budget.PlannedAmount).InexactFloat64()

        // Check thresholds: 1% warning, 10% critical
        if math.Abs(variancePercent) >= CategoryVarianceWarningThreshold {
            severity := "warning"
            if math.Abs(variancePercent) >= CategoryVarianceCriticalThreshold {
                severity = "critical"
            }

            category, _ := s.repo.FetchCategoryByID(ctx, FetchCategoryByIDParams{CategoryID: budget.CategoryID})

            warningType := "over_budget"
            emoji := "📈"
            direction := "over"
            if variancePercent < 0 {
                warningType = "under_budget"
                emoji = "📉"
                direction = "under"
            }

            warnings = append(warnings, BudgetWarning{
                WarningType:     warningType,
                Severity:        severity,
                Message:         fmt.Sprintf("%s %s: %.1f%% %s (planned: $%.2f, actual: $%.2f)",
                    emoji,
                    category.Name,
                    math.Abs(variancePercent*100),
                    direction,
                    budget.PlannedAmount.InexactFloat64(),
                    actualSpent.InexactFloat64()),
                CurrentAmount:   actualSpent,
                PlannedAmount:   budget.PlannedAmount,
                VarianceAmount:  variance,
                VariancePercent: variancePercent * 100,
            })
        }
    }

    return warnings, nil
}
```

---

## 6. API Endpoints

### 6.1 Template Management

#### POST /financial/templates
**Purpose:** Create a new template (manually)

**Request:**
```json
{
  "category_id": 35,
  "description": "Weekly groceries",
  "amount": 150.00,
  "expected_day_of_month": 5,
  "is_recurrent": true,
  "recurrence_frequency": "weekly",
  "enable_auto_match": true,
  "match_keywords": ["grocery", "market", "supermarket"]
}
```

#### GET /financial/templates?month={month}&year={year}
**Purpose:** Get all templates for a month (includes both planned and learned)

**Response:**
```json
{
  "status": 200,
  "data": {
    "templates": [
      {
        "template_id": 1,
        "category_id": 35,
        "category_name": "Groceries",
        "description": "Weekly groceries",
        "amount": 150.00,
        "is_recurrent": true,
        "matched_this_month": true,
        "match_count": 12
      }
    ]
  }
}
```

#### GET /financial/templates/suggestions
**Purpose:** Get auto-detected patterns waiting for user confirmation

#### POST /financial/templates/accept-suggestion
**Purpose:** Convert a suggested pattern into a permanent template

### 6.2 Transaction Creation (Enhanced)

#### POST /financial/transactions
**Request:**
```json
{
  "account_id": 1,
  "category_id": 35,
  "amount": 155.00,
  "description": "Whole Foods Market",
  "transaction_type": "debit",
  "transaction_date": "2025-11-05",
  "template_id": 1  // Optional: manually link to template
}
```

**Response (with auto-match):**
```json
{
  "status": 201,
  "data": {
    "transaction_id": 123,
    "auto_matched": true,
    "matched_template": {
      "template_id": 1,
      "description": "Weekly groceries",
      "match_confidence": 0.85
    }
  }
}
```

**Response (with suggestion):**
```json
{
  "status": 201,
  "data": {
    "transaction_id": 123,
    "auto_matched": false,
    "suggested_template": {
      "template_id": 1,
      "description": "Weekly groceries",
      "match_confidence": 0.75,
      "message": "This looks similar to 'Weekly groceries'. Link it?"
    }
  }
}
```

### 6.3 Budget Warnings

#### GET /financial/budgets/warnings?month={month}&year={year}
**Purpose:** Get all budget warnings for a month

**Response:**
```json
{
  "status": 200,
  "data": {
    "warnings": [
      {
        "type": "exceeds_income",
        "severity": "critical",
        "message": "Planned spending exceeds income by $500.00 (20.0%)",
        "current_amount": 3000.00,
        "planned_amount": 2500.00,
        "variance_percent": 20.0
      },
      {
        "type": "over_budget",
        "severity": "critical",
        "message": "📈 Groceries: 30.0% over (planned: $800.00, actual: $1040.00)",
        "current_amount": 1040.00,
        "planned_amount": 800.00,
        "variance_percent": 30.0
      },
      {
        "type": "over_budget",
        "severity": "warning",
        "message": "📈 Entertainment: 2.5% over (planned: $200.00, actual: $205.00)",
        "current_amount": 205.00,
        "planned_amount": 200.00,
        "variance_percent": 2.5
      }
    ]
  }
}
```

---

## 7. Frontend Integration

### 7.1 Transaction Creation with Matching

```tsx
// When user creates transaction:
<TransactionForm>
  {/* Standard fields */}
  <Input name="amount" />
  <Input name="description" />
  <CategorySelect name="category_id" />

  {/* If suggested template exists */}
  {suggestedTemplate && (
    <Alert type="info">
      💡 This looks like "{suggestedTemplate.description}"
      <Button onClick={linkToTemplate}>Link to template</Button>
      <Button onClick={ignoresuggestion}>Not this time</Button>
    </Alert>
  )}

  {/* Show unfulfilled templates for this category */}
  {unfulfilledTemplates.length > 0 && (
    <Select label="Link to planned expense:">
      <option value="">None</option>
      {unfulfilledTemplates.map(template => (
        <option value={template.template_id}>
          {template.description} - ${template.amount}
        </option>
      ))}
    </Select>
  )}
</TransactionForm>
```

### 7.2 Budget Warnings Display

```tsx
<BudgetWarningsBanner month={11} year={2025}>
  {warnings.map(warning => (
    <Alert severity={warning.severity}>
      <WarningIcon type={warning.type} />
      {warning.message}
      {warning.type === 'exceeds_income' && (
        <Button>Adjust budget</Button>
      )}
    </Alert>
  ))}
</BudgetWarningsBanner>
```

### 7.3 Template Suggestions

```tsx
<TemplateSuggestionsModal>
  <h2>We noticed some patterns in your spending</h2>
  {suggestions.map(suggestion => (
    <Card>
      <h3>{suggestion.description}</h3>
      <p>Detected from {suggestion.detected_from} transactions</p>
      <p>Average: ${suggestion.avg_amount} on day {suggestion.expected_day}</p>

      <TransactionList transactions={suggestion.sample_transactions} />

      <ButtonGroup>
        <Button onClick={() => acceptSuggestion(suggestion.pattern_id)}>
          Save as template
        </Button>
        <Button variant="secondary" onClick={() => dismissSuggestion(suggestion.pattern_id)}>
          Dismiss
        </Button>
      </ButtonGroup>
    </Card>
  ))}
</TemplateSuggestionsModal>
```

---

## 8. Configuration

### 8.1 Matching Settings (Per User/Org)

```sql
CREATE TABLE matching_settings (
    user_id INTEGER NOT NULL REFERENCES users(user_id),
    organization_id INTEGER NOT NULL REFERENCES organizations(organization_id),

    -- Auto-matching
    enable_auto_matching BOOLEAN NOT NULL DEFAULT TRUE,
    auto_match_confidence_threshold DECIMAL(3,2) DEFAULT 0.80, -- 80%

    -- Pattern detection
    enable_pattern_detection BOOLEAN NOT NULL DEFAULT TRUE,
    pattern_detection_min_occurrences INTEGER DEFAULT 3, -- Need 3+ transactions to suggest

    -- Variance warnings
    enable_variance_warnings BOOLEAN NOT NULL DEFAULT TRUE,
    category_variance_warning_threshold DECIMAL(5,4) DEFAULT 0.01, -- 1%
    category_variance_critical_threshold DECIMAL(5,4) DEFAULT 0.10, -- 10%
    unplanned_income_threshold DECIMAL(5,4) DEFAULT 0.0025, -- 0.25%

    -- Income tracking
    require_income_planning BOOLEAN NOT NULL DEFAULT FALSE, -- Force users to plan income

    PRIMARY KEY (user_id, organization_id)
);
```

---

## 9. Example Workflows

### 9.1 User Creates Recurring Expense Template

1. User goes to Groceries category budget for November
2. Clicks "+ Add planned entry"
3. Fills form:
   - Description: "Weekly shopping"
   - Amount: $150
   - Day of month: 5
   - Recurrent: Yes (monthly)
   - Enable auto-match: Yes
   - Keywords: "grocery", "market"
4. System creates template (parent)
5. System creates instance for November
6. System calculates budget: Groceries = $150

### 9.2 System Auto-Matches Transaction

1. User imports bank transaction:
   - Description: "WHOLE FOODS MARKET #123"
   - Amount: $155.00
   - Category: Groceries
   - Date: Nov 5
2. System searches matching templates
3. Finds "Weekly shopping" template:
   - Category: ✓ (Groceries)
   - Amount: $155 vs $150 = 3.3% diff ✓ (within 25% tolerance)
   - Description: contains "market" keyword ✓
   - Date: Nov 5 vs expected Nov 5 = exact match ✓
4. Match score: 0.92 (92%)
5. Auto-links (threshold is 80%)
6. Marks template instance as fulfilled
7. Updates template: times_matched++

### 9.3 System Detects Pattern & Suggests Template

1. User manually categorizes transactions:
   - Oct 15: "NETFLIX.COM" $15.99 → Entertainment
   - Sep 15: "Netflix" $15.99 → Entertainment
   - Aug 15: "NETFLIX SUBSCRIPTION" $15.99 → Entertainment
2. System detects pattern (3 transactions, ~same amount, ~same day, same category)
3. Shows suggestion: "Save 'Netflix subscription' as recurring template?"
4. User accepts
5. System creates recurrent parent template
6. System creates instance for November
7. Future Netflix charges auto-match

### 9.4 Budget Variance Warning

**Current state (November 15th):**
- Groceries planned: $800
- Groceries actual: $1040
- Variance: +$240 (30%)

System shows warning:
```
⚠️ Groceries is 30% over budget
   Planned: $800 | Actual: $1040

   You've spent $240 more than planned.
   Projected month-end: $1,680 (110% over)
```

---

## 10. Key Insights

`★ Insight ─────────────────────────────────────`
**1. Templates = Universal Abstraction**: By unifying planned entries and saved transaction patterns into one entity, we avoid data duplication and create a single source of truth. A "Netflix subscription" is simultaneously a plan, a pattern, and a matching rule.

**2. Match Confidence Scoring**: The weighted scoring system (40% category, 30% amount, 20% description, 10% date) prioritizes what matters most. Category is king - no match if categories don't align. This prevents false positives like matching rent to groceries.

**3. Auto-Learning vs Manual Control**: The system learns from user behavior (pattern detection) but always asks permission before creating templates. This balances automation with user agency - the AI suggests, but the human decides.

**4. Variance as Accountability**: The 25% variance threshold creates a "budget buffer" - small overages are normal, but 25%+ variance triggers warnings. This prevents alarm fatigue (5% over is fine) while catching real problems (50% over is critical).

**5. Income as Budget Constraint**: By tracking income and warning when planned spending exceeds it, the system prevents unrealistic budgets. This is basic accounting: you can't spend what you don't earn. Many budgeting apps skip this obvious check.
`─────────────────────────────────────────────────`

---

## 11. Implementation Checklist

**Phase 1: Database**
- [ ] Create `transaction_templates` table
- [ ] Create `template_matches` table
- [ ] Create `income_sources` table
- [ ] Create `matching_settings` table
- [ ] Migration from old `planned_entries` concept

**Phase 2: Core Matching Logic**
- [ ] Implement match score calculation
- [ ] Implement fuzzy description matching (Levenshtein)
- [ ] Implement auto-matching on transaction creation
- [ ] Implement template statistics tracking

**Phase 3: Pattern Detection**
- [ ] Implement transaction clustering by description
- [ ] Implement pattern detection algorithm
- [ ] Create suggestion API endpoints
- [ ] Implement accept/dismiss suggestion flows

**Phase 4: Budget Warnings**
- [ ] Implement income tracking
- [ ] Implement variance calculation (25% threshold)
- [ ] Implement warning generation
- [ ] Create warnings API endpoint

**Phase 5: Frontend**
- [ ] Build transaction creation with matching
- [ ] Build template management UI
- [ ] Build pattern suggestion modal
- [ ] Build budget warnings banner
- [ ] Build income planning interface

**Phase 6: Testing & Refinement**
- [ ] Test matching accuracy with real data
- [ ] Tune confidence thresholds
- [ ] Test pattern detection sensitivity
- [ ] User testing for warning clarity

---

Would you like me to start implementing this system? Which phase should we tackle first?
