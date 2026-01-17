package financial

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"time"

	"github.com/shopspring/decimal"
)

// ============================================================================
// Input/Output Structures
// ============================================================================

type CreatePatternInput struct {
	UserID             int
	OrganizationID     int
	DescriptionPattern string
	DatePattern        *string
	WeekdayPattern     *string
	AmountMin          *float64
	AmountMax          *float64
	TargetDescription  string
	TargetCategoryID   int
	ApplyRetroactively bool
}

type GetPatternsInput struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
	CategoryID     *int
}

type GetPatternByIDInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

type UpdatePatternInput struct {
	PatternID          int
	UserID             int
	OrganizationID     int
	IsActive           *bool
	DescriptionPattern *string
	DatePattern        *string
	WeekdayPattern     *string
	AmountMin          *string
	AmountMax          *string
	TargetDescription  *string
	TargetCategoryID   *int
}

type DeletePatternInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

type ApplyPatternOutput struct {
	MatchedCount   int
	UpdatedCount   int
	TransactionIDs []int
}

// ============================================================================
// Service Implementation
// ============================================================================

func (s *service) CreatePattern(ctx context.Context, input CreatePatternInput) (Pattern, error) {
	// Validate regex patterns
	if input.DescriptionPattern == "" {
		return Pattern{}, fmt.Errorf("description_pattern is required")
	}

	// Test description pattern is valid regex
	if _, err := regexp.Compile(input.DescriptionPattern); err != nil {
		return Pattern{}, fmt.Errorf("invalid description_pattern regex: %w", err)
	}

	// Test date pattern if provided
	if input.DatePattern != nil && *input.DatePattern != "" {
		if _, err := regexp.Compile(*input.DatePattern); err != nil {
			return Pattern{}, fmt.Errorf("invalid date_pattern regex: %w", err)
		}
	}

	// Test weekday pattern if provided
	if input.WeekdayPattern != nil && *input.WeekdayPattern != "" {
		if _, err := regexp.Compile(*input.WeekdayPattern); err != nil {
			return Pattern{}, fmt.Errorf("invalid weekday_pattern regex: %w", err)
		}
	}

	// Validate amount range
	if (input.AmountMin != nil && input.AmountMax == nil) || (input.AmountMin == nil && input.AmountMax != nil) {
		return Pattern{}, fmt.Errorf("amount_min and amount_max must both be provided or both be null")
	}

	if input.AmountMin != nil && input.AmountMax != nil && *input.AmountMin > *input.AmountMax {
		return Pattern{}, fmt.Errorf("amount_min must be less than or equal to amount_max")
	}

	// Convert amount range to decimal
	var amountMin, amountMax *decimal.Decimal
	if input.AmountMin != nil {
		min := decimal.NewFromFloat(*input.AmountMin)
		amountMin = &min
	}
	if input.AmountMax != nil {
		max := decimal.NewFromFloat(*input.AmountMax)
		amountMax = &max
	}

	// Create the pattern
	patternModel, err := s.Repository.InsertAdvancedPattern(ctx, insertAdvancedPatternParams{
		UserID:             input.UserID,
		OrganizationID:     input.OrganizationID,
		DescriptionPattern: &input.DescriptionPattern,
		DatePattern:        input.DatePattern,
		WeekdayPattern:     input.WeekdayPattern,
		AmountMin:          amountMin,
		AmountMax:          amountMax,
		TargetDescription:  input.TargetDescription,
		TargetCategoryID:   input.TargetCategoryID,
		ApplyRetroactively: input.ApplyRetroactively,
	})
	if err != nil {
		return Pattern{}, fmt.Errorf("failed to create pattern: %w", err)
	}

	pattern := Pattern{}.FromModel(&patternModel)

	// If apply_retroactively is true, apply the pattern to existing transactions
	if input.ApplyRetroactively {
		go s.applyPatternRetroactively(context.Background(), pattern, input.UserID, input.OrganizationID)
	}

	return pattern, nil
}

func (s *service) GetPatterns(ctx context.Context, input GetPatternsInput) ([]Pattern, error) {
	patterns, err := s.Repository.FetchAdvancedPatterns(ctx, fetchAdvancedPatternsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsActive:       input.IsActive,
		CategoryID:     input.CategoryID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch patterns: %w", err)
	}

	result := Patterns{}.FromModel(patterns)

	// Fetch linked planned entries for all patterns
	if len(patterns) > 0 {
		patternIDs := make([]int, len(patterns))
		for i, p := range patterns {
			patternIDs[i] = p.PatternID
		}

		linkedEntries, err := s.Repository.FetchPlannedEntriesByPatternIDs(ctx, fetchPlannedEntriesByPatternIDsParams{
			PatternIDs:     patternIDs,
			UserID:         input.UserID,
			OrganizationID: input.OrganizationID,
		})
		if err != nil {
			// Log warning but don't fail the request
			// The patterns are still useful without linked entries
		} else {
			// Group linked entries by pattern ID
			entriesByPattern := make(map[int][]LinkedPlannedEntrySummary)
			for _, entry := range linkedEntries {
				entriesByPattern[entry.PatternID] = append(entriesByPattern[entry.PatternID], LinkedPlannedEntrySummary{
					PlannedEntryID: entry.PlannedEntryID,
					Name:           entry.Description,
				})
			}

			// Attach to each pattern
			for i := range result {
				if entries, ok := entriesByPattern[result[i].PatternID]; ok {
					result[i].LinkedPlannedEntries = entries
				}
			}
		}
	}

	return result, nil
}

func (s *service) GetPatternByID(ctx context.Context, input GetPatternByIDInput) (Pattern, error) {
	pattern, err := s.Repository.FetchAdvancedPatternByID(ctx, fetchAdvancedPatternByIDParams{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return Pattern{}, fmt.Errorf("failed to fetch pattern: %w", err)
	}

	return Pattern{}.FromModel(&pattern), nil
}

func (s *service) UpdatePattern(ctx context.Context, input UpdatePatternInput) (Pattern, error) {
	pattern, err := s.Repository.ModifyAdvancedPattern(ctx, modifyAdvancedPatternParams{
		PatternID:          input.PatternID,
		UserID:             input.UserID,
		OrganizationID:     input.OrganizationID,
		IsActive:           input.IsActive,
		DescriptionPattern: input.DescriptionPattern,
		DatePattern:        input.DatePattern,
		WeekdayPattern:     input.WeekdayPattern,
		AmountMin:          input.AmountMin,
		AmountMax:          input.AmountMax,
		TargetDescription:  input.TargetDescription,
		TargetCategoryID:   input.TargetCategoryID,
	})
	if err != nil {
		return Pattern{}, fmt.Errorf("failed to update pattern: %w", err)
	}

	return Pattern{}.FromModel(&pattern), nil
}

func (s *service) DeletePattern(ctx context.Context, input DeletePatternInput) error {
	err := s.Repository.RemoveAdvancedPattern(ctx, removeAdvancedPatternParams{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete pattern: %w", err)
	}

	return nil
}

// ApplyPatternRetroactivelyInput contains parameters for applying a pattern to existing transactions
type ApplyPatternRetroactivelyInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

// ApplyPatternRetroactivelyOutput contains the result of retroactive pattern application
type ApplyPatternRetroactivelyOutput struct {
	UpdatedCount int
	TotalChecked int
}

// ApplyPatternRetroactivelySync applies a pattern to all existing transactions (including already categorized ones)
// This is a synchronous version that returns the count of updated transactions
func (s *service) ApplyPatternRetroactivelySync(ctx context.Context, input ApplyPatternRetroactivelyInput) (ApplyPatternRetroactivelyOutput, error) {
	// 1. Fetch the pattern
	pattern, err := s.GetPatternByID(ctx, GetPatternByIDInput{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return ApplyPatternRetroactivelyOutput{}, fmt.Errorf("failed to fetch pattern: %w", err)
	}

	// 2. Fetch all transactions (including already categorized ones)
	transactions, err := s.Repository.FetchTransactionsForPatternMatching(ctx, fetchTransactionsForPatternMatchingParams{
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return ApplyPatternRetroactivelyOutput{}, fmt.Errorf("failed to fetch transactions: %w", err)
	}

	// Convert pattern to model for matching
	patternModel := &PatternModel{
		PatternID:          pattern.PatternID,
		DescriptionPattern: pattern.DescriptionPattern, // Already *string
		DatePattern:        pattern.DatePattern,
		WeekdayPattern:     pattern.WeekdayPattern,
		AmountMin:          pattern.AmountMin,
		AmountMax:          pattern.AmountMax,
		TargetDescription:  pattern.TargetDescription,
		TargetCategoryID:   pattern.TargetCategoryID,
	}

	// 3. Apply pattern to matching transactions
	matchedCount := 0
	for i := range transactions {
		tx := &transactions[i]
		if s.matchesPattern(ctx, tx, patternModel) {
			err := s.applyPatternToTransaction(ctx, tx, patternModel, input.UserID, input.OrganizationID)
			if err != nil {
				s.logger.Warn(ctx, fmt.Sprintf("Failed to apply pattern to transaction %d: %v", tx.TransactionID, err))
				continue
			}
			matchedCount++
		}
	}

	s.logger.Info(ctx, fmt.Sprintf("Retroactive application completed: pattern %d applied to %d/%d transactions",
		pattern.PatternID, matchedCount, len(transactions)))

	return ApplyPatternRetroactivelyOutput{
		UpdatedCount: matchedCount,
		TotalChecked: len(transactions),
	}, nil
}

// ============================================================================
// Helper Functions
// ============================================================================

// applyPatternRetroactively applies a pattern to all existing transactions that match (including already categorized ones)
// This runs in a goroutine to avoid blocking the API response
func (s *service) applyPatternRetroactively(ctx context.Context, pattern Pattern, userID, organizationID int) {
	s.logger.Info(ctx, fmt.Sprintf("Starting retroactive application of pattern %d", pattern.PatternID))

	// 1. Fetch all transactions for organization (including already categorized ones)
	transactions, err := s.Repository.FetchTransactionsForPatternMatching(ctx, fetchTransactionsForPatternMatchingParams{
		OrganizationID: organizationID,
	})
	if err != nil {
		s.logger.Error(ctx, fmt.Sprintf("Failed to fetch transactions for pattern matching: %v", err))
		return
	}

	// Convert pattern to model for matching
	patternModel := &PatternModel{
		PatternID:          pattern.PatternID,
		DescriptionPattern: pattern.DescriptionPattern, // Already *string
		DatePattern:        pattern.DatePattern,
		WeekdayPattern:     pattern.WeekdayPattern,
		AmountMin:          pattern.AmountMin,
		AmountMax:          pattern.AmountMax,
		TargetDescription:  pattern.TargetDescription,
		TargetCategoryID:   pattern.TargetCategoryID,
	}

	// 2. Apply pattern to matching transactions
	matchedCount := 0
	for i := range transactions {
		tx := &transactions[i]
		if s.matchesPattern(ctx, tx, patternModel) {
			err := s.applyPatternToTransaction(ctx, tx, patternModel, userID, organizationID)
			if err != nil {
				s.logger.Warn(ctx, fmt.Sprintf("Failed to apply pattern to transaction %d: %v", tx.TransactionID, err))
				continue
			}
			matchedCount++
		}
	}

	s.logger.Info(ctx, fmt.Sprintf("Retroactive application completed: pattern %d applied to %d/%d transactions",
		pattern.PatternID, matchedCount, len(transactions)))
}

// matchesPattern checks if a transaction matches an advanced pattern
// Note: Uses original_description for regex matching (not user-edited description)
func (s *service) matchesPattern(ctx context.Context, tx *TransactionModel, pattern *PatternModel) bool {
	// 1. Check description pattern (required) - uses original_description for consistent matching
	if pattern.DescriptionPattern != nil {
		descRegex, err := regexp.Compile(*pattern.DescriptionPattern)
		if err != nil {
			s.logger.Error(ctx, fmt.Sprintf("Invalid description pattern regex: %v", err))
			return false
		}
		// Use original_description if available, fallback to description for older transactions
		descToMatch := tx.Description
		if tx.OriginalDescription != nil && *tx.OriginalDescription != "" {
			descToMatch = *tx.OriginalDescription
		}
		if !descRegex.MatchString(descToMatch) {
			return false
		}
	}

	// 2. Check date pattern (optional)
	if pattern.DatePattern != nil && *pattern.DatePattern != "" {
		dateStr := tx.TransactionDate.Format("2006-01-02")
		dateRegex, err := regexp.Compile(*pattern.DatePattern)
		if err != nil {
			s.logger.Error(ctx, fmt.Sprintf("Invalid date pattern regex: %v", err))
			return false
		}
		if !dateRegex.MatchString(dateStr) {
			return false
		}
	}

	// 3. Check weekday pattern (optional)
	// Weekday: 0=Sunday, 1=Monday, ..., 6=Saturday
	if pattern.WeekdayPattern != nil && *pattern.WeekdayPattern != "" {
		weekday := int(tx.TransactionDate.Weekday())
		weekdayStr := strconv.Itoa(weekday)
		weekdayRegex, err := regexp.Compile(*pattern.WeekdayPattern)
		if err != nil {
			s.logger.Error(ctx, fmt.Sprintf("Invalid weekday pattern regex: %v", err))
			return false
		}
		if !weekdayRegex.MatchString(weekdayStr) {
			return false
		}
	}

	// 4. Check amount range (optional)
	if pattern.AmountMin != nil && pattern.AmountMax != nil {
		// Get absolute value for comparison (we compare amounts regardless of debit/credit)
		absAmount := tx.Amount
		if absAmount.LessThan(decimal.Zero) {
			absAmount = absAmount.Neg()
		}

		if absAmount.LessThan(*pattern.AmountMin) || absAmount.GreaterThan(*pattern.AmountMax) {
			return false
		}
	}

	return true
}

// applyPatternToTransaction applies a pattern's target description and category to a transaction
// It also checks if any planned entry is linked to this pattern and updates its status to "matched"
// If a planned entry is linked, its description takes precedence over the pattern's description
func (s *service) applyPatternToTransaction(ctx context.Context, tx *TransactionModel, pattern *PatternModel, userID, organizationID int) error {
	// Start with pattern's target values
	description := pattern.TargetDescription
	categoryID := pattern.TargetCategoryID

	// Check if any planned entry is linked to this pattern FIRST
	// If linked, use the planned entry's description instead of pattern's
	linkedEntries, err := s.Repository.FetchPlannedEntriesByPatternIDs(ctx, fetchPlannedEntriesByPatternIDsParams{
		PatternIDs:     []int{pattern.PatternID},
		UserID:         userID,
		OrganizationID: organizationID,
	})
	if err != nil {
		// Log warning but continue with pattern's values
		s.logger.Warn(ctx, "Failed to fetch linked planned entries for pattern",
			"pattern_id", pattern.PatternID,
			"error", err.Error(),
		)
	}

	// If there are linked entries, use the first one's description
	// This makes the planned entry the "source of truth" for the description
	if len(linkedEntries) > 0 {
		description = linkedEntries[0].Description
		s.logger.Info(ctx, "Using planned entry description instead of pattern's",
			"pattern_id", pattern.PatternID,
			"planned_entry_id", linkedEntries[0].PlannedEntryID,
			"description", description,
		)
	}

	// Update transaction with the determined values
	_, err = s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
		TransactionID:  tx.TransactionID,
		UserID:         userID,
		OrganizationID: organizationID,
		Description:    &description,
		CategoryID:     &categoryID,
	})
	if err != nil {
		return err
	}

	// If any planned entry is linked, update its status to "matched" for the transaction's month/year
	if len(linkedEntries) > 0 {
		month := int(tx.TransactionDate.Month())
		year := tx.TransactionDate.Year()
		matchedAt := s.system.Time.Now().Format(time.RFC3339)

		// Inherit savings goal from the first linked entry that has one (if transaction doesn't have a goal)
		// "Manual wins" - don't override if transaction already has a manually-set goal
		if tx.SavingsGoalID == nil {
			for _, entry := range linkedEntries {
				if entry.SavingsGoalID != nil {
					_, err := s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
						TransactionID:  tx.TransactionID,
						UserID:         userID,
						OrganizationID: organizationID,
						SavingsGoalID:  entry.SavingsGoalID,
					})
					if err != nil {
						s.logger.Warn(ctx, "Failed to inherit savings goal from planned entry",
							"transaction_id", tx.TransactionID,
							"planned_entry_id", entry.PlannedEntryID,
							"savings_goal_id", *entry.SavingsGoalID,
							"error", err.Error(),
						)
					} else {
						s.logger.Info(ctx, "Inherited savings goal from planned entry",
							"transaction_id", tx.TransactionID,
							"planned_entry_id", entry.PlannedEntryID,
							"savings_goal_id", *entry.SavingsGoalID,
						)
					}
					break // Only inherit from the first entry with a goal
				}
			}
		}

		for _, entry := range linkedEntries {
			// Create/update the planned entry status
			statusModel, err := s.Repository.UpsertPlannedEntryStatus(ctx, upsertPlannedEntryStatusParams{
				PlannedEntryID: entry.PlannedEntryID,
				Month:          month,
				Year:           year,
				Status:         PlannedEntryStatusMatched,
			})
			if err != nil {
				s.logger.Warn(ctx, "Failed to upsert planned entry status",
					"planned_entry_id", entry.PlannedEntryID,
					"error", err.Error(),
				)
				continue
			}

			// Update with transaction details
			_, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
				StatusID:             statusModel.StatusID,
				MatchedTransactionID: &tx.TransactionID,
				MatchedAmount:        &tx.Amount,
				MatchedAt:            &matchedAt,
			})
			if err != nil {
				s.logger.Warn(ctx, "Failed to update planned entry status with match details",
					"status_id", statusModel.StatusID,
					"error", err.Error(),
				)
			}

			s.logger.Info(ctx, "Auto-matched planned entry via advanced pattern",
				"planned_entry_id", entry.PlannedEntryID,
				"pattern_id", pattern.PatternID,
				"transaction_id", tx.TransactionID,
				"month", month,
				"year", year,
			)
		}
	}

	return nil
}

// ApplyPatternsToTransactionInput contains parameters for applying patterns to a transaction.
type ApplyPatternsToTransactionInput struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

// AutoApplyPatterns evaluates all active patterns against a transaction and applies the first match.
//
// It exists so OFX import and any other ingestion path can share the exact same behavior.
func (s *service) AutoApplyPatterns(ctx context.Context, input ApplyPatternsToTransactionInput) (bool, error) {
	// 1. Fetch the transaction
	tx, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
		TransactionID:  input.TransactionID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return false, fmt.Errorf("failed to fetch transaction: %w", err)
	}

	// 2. Fetch all active patterns
	isActive := true
	patterns, err := s.Repository.FetchAdvancedPatterns(ctx, fetchAdvancedPatternsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsActive:       &isActive,
	})
	if err != nil {
		return false, fmt.Errorf("failed to fetch patterns: %w", err)
	}
	if len(patterns) == 0 {
		return false, nil
	}

	// 3. Find and apply the first matching pattern
	for i := range patterns {
		patternModel := &PatternModel{
			PatternID:          patterns[i].PatternID,
			DescriptionPattern: patterns[i].DescriptionPattern,
			DatePattern:        patterns[i].DatePattern,
			WeekdayPattern:     patterns[i].WeekdayPattern,
			AmountMin:          patterns[i].AmountMin,
			AmountMax:          patterns[i].AmountMax,
			TargetDescription:  patterns[i].TargetDescription,
			TargetCategoryID:   patterns[i].TargetCategoryID,
		}

		if s.matchesPattern(ctx, &tx, patternModel) {
			err := s.applyPatternToTransaction(ctx, &tx, patternModel, input.UserID, input.OrganizationID)
			if err != nil {
				s.logger.Warn(ctx, fmt.Sprintf("Failed to apply pattern %d to transaction %d: %v",
					patterns[i].PatternID, tx.TransactionID, err))
				continue
			}
			s.logger.Info(ctx, fmt.Sprintf("Applied pattern %d to transaction %d",
				patterns[i].PatternID, tx.TransactionID))
			return true, nil
		}
	}

	return false, nil
}

// ApplyPatternsToTransaction is kept for backward compatibility within the application layer.
// Prefer AutoApplyPatterns for new call-sites.
func (s *service) ApplyPatternsToTransaction(ctx context.Context, input ApplyPatternsToTransactionInput) (bool, error) {
	return s.AutoApplyPatterns(ctx, input)
}
