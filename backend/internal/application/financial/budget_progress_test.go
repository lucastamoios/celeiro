package financial

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/catrutech/celeiro/pkg/system"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestGetControllableCategoryPacing_UsesNonZeroControlledAmount(t *testing.T) {
	stubSystem := system.NewStubSystem()
	stubSystem.Time.SetTimes(time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC))

	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     stubSystem.ToSystem(),
	}

	ctx := context.Background()

	categoryBudgets := []CategoryBudgetModel{
		{CategoryBudgetID: 1, CategoryID: 10, ControlledAmount: decimal.NewFromFloat(500), Month: 3, Year: 2026, UserID: 1, OrganizationID: 1},
		{CategoryBudgetID: 2, CategoryID: 20, ControlledAmount: decimal.NewFromFloat(300), Month: 3, Year: 2026, UserID: 1, OrganizationID: 1},
		{CategoryBudgetID: 3, CategoryID: 30, ControlledAmount: decimal.Zero, Month: 3, Year: 2026, UserID: 1, OrganizationID: 1},
	}

	mockRepo.On("FetchCategoryBudgets", ctx, mock.MatchedBy(func(params fetchCategoryBudgetsParams) bool {
		return params.UserID == 1 && params.OrganizationID == 1 && *params.Month == 3 && *params.Year == 2026
	})).Return(categoryBudgets, nil)

	mockRepo.On("FetchCategoriesByIDs", ctx, fetchCategoriesByIDsParams{
		CategoryIDs: []int{10, 20}, OrganizationID: 1,
	}).Return([]CategoryModel{
		{CategoryID: 10, Name: "Food", Icon: "utensils", CategoryType: "expense"},
		{CategoryID: 20, Name: "Transport", Icon: "car", CategoryType: "expense"},
	}, nil).Once()

	granularity := 5
	for i := range categoryBudgets {
		categoryBudgets[i].Granularity = &granularity
	}

	catID10 := 10
	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(200), TransactionType: TransactionTypeDebit, CategoryID: &catID10},
	}

	mockRepo.On("FetchTransactionsByMonth", ctx, mock.MatchedBy(func(params fetchTransactionsByMonthParams) bool {
		return params.OrganizationID == 1 && params.Month == 3 && params.Year == 2026 && slices.Equal(params.CategoryIDs, []int{10, 20})
	})).Return(transactions, nil)

	mockRepo.On("FetchMatchedTransactionIDs", ctx, mock.Anything).Return([]int{}, nil)
	mockRepo.On("FetchIncomeBudgetForMonth", ctx, mock.Anything).Return(decimal.Zero, nil)

	result, err := svc.GetControllableCategoryPacing(ctx, GetControllableCategoryPacingInput{
		UserID: 1, OrganizationID: 1, Month: 3, Year: 2026,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Categories, 2)

	names := map[string]bool{}
	for _, c := range result.Categories {
		names[c.CategoryName] = true
	}
	assert.True(t, names["Food"])
	assert.True(t, names["Transport"])

	mockRepo.AssertNotCalled(t, "FetchCategories", mock.Anything, mock.Anything)
	mockRepo.AssertNotCalled(t, "FetchCategoryByID", mock.Anything, mock.Anything)
	mockRepo.AssertExpectations(t)
}

func TestGetControllableCategoryPacing_EmptyWhenAllZeroControlledAmount(t *testing.T) {
	stubSystem := system.NewStubSystem()
	stubSystem.Time.SetTimes(time.Date(2026, 3, 15, 12, 0, 0, 0, time.UTC))

	mockRepo := new(MockRepository)
	svc := &service{
		Repository: mockRepo,
		system:     stubSystem.ToSystem(),
	}

	ctx := context.Background()

	categoryBudgets := []CategoryBudgetModel{
		{CategoryBudgetID: 1, CategoryID: 10, ControlledAmount: decimal.Zero, Month: 3, Year: 2026, UserID: 1, OrganizationID: 1},
	}

	mockRepo.On("FetchCategoryBudgets", ctx, mock.MatchedBy(func(params fetchCategoryBudgetsParams) bool {
		return params.UserID == 1 && params.OrganizationID == 1
	})).Return(categoryBudgets, nil)

	result, err := svc.GetControllableCategoryPacing(ctx, GetControllableCategoryPacingInput{
		UserID: 1, OrganizationID: 1, Month: 3, Year: 2026,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Empty(t, result.Categories)
	assert.Equal(t, 3, result.Month)
	assert.Equal(t, 2026, result.Year)

	mockRepo.AssertNotCalled(t, "FetchCategories", mock.Anything, mock.Anything)
	mockRepo.AssertNotCalled(t, "FetchCategoryByID", mock.Anything, mock.Anything)
	mockRepo.AssertNotCalled(t, "FetchCategoriesByIDs", mock.Anything, mock.Anything)
	mockRepo.AssertNotCalled(t, "FetchTransactionsByMonth", mock.Anything, mock.Anything)
	mockRepo.AssertExpectations(t)
}

func TestFinancialService_GetControllableCategoryPacing_PropagatesLookupErrors(t *testing.T) {
	for _, failingLookup := range []string{"budget", "category"} {
		t.Run(failingLookup, func(t *testing.T) {
			ctx := context.Background()
			mockRepo := new(MockRepository)
			svc := &service{Repository: mockRepo, system: system.NewSystem()}
			lookupErr := errors.New("lookup failed")

			if failingLookup == "budget" {
				mockRepo.On("FetchCategoryBudgets", ctx, mock.Anything).
					Return([]CategoryBudgetModel{}, lookupErr).Once()
			} else {
				mockRepo.On("FetchCategoryBudgets", ctx, mock.Anything).
					Return([]CategoryBudgetModel{{CategoryID: 10, ControlledAmount: decimal.NewFromInt(500)}}, nil).Once()
				mockRepo.On("FetchCategoriesByIDs", ctx, fetchCategoriesByIDsParams{CategoryIDs: []int{10}, OrganizationID: 7}).
					Return([]CategoryModel{}, lookupErr).Once()
			}

			result, err := svc.GetControllableCategoryPacing(ctx, GetControllableCategoryPacingInput{
				UserID: 1, OrganizationID: 7, Month: 3, Year: 2026,
			})

			assert.ErrorIs(t, err, lookupErr)
			assert.Nil(t, result)
			mockRepo.AssertNotCalled(t, "FetchCategories", mock.Anything, mock.Anything)
			mockRepo.AssertNotCalled(t, "FetchCategoryByID", mock.Anything, mock.Anything)
			mockRepo.AssertNotCalled(t, "FetchTransactionsByMonth", mock.Anything, mock.Anything)
			mockRepo.AssertExpectations(t)
		})
	}
}
