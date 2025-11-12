package financial

import (
	"context"
	"fmt"
)

// SaveTransactionAsPatternInput contains parameters for saving a transaction as a reusable pattern
type SaveTransactionAsPatternInput struct {
	UserID         int
	OrganizationID int
	TransactionID  int
	IsRecurrent    bool // Whether to also save as a recurrent entry
	ExpectedDay    *int // Optional: expected day of month for recurrent entries
}

// SaveTransactionAsPattern creates a saved pattern from an existing transaction
// This allows users to reuse common transaction categorizations
func (s *service) SaveTransactionAsPattern(ctx context.Context, input SaveTransactionAsPatternInput) (PlannedEntry, error) {
	// 1. Fetch the transaction to get its details
	tx, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
		TransactionID:  input.TransactionID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return PlannedEntry{}, fmt.Errorf("failed to fetch transaction: %w", err)
	}

	// 2. Validate transaction has a category
	if tx.CategoryID == nil {
		return PlannedEntry{}, fmt.Errorf("transaction must be categorized before saving as pattern")
	}

	// 3. Create planned entry with is_saved_pattern = true
	entry, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		CategoryID:     *tx.CategoryID,
		Description:    tx.Description,
		Amount:         tx.Amount,
		IsRecurrent:    input.IsRecurrent,
		ParentEntryID:  nil, // Patterns are top-level entries
		ExpectedDay:    input.ExpectedDay,
		IsSavedPattern: true, // Mark as pattern
	})
	if err != nil {
		return PlannedEntry{}, fmt.Errorf("failed to create pattern: %w", err)
	}

	return PlannedEntry{}.FromModel(&entry), nil
}

// GetMatchSuggestionsInput contains parameters for finding pattern matches
type GetMatchSuggestionsInput struct {
	UserID         int
	OrganizationID int
	TransactionID  int
	CategoryID     *int // Optional: filter patterns by category
}

// MatchSuggestion represents a suggested pattern match for a transaction
type MatchSuggestion struct {
	Pattern    PlannedEntry
	MatchScore *MatchScore
}

// GetMatchSuggestionsForTransaction finds and scores pattern matches for a transaction
// Returns suggestions sorted by score (highest first)
func (s *service) GetMatchSuggestionsForTransaction(ctx context.Context, input GetMatchSuggestionsInput) ([]MatchSuggestion, error) {
	// 1. Fetch the transaction
	tx, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
		TransactionID:  input.TransactionID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch transaction: %w", err)
	}

	// 2. Fetch all saved patterns (optionally filtered by category)
	patterns, err := s.Repository.FetchSavedPatterns(ctx, fetchSavedPatternsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		CategoryID:     input.CategoryID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch patterns: %w", err)
	}

	// 3. Convert to pointers for matching algorithm
	patternPtrs := make([]*PlannedEntryModel, len(patterns))
	for i := range patterns {
		patternPtrs[i] = &patterns[i]
	}

	// 4. Find matches using the matching algorithm
	matchScores := FindMatches(&tx, patternPtrs)

	// 5. Convert to suggestions with full pattern details
	suggestions := make([]MatchSuggestion, 0, len(matchScores))
	for _, score := range matchScores {
		// Find the original pattern model
		var patternModel *PlannedEntryModel
		for i := range patterns {
			if patterns[i].PlannedEntryID == score.PatternID {
				patternModel = &patterns[i]
				break
			}
		}

		if patternModel != nil {
			suggestions = append(suggestions, MatchSuggestion{
				Pattern:    PlannedEntry{}.FromModel(patternModel),
				MatchScore: score,
			})
		}
	}

	return suggestions, nil
}

// ApplyPatternToTransactionInput contains parameters for applying a pattern to a transaction
type ApplyPatternToTransactionInput struct {
	UserID         int
	OrganizationID int
	TransactionID  int
	PatternID      int
}

// ApplyPatternToTransaction updates a transaction's category based on a pattern match
// This is typically called after user confirms a suggested match
func (s *service) ApplyPatternToTransaction(ctx context.Context, input ApplyPatternToTransactionInput) (Transaction, error) {
	// 1. Fetch the pattern to get its category
	pattern, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return Transaction{}, fmt.Errorf("failed to fetch pattern: %w", err)
	}

	// 2. Validate it's actually a saved pattern
	if !pattern.IsSavedPattern {
		return Transaction{}, fmt.Errorf("entry %d is not a saved pattern", input.PatternID)
	}

	// 3. Update the transaction's category
	tx, err := s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
		TransactionID:  input.TransactionID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		CategoryID:     &pattern.CategoryID,
		Description:    nil, // Don't modify description
		Amount:         nil, // Don't modify amount
	})
	if err != nil {
		return Transaction{}, fmt.Errorf("failed to update transaction: %w", err)
	}

	return Transaction{}.FromModel(&tx), nil
}

// AutoMatchTransactionInput contains parameters for automatic pattern matching
type AutoMatchTransactionInput struct {
	UserID         int
	OrganizationID int
	TransactionID  int
}

// AutoMatchTransaction automatically applies high-confidence pattern matches
// Returns true if a match was applied, false if no high-confidence match found
func (s *service) AutoMatchTransaction(ctx context.Context, input AutoMatchTransactionInput) (bool, error) {
	// Start metrics tracking
	matchStart := s.system.Time.Now()
	if s.metrics != nil && s.metrics.AutoMatchAttempts != nil {
		s.metrics.AutoMatchAttempts.Add(ctx, 1)
	}

	// 1. Get match suggestions
	suggestions, err := s.GetMatchSuggestionsForTransaction(ctx, GetMatchSuggestionsInput{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		TransactionID:  input.TransactionID,
		CategoryID:     nil, // Search all patterns
	})
	if err != nil {
		return false, fmt.Errorf("failed to get match suggestions: %w", err)
	}

	// 2. Check if there's a high-confidence match
	if len(suggestions) == 0 {
		// Record duration even for no-match cases
		if s.metrics != nil && s.metrics.AutoMatchDuration != nil {
			duration := s.system.Time.Now().Sub(matchStart).Seconds()
			s.metrics.AutoMatchDuration.Record(ctx, duration)
		}
		return false, nil // No matches found
	}

	topMatch := suggestions[0] // Already sorted by score

	// Record match score
	if s.metrics != nil && s.metrics.MatchScore != nil {
		s.metrics.MatchScore.Record(ctx, topMatch.MatchScore.TotalScore)
	}

	if topMatch.MatchScore.Confidence != "HIGH" {
		// Record duration for low-confidence cases
		if s.metrics != nil && s.metrics.AutoMatchDuration != nil {
			duration := s.system.Time.Now().Sub(matchStart).Seconds()
			s.metrics.AutoMatchDuration.Record(ctx, duration)
		}
		return false, nil // No high-confidence match
	}

	// 3. Auto-apply the high-confidence match
	_, err = s.ApplyPatternToTransaction(ctx, ApplyPatternToTransactionInput{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		TransactionID:  input.TransactionID,
		PatternID:      topMatch.Pattern.PlannedEntryID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to apply pattern: %w", err)
	}

	// Record successful match metrics
	matchDuration := s.system.Time.Now().Sub(matchStart).Seconds()
	if s.metrics != nil {
		if s.metrics.AutoMatchSuccesses != nil {
			s.metrics.AutoMatchSuccesses.Add(ctx, 1)
		}
		if s.metrics.AutoMatchDuration != nil {
			s.metrics.AutoMatchDuration.Record(ctx, matchDuration)
		}
	}

	return true, nil
}
