package financial

import (
	"math"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// levenshteinDistance calculates the Levenshtein distance between two strings
// Returns the minimum number of single-character edits required to change s1 into s2
func levenshteinDistance(s1, s2 string) int {
	// Handle edge cases
	if len(s1) == 0 {
		return len(s2)
	}
	if len(s2) == 0 {
		return len(s1)
	}

	// Convert to runes to handle Unicode properly
	r1 := []rune(s1)
	r2 := []rune(s2)

	// Create 2D matrix for dynamic programming
	// matrix[i][j] represents the distance between s1[0:i] and s2[0:j]
	matrix := make([][]int, len(r1)+1)
	for i := range matrix {
		matrix[i] = make([]int, len(r2)+1)
	}

	// Initialize first row and column
	for i := 0; i <= len(r1); i++ {
		matrix[i][0] = i
	}
	for j := 0; j <= len(r2); j++ {
		matrix[0][j] = j
	}

	// Fill matrix using dynamic programming
	for i := 1; i <= len(r1); i++ {
		for j := 1; j <= len(r2); j++ {
			cost := 1
			if r1[i-1] == r2[j-1] {
				cost = 0
			}

			matrix[i][j] = min(
				matrix[i-1][j]+1,      // deletion
				matrix[i][j-1]+1,      // insertion
				matrix[i-1][j-1]+cost, // substitution
			)
		}
	}

	return matrix[len(r1)][len(r2)]
}

// min returns the minimum of three integers
func min(a, b, c int) int {
	if a < b {
		if a < c {
			return a
		}
		return c
	}
	if b < c {
		return b
	}
	return c
}

// normalizeString prepares a string for fuzzy matching
// Converts to lowercase, trims whitespace, and removes extra spaces
func normalizeString(s string) string {
	s = strings.ToLower(s)
	s = strings.TrimSpace(s)
	// Replace multiple spaces with single space
	s = strings.Join(strings.Fields(s), " ")
	return s
}

// fuzzyMatchDescription calculates similarity between two descriptions
// Returns a score from 0.0 (completely different) to 1.0 (exact match)
func fuzzyMatchDescription(desc1, desc2 string) float64 {
	// Normalize both strings
	norm1 := normalizeString(desc1)
	norm2 := normalizeString(desc2)

	// Quick exact match check
	if norm1 == norm2 {
		return 1.0
	}

	// Handle empty strings
	if norm1 == "" || norm2 == "" {
		return 0.0
	}

	// Calculate Levenshtein distance
	distance := levenshteinDistance(norm1, norm2)

	// Calculate max possible distance (length of longer string)
	maxLen := len(norm1)
	if len(norm2) > maxLen {
		maxLen = len(norm2)
	}

	// Convert distance to similarity score
	// similarity = 1 - (distance / maxLength)
	similarity := 1.0 - (float64(distance) / float64(maxLen))

	// Ensure score is between 0 and 1
	if similarity < 0.0 {
		similarity = 0.0
	}

	return similarity
}

// calculateAmountScore calculates how similar two amounts are
// Returns 1.0 if within tolerance, decreasing score for larger differences
func calculateAmountScore(txAmount, patternAmount decimal.Decimal) float64 {
	// Handle zero amounts
	if txAmount.IsZero() && patternAmount.IsZero() {
		return 1.0
	}
	if txAmount.IsZero() || patternAmount.IsZero() {
		return 0.0
	}

	// Calculate absolute difference
	diff := txAmount.Sub(patternAmount).Abs()

	// Calculate percentage difference based on pattern amount
	percentDiff := diff.Div(patternAmount.Abs()).InexactFloat64()

	// Within tolerance = perfect score
	if percentDiff <= MatchAmountTolerance {
		return 1.0
	}

	// Linear decay: score = 1 - (percentDiff / (tolerance * 4))
	// This gives 0.75 score at 2x tolerance, 0.5 at 3x, 0.25 at 4x, 0.0 at 5x
	score := 1.0 - (percentDiff / (MatchAmountTolerance * 5.0))

	// Clamp to [0, 1]
	if score < 0.0 {
		score = 0.0
	}
	if score > 1.0 {
		score = 1.0
	}

	return score
}

// calculateDateScore calculates how close two dates are
// Returns 1.0 if within proximity days, decreasing for further dates
func calculateDateScore(txDate, patternDate time.Time) float64 {
	// Calculate day difference (absolute value)
	diff := math.Abs(float64(txDate.Sub(patternDate).Hours() / 24))

	// Within proximity = perfect score
	if diff <= float64(MatchDateProximity) {
		return 1.0
	}

	// Linear decay: score = 1 - (dayDiff / (proximity * 10))
	// This gives 0.9 score at 4 days, 0.5 at 15 days, 0.0 at 30 days
	score := 1.0 - (diff / (float64(MatchDateProximity) * 10.0))

	// Clamp to [0, 1]
	if score < 0.0 {
		score = 0.0
	}
	if score > 1.0 {
		score = 1.0
	}

	return score
}

// CalculateMatchScore computes the weighted match score between a transaction and a pattern
func CalculateMatchScore(
	tx *TransactionModel,
	pattern *PlannedEntryModel,
) *MatchScore {
	score := &MatchScore{
		PatternID:   pattern.PlannedEntryID,
		Description: pattern.Description,
		Amount:      pattern.Amount,
		CategoryID:  pattern.CategoryID,
	}

	// 1. Category match (40% weight) - MUST match for any score
	if tx.CategoryID != nil && *tx.CategoryID == pattern.CategoryID {
		score.CategoryScore = 1.0
	} else {
		score.CategoryScore = 0.0
		// Early exit - no point calculating other scores if category doesn't match
		score.TotalScore = 0.0
		score.Confidence = "LOW"
		return score
	}

	// 2. Amount match (30% weight)
	score.AmountScore = calculateAmountScore(tx.Amount, pattern.Amount)

	// 3. Description match (20% weight)
	score.DescriptionScore = fuzzyMatchDescription(tx.Description, pattern.Description)

	// 4. Date match (10% weight) - compare transaction date with expected day if available
	if pattern.ExpectedDay != nil && tx.TransactionDate.Day() == *pattern.ExpectedDay {
		score.DateScore = 1.0
	} else {
		// Use month-day proximity scoring
		// Create a "pattern date" for this month with the expected day
		if pattern.ExpectedDay != nil {
			year := tx.TransactionDate.Year()
			month := tx.TransactionDate.Month()
			day := *pattern.ExpectedDay
			// Handle invalid days (e.g., Feb 31)
			maxDay := time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
			if day > maxDay {
				day = maxDay
			}
			expectedDate := time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
			score.DateScore = calculateDateScore(tx.TransactionDate, expectedDate)
		} else {
			// No expected day, give neutral score
			score.DateScore = 0.5
		}
	}

	// Calculate weighted total score
	score.TotalScore =
		score.CategoryScore*MatchWeightCategory +
			score.AmountScore*MatchWeightAmount +
			score.DescriptionScore*MatchWeightDescription +
			score.DateScore*MatchWeightDate

	// Set confidence level
	score.Confidence = score.MatchConfidence()

	return score
}

// FindMatches searches for pattern matches for a given transaction
// Returns matches sorted by score (highest first), filtered by minimum score
func FindMatches(
	tx *TransactionModel,
	patterns []*PlannedEntryModel,
) []*MatchScore {
	var matches []*MatchScore

	for _, pattern := range patterns {
		// Optimization 1: Early exit on category mismatch
		if tx.CategoryID != nil && *tx.CategoryID != pattern.CategoryID {
			continue
		}

		// Optimization 2: Pre-filter on amount difference
		// If amounts are wildly different (>50%), skip expensive fuzzy matching
		if !pattern.Amount.IsZero() {
			diff := tx.Amount.Sub(pattern.Amount).Abs()
			percentDiff := diff.Div(pattern.Amount.Abs()).InexactFloat64()
			if percentDiff > 0.50 {
				continue // Amount differs by more than 50%, likely not a match
			}
		}

		// Calculate full match score
		score := CalculateMatchScore(tx, pattern)

		// Only include matches above minimum threshold
		if score.TotalScore >= MatchMinScore {
			matches = append(matches, score)
		}
	}

	// Sort matches by score (highest first)
	// Using simple bubble sort for small datasets
	// For production with 1000+ patterns, consider heap or quick sort
	for i := 0; i < len(matches)-1; i++ {
		for j := i + 1; j < len(matches); j++ {
			if matches[j].TotalScore > matches[i].TotalScore {
				matches[i], matches[j] = matches[j], matches[i]
			}
		}
	}

	return matches
}
