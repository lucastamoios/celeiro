package financial

import (
	"context"
	"testing"
	"time"

	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
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
