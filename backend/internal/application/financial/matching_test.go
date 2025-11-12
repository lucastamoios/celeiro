package financial

import (
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Test levenshteinDistance
// =============================================================================

func TestLevenshteinDistance(t *testing.T) {
	tests := []struct {
		name     string
		s1       string
		s2       string
		expected int
	}{
		{
			name:     "Identical strings",
			s1:       "netflix",
			s2:       "netflix",
			expected: 0,
		},
		{
			name:     "One character difference",
			s1:       "netflix",
			s2:       "netflik",
			expected: 1,
		},
		{
			name:     "Completely different",
			s1:       "abc",
			s2:       "xyz",
			expected: 3,
		},
		{
			name:     "Empty string",
			s1:       "",
			s2:       "test",
			expected: 4,
		},
		{
			name:     "Both empty",
			s1:       "",
			s2:       "",
			expected: 0,
		},
		{
			name:     "Unicode characters",
			s1:       "café",
			s2:       "caffe",
			expected: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := levenshteinDistance(tt.s1, tt.s2)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// Test normalizeString
// =============================================================================

func TestNormalizeString(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Lowercase conversion",
			input:    "NETFLIX",
			expected: "netflix",
		},
		{
			name:     "Trim whitespace",
			input:    "  netflix  ",
			expected: "netflix",
		},
		{
			name:     "Multiple spaces",
			input:    "netflix   subscription   premium",
			expected: "netflix subscription premium",
		},
		{
			name:     "Mixed case and spaces",
			input:    "  NETFLIX  PREMIUM  ",
			expected: "netflix premium",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := normalizeString(tt.input)
			assert.Equal(t, tt.expected, result)
		})
	}
}

// =============================================================================
// Test fuzzyMatchDescription
// =============================================================================

func TestFuzzyMatchDescription(t *testing.T) {
	tests := []struct {
		name     string
		desc1    string
		desc2    string
		minScore float64 // Minimum expected score
	}{
		{
			name:     "Exact match",
			desc1:    "Netflix Subscription",
			desc2:    "Netflix Subscription",
			minScore: 1.0,
		},
		{
			name:     "Case insensitive",
			desc1:    "NETFLIX SUBSCRIPTION",
			desc2:    "netflix subscription",
			minScore: 1.0,
		},
		{
			name:     "Similar descriptions",
			desc1:    "Netflix Premium BR",
			desc2:    "Netflix Premium",
			minScore: 0.8,
		},
		{
			name:     "Very different",
			desc1:    "Netflix",
			desc2:    "Amazon Prime",
			minScore: 0.0,
		},
		{
			name:     "Empty strings",
			desc1:    "",
			desc2:    "test",
			minScore: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := fuzzyMatchDescription(tt.desc1, tt.desc2)
			assert.GreaterOrEqual(t, result, tt.minScore)
			assert.LessOrEqual(t, result, 1.0)
		})
	}
}

// =============================================================================
// Test calculateAmountScore
// =============================================================================

func TestCalculateAmountScore(t *testing.T) {
	tests := []struct {
		name            string
		txAmount        decimal.Decimal
		patternAmount   decimal.Decimal
		expectedScore   float64
		scoreComparison string // "equal", "greater", "less"
	}{
		{
			name:            "Exact match",
			txAmount:        decimal.NewFromFloat(45.90),
			patternAmount:   decimal.NewFromFloat(45.90),
			expectedScore:   1.0,
			scoreComparison: "equal",
		},
		{
			name:            "Within tolerance (2%)",
			txAmount:        decimal.NewFromFloat(46.00),
			patternAmount:   decimal.NewFromFloat(45.90),
			expectedScore:   1.0,
			scoreComparison: "equal",
		},
		{
			name:            "Just above tolerance",
			txAmount:        decimal.NewFromFloat(48.00),
			patternAmount:   decimal.NewFromFloat(45.90),
			expectedScore:   0.5,
			scoreComparison: "greater",
		},
		{
			name:            "Large difference",
			txAmount:        decimal.NewFromFloat(100.00),
			patternAmount:   decimal.NewFromFloat(45.90),
			expectedScore:   0.0,
			scoreComparison: "greater",
		},
		{
			name:            "Both zero",
			txAmount:        decimal.NewFromInt(0),
			patternAmount:   decimal.NewFromInt(0),
			expectedScore:   1.0,
			scoreComparison: "equal",
		},
		{
			name:            "One zero",
			txAmount:        decimal.NewFromInt(0),
			patternAmount:   decimal.NewFromFloat(45.90),
			expectedScore:   0.0,
			scoreComparison: "equal",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateAmountScore(tt.txAmount, tt.patternAmount)
			switch tt.scoreComparison {
			case "equal":
				assert.Equal(t, tt.expectedScore, result)
			case "greater":
				assert.GreaterOrEqual(t, result, tt.expectedScore)
			case "less":
				assert.LessOrEqual(t, result, tt.expectedScore)
			}
			// Score should always be between 0 and 1
			assert.GreaterOrEqual(t, result, 0.0)
			assert.LessOrEqual(t, result, 1.0)
		})
	}
}

// =============================================================================
// Test calculateDateScore
// =============================================================================

func TestCalculateDateScore(t *testing.T) {
	baseDate := time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		txDate        time.Time
		patternDate   time.Time
		expectedScore float64
	}{
		{
			name:          "Same date",
			txDate:        baseDate,
			patternDate:   baseDate,
			expectedScore: 1.0,
		},
		{
			name:          "Within proximity (1 day)",
			txDate:        baseDate,
			patternDate:   baseDate.AddDate(0, 0, 1),
			expectedScore: 1.0,
		},
		{
			name:          "Within proximity (3 days)",
			txDate:        baseDate,
			patternDate:   baseDate.AddDate(0, 0, 3),
			expectedScore: 1.0,
		},
		{
			name:          "Just outside proximity",
			txDate:        baseDate,
			patternDate:   baseDate.AddDate(0, 0, 5),
			expectedScore: 0.8,
		},
		{
			name:          "Far apart (30 days)",
			txDate:        baseDate,
			patternDate:   baseDate.AddDate(0, 0, 30),
			expectedScore: 0.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := calculateDateScore(tt.txDate, tt.patternDate)
			assert.InDelta(t, tt.expectedScore, result, 0.2, "Date score should be within 0.2 of expected")
			assert.GreaterOrEqual(t, result, 0.0)
			assert.LessOrEqual(t, result, 1.0)
		})
	}
}

// =============================================================================
// Test CalculateMatchScore
// =============================================================================

func TestCalculateMatchScore_PerfectMatch(t *testing.T) {
	categoryID := 5
	expectedDay := 15
	txDate := time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: txDate,
		CategoryID:      &categoryID,
	}

	pattern := &PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		ExpectedDay:    &expectedDay,
	}

	score := CalculateMatchScore(tx, pattern)

	assert.NotNil(t, score)
	assert.Equal(t, 1.0, score.CategoryScore)
	assert.Equal(t, 1.0, score.AmountScore)
	assert.Equal(t, 1.0, score.DescriptionScore)
	assert.Equal(t, 1.0, score.DateScore)
	assert.InDelta(t, 1.0, score.TotalScore, 0.0001, "Total score should be 1.0")
	assert.Equal(t, "HIGH", score.Confidence)
}

func TestCalculateMatchScore_CategoryMismatch(t *testing.T) {
	categoryID := 5
	differentCategoryID := 6

	tx := &TransactionModel{
		TransactionID: 100,
		Description:   "Netflix Subscription",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	pattern := &PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     differentCategoryID, // Different category
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
	}

	score := CalculateMatchScore(tx, pattern)

	assert.NotNil(t, score)
	assert.Equal(t, 0.0, score.CategoryScore)
	assert.Equal(t, 0.0, score.TotalScore)
	assert.Equal(t, "LOW", score.Confidence)
}

func TestCalculateMatchScore_PartialMatch(t *testing.T) {
	categoryID := 5

	tx := &TransactionModel{
		TransactionID: 100,
		Description:   "NETFLIX COM BR",
		Amount:        decimal.NewFromFloat(46.00), // Slightly different
		CategoryID:    &categoryID,
	}

	pattern := &PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		ExpectedDay:    nil, // No expected day
	}

	score := CalculateMatchScore(tx, pattern)

	assert.NotNil(t, score)
	assert.Equal(t, 1.0, score.CategoryScore)
	assert.Greater(t, score.AmountScore, 0.8)
	assert.Greater(t, score.DescriptionScore, 0.4)
	assert.Greater(t, score.TotalScore, 0.5)
}

// =============================================================================
// Test FindMatches
// =============================================================================

func TestFindMatches_SortsByScore(t *testing.T) {
	categoryID := 5
	expectedDay := 15

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	patterns := []*PlannedEntryModel{
		{
			PlannedEntryID: 201,
			CategoryID:     categoryID,
			Description:    "Spotify Premium", // Poor match
			Amount:         decimal.NewFromFloat(19.90),
		},
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription", // Perfect match
			Amount:         decimal.NewFromFloat(45.90),
			ExpectedDay:    &expectedDay,
		},
		{
			PlannedEntryID: 202,
			CategoryID:     categoryID,
			Description:    "Netflix BR", // Good match
			Amount:         decimal.NewFromFloat(46.00),
		},
	}

	matches := FindMatches(tx, patterns)

	// Should return matches sorted by score
	assert.NotEmpty(t, matches)

	// First match should be the perfect match (pattern 200)
	assert.Equal(t, 200, matches[0].PatternID)
	assert.Greater(t, matches[0].TotalScore, 0.8)

	// Scores should be in descending order
	for i := 1; i < len(matches); i++ {
		assert.GreaterOrEqual(t, matches[i-1].TotalScore, matches[i].TotalScore,
			"Matches should be sorted by score (highest first)")
	}
}

func TestFindMatches_FiltersByMinimumScore(t *testing.T) {
	categoryID := 5

	tx := &TransactionModel{
		TransactionID: 100,
		Description:   "Netflix Subscription",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	patterns := []*PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription",
			Amount:         decimal.NewFromFloat(45.90),
		},
		{
			PlannedEntryID: 201,
			CategoryID:     categoryID,
			Description:    "Completely Different Description",
			Amount:         decimal.NewFromFloat(999.99),
		},
	}

	matches := FindMatches(tx, patterns)

	// Should only include matches above minimum score (0.50)
	for _, match := range matches {
		assert.GreaterOrEqual(t, match.TotalScore, MatchMinScore,
			"All matches should be above minimum score threshold")
	}
}

func TestFindMatches_CategoryMismatchEarlyExit(t *testing.T) {
	categoryID := 5
	differentCategory := 6

	tx := &TransactionModel{
		TransactionID: 100,
		Description:   "Netflix",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	patterns := []*PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     differentCategory, // Different category
			Description:    "Netflix",
			Amount:         decimal.NewFromFloat(45.90),
		},
	}

	matches := FindMatches(tx, patterns)

	// Should not return any matches due to category mismatch
	assert.Empty(t, matches)
}

func TestFindMatches_AmountDifferenceOptimization(t *testing.T) {
	categoryID := 5

	tx := &TransactionModel{
		TransactionID: 100,
		Description:   "Netflix",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	patterns := []*PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription",
			Amount:         decimal.NewFromFloat(150.00), // >50% difference
		},
	}

	matches := FindMatches(tx, patterns)

	// Should skip patterns with >50% amount difference
	assert.Empty(t, matches)
}

// =============================================================================
// Test MatchScore.MatchConfidence
// =============================================================================

func TestMatchConfidence(t *testing.T) {
	tests := []struct {
		name       string
		totalScore float64
		expected   string
	}{
		{
			name:       "High confidence",
			totalScore: 0.85,
			expected:   "HIGH",
		},
		{
			name:       "High threshold exactly",
			totalScore: MatchConfidenceHigh,
			expected:   "HIGH",
		},
		{
			name:       "Medium confidence",
			totalScore: 0.60,
			expected:   "MEDIUM",
		},
		{
			name:       "Medium threshold exactly",
			totalScore: MatchConfidenceMedium,
			expected:   "MEDIUM",
		},
		{
			name:       "Low confidence",
			totalScore: 0.40,
			expected:   "LOW",
		},
		{
			name:       "Zero score",
			totalScore: 0.0,
			expected:   "LOW",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := &MatchScore{TotalScore: tt.totalScore}
			result := score.MatchConfidence()
			assert.Equal(t, tt.expected, result)
		})
	}
}
