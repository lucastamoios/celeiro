package financial

import (
	"context"
	"testing"
	"time"

	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func strPtr(s string) *string { return &s }

func TestPatternsService_MatchesPattern_UsesOriginalDescriptionOverEditedDescription(t *testing.T) {
	logger := &logging.TestLogger{}
	svc := &service{logger: logger}
	ctx := context.Background()

	tx := &TransactionModel{
		Description:         "Uber ride to work",
		OriginalDescription: strPtr("UBER *TRIP ABC123"),
		Amount:              decimal.NewFromFloat(25),
		TransactionDate:     time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC), // Monday
		TransactionType:     "debit",
	}

	pattern := &PatternModel{DescriptionPattern: strPtr("UBER.*TRIP")}
	assert.True(t, svc.matchesPattern(ctx, tx, pattern))

	// If original_description is set but does not match, we must NOT fall back to edited description.
	tx.OriginalDescription = strPtr("SOMETHING ELSE")
	tx.Description = "UBER *TRIP ABC123"
	assert.False(t, svc.matchesPattern(ctx, tx, pattern))
}

func TestPatternsService_MatchesPattern_FallsBackToDescriptionWhenOriginalDescriptionMissing(t *testing.T) {
	logger := &logging.TestLogger{}
	svc := &service{logger: logger}
	ctx := context.Background()

	tx := &TransactionModel{
		Description:         "NETFLIX.COM",
		OriginalDescription: nil,
		Amount:              decimal.NewFromFloat(55),
		TransactionDate:     time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
		TransactionType:     "debit",
	}

	pattern := &PatternModel{DescriptionPattern: strPtr("NETFLIX")}
	assert.True(t, svc.matchesPattern(ctx, tx, pattern))

	// Empty original_description should behave like missing.
	tx.OriginalDescription = strPtr("")
	assert.True(t, svc.matchesPattern(ctx, tx, pattern))
}

func TestPatternsService_MatchesPattern_InvalidDescriptionRegexReturnsFalse(t *testing.T) {
	logger := &logging.TestLogger{}
	svc := &service{logger: logger}
	ctx := context.Background()

	tx := &TransactionModel{
		Description:         "Anything",
		OriginalDescription: strPtr("Anything"),
		Amount:              decimal.NewFromFloat(10),
		TransactionDate:     time.Date(2026, 1, 10, 0, 0, 0, 0, time.UTC),
		TransactionType:     "debit",
	}

	pattern := &PatternModel{DescriptionPattern: strPtr("(")}
	assert.False(t, svc.matchesPattern(ctx, tx, pattern))
}

func TestPatternsService_MatchesPattern_WeekdayAndAmountConstraints(t *testing.T) {
	logger := &logging.TestLogger{}
	svc := &service{logger: logger}
	ctx := context.Background()

	tx := &TransactionModel{
		Description:         "UBER *TRIP ABC123",
		OriginalDescription: strPtr("UBER *TRIP ABC123"),
		Amount:              decimal.NewFromFloat(-50),
		TransactionDate:     time.Date(2026, 1, 5, 0, 0, 0, 0, time.UTC), // Monday
		TransactionType:     "debit",
	}

	amountMin := decimal.NewFromFloat(40)
	amountMax := decimal.NewFromFloat(60)

	pattern := &PatternModel{
		DescriptionPattern: strPtr("UBER.*TRIP"),
		WeekdayPattern:     strPtr("(1|2|3|4|5)"),
		AmountMin:          &amountMin,
		AmountMax:          &amountMax,
	}

	assert.True(t, svc.matchesPattern(ctx, tx, pattern))

	// Out of range should not match
	tx.Amount = decimal.NewFromFloat(-70)
	assert.False(t, svc.matchesPattern(ctx, tx, pattern))
}

func TestPatternsService_ApplyPatternToTransaction_IgnoreOnlyMarksTransactionIgnored(t *testing.T) {
	ctx := context.Background()
	repository := &MockRepository{}
	repository.On("ModifyTransaction", ctx, mock.MatchedBy(func(params modifyTransactionParams) bool {
		return params.TransactionID == 42 &&
			params.OrganizationID == 7 &&
			params.IsIgnored != nil && *params.IsIgnored &&
			params.Description == nil && params.CategoryID == nil
	})).Return(TransactionModel{}, nil).Once()

	svc := &service{Repository: repository, logger: &logging.TestLogger{}}
	tx := &TransactionModel{TransactionID: 42, Description: "PIX PADARIA"}
	pattern := &PatternModel{PatternID: 9, Action: PatternActionIgnore, DescriptionPattern: strPtr("PADARIA")}

	err := svc.applyPatternToTransaction(ctx, tx, pattern, 3, 7)

	assert.NoError(t, err)
	repository.AssertExpectations(t)
	repository.AssertNotCalled(t, "FetchPlannedEntriesByPatternIDs", mock.Anything, mock.Anything)
}

func TestPatternsService_ApplyPatternRetroactively_RejectsIgnoreAction(t *testing.T) {
	ctx := context.Background()
	repository := &MockRepository{}
	repository.On("FetchAdvancedPatternByID", ctx, mock.Anything).Return(AdvancedPatternModel{
		PatternID:      9,
		Action:         PatternActionIgnore,
		OrganizationID: 7,
	}, nil).Once()

	svc := &service{Repository: repository, logger: &logging.TestLogger{}}
	_, err := svc.ApplyPatternRetroactivelySync(ctx, ApplyPatternRetroactivelyInput{
		PatternID: 9, UserID: 3, OrganizationID: 7,
	})

	assert.ErrorIs(t, err, ErrIgnorePatternRetroactive)
	repository.AssertNotCalled(t, "FetchTransactionsForPatternMatching", mock.Anything, mock.Anything)
}

func TestPatternsService_CreateIgnorePattern_DropsTargetsAndDisablesRetroactiveApplication(t *testing.T) {
	ctx := context.Background()
	repository := &MockRepository{}
	repository.On("InsertAdvancedPattern", ctx, mock.MatchedBy(func(params insertAdvancedPatternParams) bool {
		return params.Action == PatternActionIgnore &&
			params.TargetDescription == nil &&
			params.TargetCategoryID == nil &&
			!params.ApplyRetroactively
	})).Return(AdvancedPatternModel{PatternID: 9, Action: PatternActionIgnore}, nil).Once()

	description := "não deve persistir"
	categoryID := 12
	svc := &service{Repository: repository, logger: &logging.TestLogger{}}
	pattern, err := svc.CreatePattern(ctx, CreatePatternInput{
		UserID:             3,
		OrganizationID:     7,
		Action:             PatternActionIgnore,
		DescriptionPattern: "PADARIA",
		TargetDescription:  &description,
		TargetCategoryID:   &categoryID,
		ApplyRetroactively: true,
	})

	assert.NoError(t, err)
	assert.Equal(t, PatternActionIgnore, pattern.Action)
	repository.AssertExpectations(t)
}

func TestPatternsService_CreateCategorizePattern_RequiresTargets(t *testing.T) {
	svc := &service{Repository: &MockRepository{}, logger: &logging.TestLogger{}}

	_, err := svc.CreatePattern(context.Background(), CreatePatternInput{
		Action:             PatternActionCategorize,
		DescriptionPattern: "PADARIA",
	})

	assert.ErrorContains(t, err, "target_description")
}

func TestPatternsService_UpdatePattern_ToIgnoreClearsTargets(t *testing.T) {
	ctx := context.Background()
	description := "Padaria"
	categoryID := 12
	action := PatternActionIgnore
	repository := &MockRepository{}
	repository.On("FetchAdvancedPatternByID", ctx, mock.Anything).Return(AdvancedPatternModel{
		PatternID: 9, Action: PatternActionCategorize,
		TargetDescription: &description, TargetCategoryID: &categoryID,
	}, nil).Once()
	repository.On("ModifyAdvancedPattern", ctx, mock.MatchedBy(func(params modifyAdvancedPatternParams) bool {
		return params.Action != nil && *params.Action == PatternActionIgnore &&
			params.TargetDescriptionSet && params.TargetDescription == nil &&
			params.TargetCategoryIDSet && params.TargetCategoryID == nil &&
			params.ApplyRetroactively != nil && !*params.ApplyRetroactively
	})).Return(AdvancedPatternModel{PatternID: 9, Action: PatternActionIgnore}, nil).Once()

	svc := &service{Repository: repository, logger: &logging.TestLogger{}}
	pattern, err := svc.UpdatePattern(ctx, UpdatePatternInput{
		PatternID: 9, UserID: 3, OrganizationID: 7, Action: &action,
	})

	assert.NoError(t, err)
	assert.Equal(t, PatternActionIgnore, pattern.Action)
	repository.AssertExpectations(t)
}

func TestPatternsService_AutoApplyPatterns_AppliesNewestIgnoreMatchFirst(t *testing.T) {
	ctx := context.Background()
	repository := &MockRepository{}
	repository.On("FetchTransactionByID", ctx, mock.Anything).Return(TransactionModel{
		TransactionID: 42, Description: "PIX PADARIA",
	}, nil).Once()
	repository.On("FetchAdvancedPatterns", ctx, mock.Anything).Return([]AdvancedPatternModel{
		{PatternID: 20, Action: PatternActionIgnore, DescriptionPattern: strPtr("PADARIA")},
		{PatternID: 10, Action: PatternActionCategorize, DescriptionPattern: strPtr("PADARIA")},
	}, nil).Once()
	repository.On("ModifyTransaction", ctx, mock.MatchedBy(func(params modifyTransactionParams) bool {
		return params.TransactionID == 42 && params.IsIgnored != nil && *params.IsIgnored
	})).Return(TransactionModel{}, nil).Once()

	svc := &service{Repository: repository, logger: &logging.TestLogger{}}
	matched, err := svc.AutoApplyPatterns(ctx, ApplyPatternsToTransactionInput{
		TransactionID: 42, UserID: 3, OrganizationID: 7,
	})

	assert.NoError(t, err)
	assert.True(t, matched)
	repository.AssertExpectations(t)
	repository.AssertNotCalled(t, "FetchPlannedEntriesByPatternIDs", mock.Anything, mock.Anything)
}
