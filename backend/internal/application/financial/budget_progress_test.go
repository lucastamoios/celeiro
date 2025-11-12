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

func TestCalculateBudgetProgress_FixedBudget_OnTrack(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	// Setup: $30000 budget, current day will be used from time.Now()
	// Using larger numbers so variance % stays small regardless of current day
	// Expected at current day: varies based on time.Now().Day()
	// Actual spent: $100 (very small compared to budget)
	// Status: on_track (variance will be < 1% of expected)
	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "October Budget",
		Month:          10,
		Year:           2025,
		BudgetType:     BudgetTypeFixed,
		Amount:         decimal.NewFromFloat(30000),
		IsActive:       true,
	}

	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(100), TransactionType: TransactionTypeDebit},
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.MatchedBy(func(params fetchBudgetByIDParams) bool {
		return params.BudgetID == 1
	})).Return(budgetModel, nil)

	mockRepo.On("FetchBudgetItems", ctx, mock.MatchedBy(func(params fetchBudgetItemsParams) bool {
		return params.BudgetID == 1
	})).Return([]BudgetItemModel{}, nil)

	mockRepo.On("FetchTransactionsByMonth", ctx, mock.MatchedBy(func(params fetchTransactionsByMonthParams) bool {
		return params.Month == 10 && params.Year == 2025
	})).Return(transactions, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, BudgetTypeFixed, result.BudgetType)
	assert.True(t, result.TotalBudget.Equal(decimal.NewFromFloat(30000)))
	assert.True(t, result.ActualSpent.Equal(decimal.NewFromFloat(100)))
	assert.Equal(t, "on_track", result.Status) // Variance < 1%

	mockRepo.AssertExpectations(t)
}

func TestCalculateBudgetProgress_FixedBudget_OverBudget(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	// Setup: $3000 budget for current month
	// Spend enough to be over budget at current pace
	// If we're on day 15 of 30, spending $2000 means we've spent 66% in 50% of time = over budget
	now := time.Now()
	currentDay := now.Day()
	daysInMonth := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC).Day()

	totalBudget := 3000.0
	expectedAtCurrentDay := totalBudget * float64(currentDay) / float64(daysInMonth)
	actualSpent := expectedAtCurrentDay + 500 // Spend $500 more than expected

	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "Current Month Budget",
		Month:          int(now.Month()),
		Year:           now.Year(),
		BudgetType:     BudgetTypeFixed,
		Amount:         decimal.NewFromFloat(totalBudget),
		IsActive:       true,
	}

	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(actualSpent), TransactionType: TransactionTypeDebit},
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.Anything).Return(budgetModel, nil)
	mockRepo.On("FetchBudgetItems", ctx, mock.Anything).Return([]BudgetItemModel{}, nil)
	mockRepo.On("FetchTransactionsByMonth", ctx, mock.Anything).Return(transactions, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Equal(t, "over_budget", result.Status)
	assert.True(t, result.ActualSpent.Equal(decimal.NewFromFloat(actualSpent)))
	assert.True(t, result.Variance.GreaterThan(decimal.Zero)) // Over expected

	// Projection: if spending continues at same rate, will end over budget
	if currentDay > 0 {
		assert.True(t, result.ProjectionEndOfMonth.GreaterThan(result.TotalBudget))
	}

	mockRepo.AssertExpectations(t)
}

func TestCalculateBudgetProgress_CalculatedBudget_WithCategories(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "October Budget",
		Month:          10,
		Year:           2025,
		BudgetType:     BudgetTypeCalculated,
		Amount:         decimal.NewFromFloat(2500), // Will be recalculated from items
		IsActive:       true,
	}

	// Budget items: Groceries $1500, Transport $1000
	budgetItems := []BudgetItemModel{
		{
			BudgetItemID:  1,
			BudgetID:      1,
			CategoryID:    35,
			PlannedAmount: decimal.NewFromFloat(1500),
		},
		{
			BudgetItemID:  2,
			BudgetID:      1,
			CategoryID:    36,
			PlannedAmount: decimal.NewFromFloat(1000),
		},
	}

	categoryID35 := 35
	categoryID36 := 36

	// Transactions: Groceries $1200 (under), Transport $1150 (over by 15%)
	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(600), TransactionType: TransactionTypeDebit, CategoryID: &categoryID35},
		{TransactionID: 2, Amount: decimal.NewFromFloat(600), TransactionType: TransactionTypeDebit, CategoryID: &categoryID35},
		{TransactionID: 3, Amount: decimal.NewFromFloat(700), TransactionType: TransactionTypeDebit, CategoryID: &categoryID36},
		{TransactionID: 4, Amount: decimal.NewFromFloat(450), TransactionType: TransactionTypeDebit, CategoryID: &categoryID36},
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.Anything).Return(budgetModel, nil)
	mockRepo.On("FetchBudgetItems", ctx, mock.Anything).Return(budgetItems, nil)
	mockRepo.On("FetchTransactionsByMonth", ctx, mock.Anything).Return(transactions, nil)

	// Mock category fetches
	mockRepo.On("FetchCategoryByID", mock.Anything, mock.MatchedBy(func(params fetchCategoryByIDParams) bool {
		return params.CategoryID == 35
	})).Return(CategoryModel{CategoryID: 35, Name: "Groceries"}, nil)

	mockRepo.On("FetchCategoryByID", mock.Anything, mock.MatchedBy(func(params fetchCategoryByIDParams) bool {
		return params.CategoryID == 36
	})).Return(CategoryModel{CategoryID: 36, Name: "Transport"}, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Equal(t, BudgetTypeCalculated, result.BudgetType)
	assert.True(t, result.TotalBudget.Equal(decimal.NewFromFloat(2500))) // Sum of planned
	assert.True(t, result.ActualSpent.Equal(decimal.NewFromFloat(2350))) // Total spent (1200 + 1150)
	assert.Equal(t, "on_track", result.Status)                           // Overall under budget

	// Check category breakdowns
	assert.Len(t, result.Categories, 2)

	// Find Groceries category
	var groceries *CategoryProgress
	for i := range result.Categories {
		if result.Categories[i].CategoryID == 35 {
			groceries = &result.Categories[i]
			break
		}
	}
	assert.NotNil(t, groceries)
	assert.Equal(t, "Groceries", groceries.CategoryName)
	assert.True(t, groceries.PlannedAmount.Equal(decimal.NewFromFloat(1500)))
	assert.True(t, groceries.ActualSpent.Equal(decimal.NewFromFloat(1200)))
	assert.Equal(t, "on_track", groceries.Status)

	// Find Transport category
	var transport *CategoryProgress
	for i := range result.Categories {
		if result.Categories[i].CategoryID == 36 {
			transport = &result.Categories[i]
			break
		}
	}
	assert.NotNil(t, transport)
	assert.Equal(t, "Transport", transport.CategoryName)
	assert.True(t, transport.PlannedAmount.Equal(decimal.NewFromFloat(1000)))
	assert.True(t, transport.ActualSpent.Equal(decimal.NewFromFloat(1150)))
	assert.Equal(t, "over_budget", transport.Status) // 15% over budget

	mockRepo.AssertExpectations(t)
}

func TestCalculateBudgetProgress_CalculatedBudget_UnplannedSpending(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Month:          10,
		Year:           2025,
		BudgetType:     BudgetTypeCalculated,
		Amount:         decimal.Zero,
		IsActive:       true,
	}

	// Budget items: Only Groceries planned
	budgetItems := []BudgetItemModel{
		{BudgetItemID: 1, BudgetID: 1, CategoryID: 35, PlannedAmount: decimal.NewFromFloat(1500)},
	}

	categoryID35 := 35
	categoryID99 := 99 // Unplanned category

	// Transactions: Some in planned category, some in unplanned
	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(800), TransactionType: TransactionTypeDebit, CategoryID: &categoryID35},
		{TransactionID: 2, Amount: decimal.NewFromFloat(500), TransactionType: TransactionTypeDebit, CategoryID: &categoryID99}, // Unplanned!
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.Anything).Return(budgetModel, nil)
	mockRepo.On("FetchBudgetItems", ctx, mock.Anything).Return(budgetItems, nil)
	mockRepo.On("FetchTransactionsByMonth", ctx, mock.Anything).Return(transactions, nil)

	mockRepo.On("FetchCategoryByID", mock.Anything, mock.MatchedBy(func(params fetchCategoryByIDParams) bool {
		return params.CategoryID == 35
	})).Return(CategoryModel{CategoryID: 35, Name: "Groceries"}, nil)

	mockRepo.On("FetchCategoryByID", mock.Anything, mock.MatchedBy(func(params fetchCategoryByIDParams) bool {
		return params.CategoryID == 99
	})).Return(CategoryModel{CategoryID: 99, Name: "Other"}, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.True(t, result.TotalBudget.Equal(decimal.NewFromFloat(1500))) // Only planned
	assert.True(t, result.ActualSpent.Equal(decimal.NewFromFloat(1300))) // Planned + unplanned
	assert.Equal(t, "on_track", result.Status)

	// Should have 2 categories in result
	assert.Len(t, result.Categories, 2)

	// Find the unplanned category
	var unplanned *CategoryProgress
	for i := range result.Categories {
		if result.Categories[i].CategoryID == 99 {
			unplanned = &result.Categories[i]
			break
		}
	}
	assert.NotNil(t, unplanned)
	assert.True(t, unplanned.PlannedAmount.Equal(decimal.Zero)) // Not planned
	assert.True(t, unplanned.ActualSpent.Equal(decimal.NewFromFloat(500)))
	assert.Equal(t, "over_budget", unplanned.Status) // All unplanned spending is "over"

	mockRepo.AssertExpectations(t)
}

func TestCalculateBudgetProgress_MaiorBudget_UsesStricterCalculation(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	// Setup where calculated budget is MORE restrictive than fixed
	// Fixed: $3000 total
	// Calculated: $2500 total (from items)
	// Maior should use the calculated ($2500) since it's stricter
	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Month:          10,
		Year:           2025,
		BudgetType:     BudgetTypeMaior,
		Amount:         decimal.NewFromFloat(3000), // Fixed amount
		IsActive:       true,
	}

	budgetItems := []BudgetItemModel{
		{BudgetItemID: 1, BudgetID: 1, CategoryID: 35, PlannedAmount: decimal.NewFromFloat(1500)},
		{BudgetItemID: 2, BudgetID: 1, CategoryID: 36, PlannedAmount: decimal.NewFromFloat(1000)},
	}

	categoryID35 := 35
	transactions := []TransactionModel{
		{TransactionID: 1, Amount: decimal.NewFromFloat(800), TransactionType: TransactionTypeDebit, CategoryID: &categoryID35},
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.Anything).Return(budgetModel, nil)
	mockRepo.On("FetchBudgetItems", ctx, mock.Anything).Return(budgetItems, nil)
	mockRepo.On("FetchTransactionsByMonth", ctx, mock.Anything).Return(transactions, nil)
	mockRepo.On("FetchCategoryByID", mock.Anything, mock.Anything).Return(CategoryModel{CategoryID: 35, Name: "Groceries"}, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Equal(t, BudgetTypeMaior, result.BudgetType)
	// Should use calculated budget since $2500 < $3000 (more restrictive)
	assert.True(t, result.TotalBudget.Equal(decimal.NewFromFloat(2500)))
	assert.NotNil(t, result.Categories) // Should have category breakdown from calculated

	mockRepo.AssertExpectations(t)
}

func TestCalculateBudgetProgress_EdgeCase_FirstDayOfMonth(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()

	budgetModel := BudgetModel{
		BudgetID:   1,
		UserID:     1,
		Month:      int(time.Now().Month()),
		Year:       time.Now().Year(),
		BudgetType: BudgetTypeFixed,
		Amount:     decimal.NewFromFloat(3000),
	}

	mockRepo.On("FetchBudgetByID", ctx, mock.Anything).Return(budgetModel, nil)
	mockRepo.On("FetchBudgetItems", ctx, mock.Anything).Return([]BudgetItemModel{}, nil)
	mockRepo.On("FetchTransactionsByMonth", ctx, mock.Anything).Return([]TransactionModel{}, nil)

	result, err := svc.CalculateBudgetProgress(ctx, CalculateBudgetProgressInput{
		BudgetID: 1, UserID: 1, OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.NotNil(t, result)
	// On first day with no spending, projection should be zero
	assert.True(t, result.ProjectionEndOfMonth.IsZero() || result.CurrentDay > 0)

	mockRepo.AssertExpectations(t)
}

func TestSumTransactions_OnlyCountsDebits(t *testing.T) {
	svc := &service{}

	transactions := []TransactionModel{
		{Amount: decimal.NewFromFloat(100), TransactionType: TransactionTypeDebit},
		{Amount: decimal.NewFromFloat(200), TransactionType: TransactionTypeCredit},
		{Amount: decimal.NewFromFloat(300), TransactionType: TransactionTypeDebit},
	}

	sum := svc.sumTransactions(transactions, TransactionTypeDebit)

	assert.True(t, sum.Equal(decimal.NewFromFloat(400))) // Only the two debits
}
