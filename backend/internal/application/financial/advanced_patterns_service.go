package financial

import (
	"context"
	"fmt"
	"regexp"
	"strconv"

	"github.com/shopspring/decimal"
)

// ============================================================================
// Input/Output Structures
// ============================================================================

type CreateAdvancedPatternInput struct {
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

type GetAdvancedPatternsInput struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
	CategoryID     *int
}

type GetAdvancedPatternByIDInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

type UpdateAdvancedPatternInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
	IsActive       *bool
}

type DeleteAdvancedPatternInput struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

type ApplyAdvancedPatternOutput struct {
	MatchedCount  int
	UpdatedCount  int
	TransactionIDs []int
}

// ============================================================================
// Service Implementation
// ============================================================================

func (s *service) CreateAdvancedPattern(ctx context.Context, input CreateAdvancedPatternInput) (AdvancedPattern, error) {
	// Validate regex patterns
	if input.DescriptionPattern == "" {
		return AdvancedPattern{}, fmt.Errorf("description_pattern is required")
	}

	// Test description pattern is valid regex
	if _, err := regexp.Compile(input.DescriptionPattern); err != nil {
		return AdvancedPattern{}, fmt.Errorf("invalid description_pattern regex: %w", err)
	}

	// Test date pattern if provided
	if input.DatePattern != nil && *input.DatePattern != "" {
		if _, err := regexp.Compile(*input.DatePattern); err != nil {
			return AdvancedPattern{}, fmt.Errorf("invalid date_pattern regex: %w", err)
		}
	}

	// Test weekday pattern if provided
	if input.WeekdayPattern != nil && *input.WeekdayPattern != "" {
		if _, err := regexp.Compile(*input.WeekdayPattern); err != nil {
			return AdvancedPattern{}, fmt.Errorf("invalid weekday_pattern regex: %w", err)
		}
	}

	// Validate amount range
	if (input.AmountMin != nil && input.AmountMax == nil) || (input.AmountMin == nil && input.AmountMax != nil) {
		return AdvancedPattern{}, fmt.Errorf("amount_min and amount_max must both be provided or both be null")
	}

	if input.AmountMin != nil && input.AmountMax != nil && *input.AmountMin > *input.AmountMax {
		return AdvancedPattern{}, fmt.Errorf("amount_min must be less than or equal to amount_max")
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
		return AdvancedPattern{}, fmt.Errorf("failed to create advanced pattern: %w", err)
	}

	pattern := AdvancedPattern{}.FromModel(&patternModel)

	// If apply_retroactively is true, apply the pattern to existing transactions
	if input.ApplyRetroactively {
		go s.applyPatternRetroactively(context.Background(), pattern)
	}

	return pattern, nil
}

func (s *service) GetAdvancedPatterns(ctx context.Context, input GetAdvancedPatternsInput) ([]AdvancedPattern, error) {
	patterns, err := s.Repository.FetchAdvancedPatterns(ctx, fetchAdvancedPatternsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsActive:       input.IsActive,
		CategoryID:     input.CategoryID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch advanced patterns: %w", err)
	}

	return AdvancedPatterns{}.FromModel(patterns), nil
}

func (s *service) GetAdvancedPatternByID(ctx context.Context, input GetAdvancedPatternByIDInput) (AdvancedPattern, error) {
	pattern, err := s.Repository.FetchAdvancedPatternByID(ctx, fetchAdvancedPatternByIDParams{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return AdvancedPattern{}, fmt.Errorf("failed to fetch advanced pattern: %w", err)
	}

	return AdvancedPattern{}.FromModel(&pattern), nil
}

func (s *service) UpdateAdvancedPattern(ctx context.Context, input UpdateAdvancedPatternInput) (AdvancedPattern, error) {
	pattern, err := s.Repository.ModifyAdvancedPattern(ctx, modifyAdvancedPatternParams{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsActive:       input.IsActive,
	})
	if err != nil {
		return AdvancedPattern{}, fmt.Errorf("failed to update advanced pattern: %w", err)
	}

	return AdvancedPattern{}.FromModel(&pattern), nil
}

func (s *service) DeleteAdvancedPattern(ctx context.Context, input DeleteAdvancedPatternInput) error {
	err := s.Repository.RemoveAdvancedPattern(ctx, removeAdvancedPatternParams{
		PatternID:      input.PatternID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete advanced pattern: %w", err)
	}

	return nil
}

// ============================================================================
// Helper Functions
// ============================================================================

// applyPatternRetroactively applies a pattern to all existing transactions that match
// This runs in a goroutine to avoid blocking the API response
func (s *service) applyPatternRetroactively(ctx context.Context, pattern AdvancedPattern) {
	// Get all transactions for this user/organization
	// Note: We'd need to add a method to fetch all transactions without account filter
	// For now, we'll skip this implementation and just log
	s.logger.Info(ctx, fmt.Sprintf("Retroactive application of pattern %d would run here", pattern.PatternID))

	// TODO: Implement retroactive application
	// 1. Fetch all transactions for user/organization
	// 2. For each transaction, test if it matches the pattern
	// 3. If match, update transaction's description and category
	// 4. Log results
}

// matchesAdvancedPattern checks if a transaction matches an advanced pattern
func (s *service) matchesAdvancedPattern(ctx context.Context, tx *TransactionModel, pattern *AdvancedPatternModel) bool {
	// 1. Check description pattern (required)
	if pattern.DescriptionPattern != nil {
		descRegex, err := regexp.Compile(*pattern.DescriptionPattern)
		if err != nil {
			s.logger.Error(ctx, fmt.Sprintf("Invalid description pattern regex: %v", err))
			return false
		}
		if !descRegex.MatchString(tx.Description) {
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

// applyAdvancedPatternToTransaction applies a pattern's target description and category to a transaction
func (s *service) applyAdvancedPatternToTransaction(ctx context.Context, tx *TransactionModel, pattern *AdvancedPatternModel) error {
	// Update transaction with pattern's target
	description := pattern.TargetDescription
	categoryID := pattern.TargetCategoryID

	_, err := s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
		TransactionID: tx.TransactionID,
		Description:   &description,
		CategoryID:    &categoryID,
	})

	return err
}
