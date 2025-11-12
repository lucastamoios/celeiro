package financial

import (
	"fmt"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// =============================================================================
// Performance Tests for Matching Algorithm
// =============================================================================

// generateTestPatterns creates N test patterns with varying similarity
func generateTestPatterns(n int, categoryID int) []*PlannedEntryModel {
	patterns := make([]*PlannedEntryModel, n)

	descriptions := []string{
		"Netflix Subscription",
		"Amazon Prime Video",
		"Spotify Premium",
		"Apple Music",
		"Disney Plus",
		"HBO Max",
		"YouTube Premium",
		"Paramount Plus",
		"Peacock Premium",
		"Hulu Subscription",
	}

	baseAmounts := []float64{
		45.90, 14.90, 19.90, 10.90, 27.90,
		39.90, 22.90, 9.90, 5.90, 12.90,
	}

	for i := 0; i < n; i++ {
		desc := descriptions[i%len(descriptions)]
		amount := baseAmounts[i%len(baseAmounts)]

		// Add variation to make patterns unique
		if i >= len(descriptions) {
			desc = fmt.Sprintf("%s - Variant %d", desc, i/len(descriptions))
		}

		expectedDay := (i % 28) + 1

		patterns[i] = &PlannedEntryModel{
			PlannedEntryID: 1000 + i,
			CategoryID:     categoryID,
			Description:    desc,
			Amount:         decimal.NewFromFloat(amount),
			ExpectedDay:    &expectedDay,
			IsSavedPattern: true,
		}
	}

	return patterns
}

// TestFindMatches_Performance100Patterns tests matching with 100 patterns
func TestFindMatches_Performance100Patterns(t *testing.T) {
	categoryID := 5
	patterns := generateTestPatterns(100, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	// Measure execution time
	start := time.Now()
	matches := FindMatches(tx, patterns)
	elapsed := time.Since(start)

	// Performance assertions
	assert.Less(t, elapsed.Milliseconds(), int64(100),
		"Finding matches in 100 patterns should take < 100ms, took %v", elapsed)

	// Correctness assertions
	assert.NotEmpty(t, matches, "Should find at least one match")
	assert.Equal(t, 1000, matches[0].PatternID, "First pattern should be the best match")
	assert.Greater(t, matches[0].TotalScore, 0.9, "Best match should have high score")

	t.Logf("Matched %d patterns in %v (%.2f matches/ms)",
		len(matches), elapsed, float64(len(matches))/float64(elapsed.Milliseconds()))
}

// TestFindMatches_Performance500Patterns tests matching with 500 patterns
func TestFindMatches_Performance500Patterns(t *testing.T) {
	categoryID := 5
	patterns := generateTestPatterns(500, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	// Measure execution time
	start := time.Now()
	matches := FindMatches(tx, patterns)
	elapsed := time.Since(start)

	// Performance assertions
	assert.Less(t, elapsed.Milliseconds(), int64(500),
		"Finding matches in 500 patterns should take < 500ms, took %v", elapsed)

	// Correctness assertions
	assert.NotEmpty(t, matches, "Should find at least one match")

	t.Logf("Matched %d patterns in %v (%.2f ms/pattern)",
		len(matches), elapsed, float64(elapsed.Milliseconds())/500.0)
}

// TestFindMatches_CategoryMismatchPerformance tests early exit optimization
func TestFindMatches_CategoryMismatchPerformance(t *testing.T) {
	txCategoryID := 5
	patternCategoryID := 6 // Different category

	patterns := generateTestPatterns(1000, patternCategoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &txCategoryID,
	}

	// Measure execution time
	start := time.Now()
	matches := FindMatches(tx, patterns)
	elapsed := time.Since(start)

	// With category mismatch early exit, this should be very fast
	assert.Less(t, elapsed.Milliseconds(), int64(50),
		"Category mismatch should exit early, took %v", elapsed)

	// Should have no matches
	assert.Empty(t, matches, "Should have no matches due to category mismatch")

	t.Logf("Processed 1000 patterns with category mismatch in %v", elapsed)
}

// TestFindMatches_AmountFilterPerformance tests amount difference optimization
func TestFindMatches_AmountFilterPerformance(t *testing.T) {
	categoryID := 5
	patterns := generateTestPatterns(1000, categoryID)

	// Transaction with very different amount
	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(999.99), // Much larger amount
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	// Measure execution time
	start := time.Now()
	matches := FindMatches(tx, patterns)
	elapsed := time.Since(start)

	// Amount filter should skip most patterns, making this fast
	assert.Less(t, elapsed.Milliseconds(), int64(200),
		"Amount filter should make this fast, took %v", elapsed)

	// Should have very few or no matches
	t.Logf("Found %d matches from 1000 patterns in %v (amount filter optimization)",
		len(matches), elapsed)
}

// TestCalculateMatchScore_Performance tests individual score calculation
func TestCalculateMatchScore_Performance(t *testing.T) {
	categoryID := 5
	expectedDay := 15

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Premium Subscription Monthly BR",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	pattern := &PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		ExpectedDay:    &expectedDay,
	}

	// Run multiple iterations
	iterations := 10000
	start := time.Now()

	for i := 0; i < iterations; i++ {
		score := CalculateMatchScore(tx, pattern)
		_ = score
	}

	elapsed := time.Since(start)
	avgTime := float64(elapsed.Nanoseconds()) / float64(iterations)

	// Each score calculation should be very fast
	assert.Less(t, avgTime, float64(100000), // < 100 microseconds per calculation
		"Average score calculation should be < 100µs, was %.2fµs", avgTime/1000)

	t.Logf("Average score calculation time: %.2fµs (%d iterations in %v)",
		avgTime/1000, iterations, elapsed)
}

// TestFuzzyMatchDescription_Performance tests fuzzy matching performance
func TestFuzzyMatchDescription_Performance(t *testing.T) {
	desc1 := "Netflix Premium Subscription Monthly Payment BR"
	desc2 := "Netflix Subscription"

	iterations := 10000
	start := time.Now()

	for i := 0; i < iterations; i++ {
		score := fuzzyMatchDescription(desc1, desc2)
		_ = score
	}

	elapsed := time.Since(start)
	avgTime := float64(elapsed.Nanoseconds()) / float64(iterations)

	assert.Less(t, avgTime, float64(50000), // < 50 microseconds
		"Fuzzy match should be < 50µs, was %.2fµs", avgTime/1000)

	t.Logf("Average fuzzy match time: %.2fµs (%d iterations in %v)",
		avgTime/1000, iterations, elapsed)
}

// =============================================================================
// Benchmark Tests
// =============================================================================

func BenchmarkFindMatches_10Patterns(b *testing.B) {
	categoryID := 5
	patterns := generateTestPatterns(10, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FindMatches(tx, patterns)
	}
}

func BenchmarkFindMatches_100Patterns(b *testing.B) {
	categoryID := 5
	patterns := generateTestPatterns(100, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FindMatches(tx, patterns)
	}
}

func BenchmarkFindMatches_500Patterns(b *testing.B) {
	categoryID := 5
	patterns := generateTestPatterns(500, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FindMatches(tx, patterns)
	}
}

func BenchmarkFindMatches_1000Patterns(b *testing.B) {
	categoryID := 5
	patterns := generateTestPatterns(1000, categoryID)

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		FindMatches(tx, patterns)
	}
}

func BenchmarkCalculateMatchScore(b *testing.B) {
	categoryID := 5
	expectedDay := 15

	tx := &TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	pattern := &PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		ExpectedDay:    &expectedDay,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		CalculateMatchScore(tx, pattern)
	}
}

func BenchmarkFuzzyMatchDescription(b *testing.B) {
	desc1 := "Netflix Premium Subscription Monthly"
	desc2 := "Netflix Subscription"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		fuzzyMatchDescription(desc1, desc2)
	}
}

func BenchmarkLevenshteinDistance(b *testing.B) {
	s1 := "Netflix Premium Subscription"
	s2 := "Netflix Subscription"

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		levenshteinDistance(s1, s2)
	}
}
