package financial

import (
	"context"
	"testing"
	"time"

	"github.com/catrutech/celeiro/pkg/system"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// =============================================================================
// Test SaveTransactionAsPattern
// =============================================================================

func TestSaveTransactionAsPattern_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data
	categoryID := 5
	txModel := TransactionModel{
		TransactionID:   100,
		AccountID:       10,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionType: "debit",
		CategoryID:      &categoryID,
		TransactionDate: time.Now(),
	}

	expectedDay := 15
	entryModel := PlannedEntryModel{
		PlannedEntryID: 200,
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		IsRecurrent:    true,
		ExpectedDay:    &expectedDay,
		IsSavedPattern: true,
	}

	// Setup mock expectations
	mockRepo.On("FetchTransactionByID", ctx, fetchTransactionByIDParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
	}).Return(txModel, nil)

	mockRepo.On("InsertPlannedEntry", ctx, insertPlannedEntryParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		Amount:         decimal.NewFromFloat(45.90),
		IsRecurrent:    true,
		ParentEntryID:  nil,
		ExpectedDay:    &expectedDay,
		IsSavedPattern: true,
	}).Return(entryModel, nil)

	// Execute
	result, err := svc.SaveTransactionAsPattern(ctx, SaveTransactionAsPatternInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		IsRecurrent:    true,
		ExpectedDay:    &expectedDay,
	})

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 200, result.PlannedEntryID)
	assert.Equal(t, "Netflix Subscription", result.Description)
	assert.True(t, result.IsSavedPattern)
	mockRepo.AssertExpectations(t)
}

func TestSaveTransactionAsPattern_UncategorizedTransaction(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data - transaction without category
	txModel := TransactionModel{
		TransactionID:   100,
		Description:     "Some Transaction",
		Amount:          decimal.NewFromFloat(100.00),
		TransactionType: "debit",
		CategoryID:      nil, // No category assigned
	}

	// Setup mock expectations
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(txModel, nil)

	// Execute
	_, err := svc.SaveTransactionAsPattern(ctx, SaveTransactionAsPatternInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		IsRecurrent:    false,
		ExpectedDay:    nil,
	})

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "must be categorized")
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Test GetMatchSuggestionsForTransaction
// =============================================================================

func TestGetMatchSuggestionsForTransaction_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data
	categoryID := 5
	txModel := TransactionModel{
		TransactionID:   100,
		Description:     "NETFLIX COM BR", // Similar but not exact
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	expectedDay := 15
	patterns := []PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription", // Similar description
			Amount:         decimal.NewFromFloat(45.90),
			ExpectedDay:    &expectedDay,
			IsSavedPattern: true,
		},
		{
			PlannedEntryID: 201,
			CategoryID:     categoryID,
			Description:    "Spotify Premium", // Different description
			Amount:         decimal.NewFromFloat(19.90),
			ExpectedDay:    &expectedDay,
			IsSavedPattern: true,
		},
	}

	// Setup mock expectations
	mockRepo.On("FetchTransactionByID", ctx, fetchTransactionByIDParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
	}).Return(txModel, nil)

	mockRepo.On("FetchSavedPatterns", ctx, fetchSavedPatternsParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     nil,
	}).Return(patterns, nil)

	// Execute
	suggestions, err := svc.GetMatchSuggestionsForTransaction(ctx, GetMatchSuggestionsInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		CategoryID:     nil,
	})

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, suggestions)

	// First suggestion should be Netflix (better match)
	assert.Equal(t, 200, suggestions[0].Pattern.PlannedEntryID)
	assert.Greater(t, suggestions[0].MatchScore.TotalScore, 0.5)
	assert.Equal(t, "HIGH", suggestions[0].MatchScore.Confidence)

	mockRepo.AssertExpectations(t)
}

func TestGetMatchSuggestionsForTransaction_WithCategoryFilter(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	categoryID := 5
	filterCategory := 5
	txModel := TransactionModel{
		TransactionID: 100,
		Description:   "Netflix",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	patterns := []PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     5,
			Description:    "Netflix Subscription",
			Amount:         decimal.NewFromFloat(45.90),
		},
	}

	// Setup mocks
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(txModel, nil)
	mockRepo.On("FetchSavedPatterns", ctx, fetchSavedPatternsParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     &filterCategory,
	}).Return(patterns, nil)

	// Execute with category filter
	suggestions, err := svc.GetMatchSuggestionsForTransaction(ctx, GetMatchSuggestionsInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		CategoryID:     &filterCategory,
	})

	// Assert
	assert.NoError(t, err)
	assert.NotEmpty(t, suggestions)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Test ApplyPatternToTransaction
// =============================================================================

func TestApplyPatternToTransaction_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data
	categoryID := 5
	pattern := PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     categoryID,
		Description:    "Netflix Subscription",
		IsSavedPattern: true,
	}

	updatedTx := TransactionModel{
		TransactionID: 100,
		Description:   "NETFLIX COM BR",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	// Setup mock expectations
	mockRepo.On("FetchPlannedEntryByID", ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: 200,
		UserID:         1,
		OrganizationID: 1,
	}).Return(pattern, nil)

	mockRepo.On("ModifyTransaction", ctx, modifyTransactionParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     &categoryID,
		Description:    nil,
		Amount:         nil,
	}).Return(updatedTx, nil)

	// Execute
	result, err := svc.ApplyPatternToTransaction(ctx, ApplyPatternToTransactionInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		PatternID:      200,
	})

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 100, result.TransactionID)
	assert.Equal(t, &categoryID, result.CategoryID)
	mockRepo.AssertExpectations(t)
}

func TestApplyPatternToTransaction_NotASavedPattern(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data - entry that is NOT a saved pattern
	entry := PlannedEntryModel{
		PlannedEntryID: 200,
		CategoryID:     5,
		Description:    "Regular Entry",
		IsSavedPattern: false, // Not a pattern
	}

	// Setup mock expectations
	mockRepo.On("FetchPlannedEntryByID", ctx, mock.Anything).Return(entry, nil)

	// Execute
	_, err := svc.ApplyPatternToTransaction(ctx, ApplyPatternToTransactionInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
		PatternID:      200,
	})

	// Assert
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "is not a saved pattern")
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Test AutoMatchTransaction
// =============================================================================

func TestAutoMatchTransaction_HighConfidenceMatch(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data for high-confidence match
	categoryID := 5
	txModel := TransactionModel{
		TransactionID:   100,
		Description:     "Netflix Subscription",
		Amount:          decimal.NewFromFloat(45.90),
		TransactionDate: time.Date(2024, 11, 15, 0, 0, 0, 0, time.UTC),
		CategoryID:      &categoryID,
	}

	expectedDay := 15
	patterns := []PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription",
			Amount:         decimal.NewFromFloat(45.90),
			ExpectedDay:    &expectedDay,
			IsSavedPattern: true,
		},
	}

	pattern := patterns[0]
	updatedTx := txModel
	updatedTx.CategoryID = &categoryID

	// Setup mock expectations
	mockRepo.On("FetchTransactionByID", ctx, fetchTransactionByIDParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
	}).Return(txModel, nil)

	mockRepo.On("FetchSavedPatterns", ctx, fetchSavedPatternsParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     nil,
	}).Return(patterns, nil)

	mockRepo.On("FetchPlannedEntryByID", ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: 200,
		UserID:         1,
		OrganizationID: 1,
	}).Return(pattern, nil)

	mockRepo.On("ModifyTransaction", ctx, modifyTransactionParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     &categoryID,
		Description:    nil,
		Amount:         nil,
	}).Return(updatedTx, nil)

	// Execute
	matched, err := svc.AutoMatchTransaction(ctx, AutoMatchTransactionInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
	})

	// Assert
	assert.NoError(t, err)
	assert.True(t, matched, "Expected high-confidence match to be applied")
	mockRepo.AssertExpectations(t)
}

func TestAutoMatchTransaction_NoHighConfidenceMatch(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data for low-confidence match
	categoryID := 5
	txModel := TransactionModel{
		TransactionID:   100,
		Description:     "Some Random Store",
		Amount:          decimal.NewFromFloat(123.45),
		TransactionDate: time.Now(),
		CategoryID:      &categoryID,
	}

	expectedDay := 15
	patterns := []PlannedEntryModel{
		{
			PlannedEntryID: 200,
			CategoryID:     categoryID,
			Description:    "Netflix Subscription",
			Amount:         decimal.NewFromFloat(45.90),
			ExpectedDay:    &expectedDay,
			IsSavedPattern: true,
		},
	}

	// Setup mock expectations
	mockRepo.On("FetchTransactionByID", ctx, fetchTransactionByIDParams{
		TransactionID:  100,
		UserID:         1,
		OrganizationID: 1,
	}).Return(txModel, nil)

	mockRepo.On("FetchSavedPatterns", ctx, fetchSavedPatternsParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     nil,
	}).Return(patterns, nil)

	// Execute
	matched, err := svc.AutoMatchTransaction(ctx, AutoMatchTransactionInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
	})

	// Assert
	assert.NoError(t, err)
	assert.False(t, matched, "Expected no high-confidence match")
	mockRepo.AssertExpectations(t)
}

func TestAutoMatchTransaction_NoPatterns(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     system.NewSystem(),
		metrics:    nil,
	}
	ctx := context.Background()

	// Setup test data
	categoryID := 5
	txModel := TransactionModel{
		TransactionID: 100,
		Description:   "Netflix",
		Amount:        decimal.NewFromFloat(45.90),
		CategoryID:    &categoryID,
	}

	// Setup mock expectations - no patterns available
	mockRepo.On("FetchTransactionByID", ctx, mock.Anything).Return(txModel, nil)
	mockRepo.On("FetchSavedPatterns", ctx, mock.Anything).Return([]PlannedEntryModel{}, nil)

	// Execute
	matched, err := svc.AutoMatchTransaction(ctx, AutoMatchTransactionInput{
		UserID:         1,
		OrganizationID: 1,
		TransactionID:  100,
	})

	// Assert
	assert.NoError(t, err)
	assert.False(t, matched, "Expected no match when no patterns exist")
	mockRepo.AssertExpectations(t)
}
