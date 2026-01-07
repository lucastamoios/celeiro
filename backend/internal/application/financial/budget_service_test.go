package financial

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// =============================================================================
// Budget CRUD Tests
// =============================================================================

func TestGetBudgets_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	budgetModels := []BudgetModel{
		{
			BudgetID:       1,
			UserID:         1,
			OrganizationID: 1,
			Name:           "January Budget",
			Month:          1,
			Year:           2024,
			BudgetType:     BudgetTypeFixed,
			Amount:         decimal.NewFromFloat(5000),
			IsActive:       true,
		},
		{
			BudgetID:       2,
			UserID:         1,
			OrganizationID: 1,
			Name:           "February Budget",
			Month:          2,
			Year:           2024,
			BudgetType:     BudgetTypeCalculated,
			Amount:         decimal.NewFromFloat(6000),
			IsActive:       true,
		},
	}

	mockRepo.On("FetchBudgets", ctx, fetchBudgetsParams{
		UserID:         1,
		OrganizationID: 1,
	}).Return(budgetModels, nil)

	result, err := svc.GetBudgets(ctx, GetBudgetsInput{
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "January Budget", result[0].Name)
	assert.Equal(t, "February Budget", result[1].Name)
	mockRepo.AssertExpectations(t)
}

func TestCreateBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	createdModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "New Budget",
		Month:          3,
		Year:           2024,
		BudgetType:     BudgetTypeFixed,
		Amount:         decimal.NewFromFloat(5000),
		IsActive:       true,
	}

	mockRepo.On("InsertBudget", ctx, insertBudgetParams{
		UserID:         1,
		OrganizationID: 1,
		Name:           "New Budget",
		Month:          3,
		Year:           2024,
		BudgetType:     BudgetTypeFixed,
		Amount:         decimal.NewFromFloat(5000),
	}).Return(createdModel, nil)

	result, err := svc.CreateBudget(ctx, CreateBudgetInput{
		UserID:         1,
		OrganizationID: 1,
		Name:           "New Budget",
		Month:          3,
		Year:           2024,
		BudgetType:     BudgetTypeFixed,
		Amount:         decimal.NewFromFloat(5000),
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.BudgetID)
	assert.Equal(t, "New Budget", result.Name)
	assert.True(t, result.IsActive)
	mockRepo.AssertExpectations(t)
}

func TestUpdateBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	newName := "Updated Budget"
	newAmount := decimal.NewFromFloat(6000)

	updatedModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           newName,
		Month:          3,
		Year:           2024,
		BudgetType:     BudgetTypeFixed,
		Amount:         newAmount,
		IsActive:       false,
	}

	mockRepo.On("ModifyBudget", ctx, modifyBudgetParams{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           &newName,
		Amount:         &newAmount,
		IsActive:       boolPtr(false),
	}).Return(updatedModel, nil)

	result, err := svc.UpdateBudget(ctx, UpdateBudgetInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           &newName,
		Amount:         &newAmount,
		IsActive:       boolPtr(false),
	})

	assert.NoError(t, err)
	assert.Equal(t, "Updated Budget", result.Name)
	assert.True(t, result.Amount.Equal(newAmount))
	assert.False(t, result.IsActive)
	mockRepo.AssertExpectations(t)
}

func TestDeleteBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	mockRepo.On("RemoveBudget", ctx, removeBudgetParams{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	}).Return(nil)

	err := svc.DeleteBudget(ctx, DeleteBudgetInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Budget Item Tests
// =============================================================================

func TestCreateBudgetItem_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	createdItem := BudgetItemModel{
		BudgetItemID:  1,
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(500),
	}

	mockRepo.On("InsertBudgetItem", ctx, insertBudgetItemParams{
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(500),
	}).Return(createdItem, nil)

	result, err := svc.CreateBudgetItem(ctx, CreateBudgetItemInput{
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(500),
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.BudgetItemID)
	assert.Equal(t, 5, result.CategoryID)
	assert.True(t, result.PlannedAmount.Equal(decimal.NewFromFloat(500)))
	mockRepo.AssertExpectations(t)
}

func TestUpdateBudgetItem_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	newAmount := decimal.NewFromFloat(750)
	updatedItem := BudgetItemModel{
		BudgetItemID:  1,
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: newAmount,
	}

	mockRepo.On("ModifyBudgetItem", ctx, modifyBudgetItemParams{
		BudgetItemID:  1,
		UserID:        1,
		PlannedAmount: &newAmount,
	}).Return(updatedItem, nil)

	result, err := svc.UpdateBudgetItem(ctx, UpdateBudgetItemInput{
		UserID:        1,
		BudgetItemID:  1,
		PlannedAmount: &newAmount,
	})

	assert.NoError(t, err)
	assert.True(t, result.PlannedAmount.Equal(newAmount))
	mockRepo.AssertExpectations(t)
}

func TestDeleteBudgetItem_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	mockRepo.On("RemoveBudgetItem", ctx, removeBudgetItemParams{
		BudgetItemID: 1,
		UserID:       1,
	}).Return(nil)

	err := svc.DeleteBudgetItem(ctx, DeleteBudgetItemInput{
		UserID:       1,
		BudgetItemID: 1,
	})

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Category Budget Tests
// =============================================================================

func TestGetCategoryBudgets_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	categoryBudgets := []CategoryBudgetModel{
		{
			CategoryBudgetID: 1,
			UserID:           1,
			OrganizationID:   1,
			CategoryID:       5,
			Month:            11,
			Year:             2024,
			PlannedAmount:    decimal.NewFromFloat(1000),
		},
		{
			CategoryBudgetID: 2,
			UserID:           1,
			OrganizationID:   1,
			CategoryID:       6,
			Month:            11,
			Year:             2024,
			PlannedAmount:    decimal.NewFromFloat(500),
		},
	}

	month := 11
	year := 2024
	mockRepo.On("FetchCategoryBudgets", ctx, fetchCategoryBudgetsParams{
		UserID:         1,
		OrganizationID: 1,
		Month:          &month,
		Year:           &year,
	}).Return(categoryBudgets, nil)

	result, err := svc.GetCategoryBudgets(ctx, GetCategoryBudgetsInput{
		UserID:         1,
		OrganizationID: 1,
		Month:          &month,
		Year:           &year,
	})

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, 5, result[0].CategoryID)
	assert.Equal(t, 6, result[1].CategoryID)
	mockRepo.AssertExpectations(t)
}

func TestGetCategoryBudgetByID_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	categoryBudget := CategoryBudgetModel{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
		CategoryID:       5,
		Month:            11,
		Year:             2024,
		PlannedAmount:    decimal.NewFromFloat(1000),
	}

	mockRepo.On("FetchCategoryBudgetByID", ctx, fetchCategoryBudgetByIDParams{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
	}).Return(categoryBudget, nil)

	result, err := svc.GetCategoryBudgetByID(ctx, GetCategoryBudgetByIDInput{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.CategoryBudgetID)
	assert.Equal(t, 5, result.CategoryID)
	assert.True(t, result.PlannedAmount.Equal(decimal.NewFromFloat(1000)))
	mockRepo.AssertExpectations(t)
}

func TestCreateCategoryBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	createdBudget := CategoryBudgetModel{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
		CategoryID:       5,
		Month:            12,
		Year:             2024,
		PlannedAmount:    decimal.NewFromFloat(1500),
	}

	mockRepo.On("InsertCategoryBudget", ctx, insertCategoryBudgetParams{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     5,
		Month:          12,
		Year:           2024,
		PlannedAmount:  decimal.NewFromFloat(1500),
	}).Return(createdBudget, nil)

	result, err := svc.CreateCategoryBudget(ctx, CreateCategoryBudgetInput{
		UserID:         1,
		OrganizationID: 1,
		CategoryID:     5,
		Month:          12,
		Year:           2024,
		PlannedAmount:  decimal.NewFromFloat(1500),
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.CategoryBudgetID)
	assert.Equal(t, 5, result.CategoryID)
	assert.True(t, result.PlannedAmount.Equal(decimal.NewFromFloat(1500)))
	mockRepo.AssertExpectations(t)
}

func TestUpdateCategoryBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	newAmount := decimal.NewFromFloat(2000)
	updatedBudget := CategoryBudgetModel{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
		CategoryID:       5,
		Month:            12,
		Year:             2024,
		PlannedAmount:    newAmount,
	}

	mockRepo.On("ModifyCategoryBudget", ctx, modifyCategoryBudgetParams{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
		PlannedAmount:    &newAmount,
	}).Return(updatedBudget, nil)

	result, err := svc.UpdateCategoryBudget(ctx, UpdateCategoryBudgetInput{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
		PlannedAmount:    &newAmount,
	})

	assert.NoError(t, err)
	assert.True(t, result.PlannedAmount.Equal(newAmount))
	mockRepo.AssertExpectations(t)
}

func TestDeleteCategoryBudget_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	mockRepo.On("RemoveCategoryBudget", ctx, removeCategoryBudgetParams{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
	}).Return(nil)

	err := svc.DeleteCategoryBudget(ctx, DeleteCategoryBudgetInput{
		CategoryBudgetID: 1,
		UserID:           1,
		OrganizationID:   1,
	})

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Budget Workflow Integration Tests
// =============================================================================

func TestBudgetWorkflow_CreateWithItems(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	// Step 1: Create budget
	budgetModel := BudgetModel{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "Monthly Budget",
		Month:          11,
		Year:           2024,
		BudgetType:     BudgetTypeCalculated,
		Amount:         decimal.NewFromFloat(5000),
		IsActive:       true,
	}

	mockRepo.On("InsertBudget", ctx, mock.Anything).Return(budgetModel, nil)

	budget, err := svc.CreateBudget(ctx, CreateBudgetInput{
		UserID:         1,
		OrganizationID: 1,
		Name:           "Monthly Budget",
		Month:          11,
		Year:           2024,
		BudgetType:     BudgetTypeCalculated,
		Amount:         decimal.NewFromFloat(5000),
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, budget.BudgetID)

	// Step 2: Add budget items
	item1 := BudgetItemModel{
		BudgetItemID:  1,
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(2000),
	}

	item2 := BudgetItemModel{
		BudgetItemID:  2,
		BudgetID:      1,
		CategoryID:    6,
		PlannedAmount: decimal.NewFromFloat(1500),
	}

	mockRepo.On("InsertBudgetItem", ctx, insertBudgetItemParams{
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(2000),
	}).Return(item1, nil)

	mockRepo.On("InsertBudgetItem", ctx, insertBudgetItemParams{
		BudgetID:      1,
		CategoryID:    6,
		PlannedAmount: decimal.NewFromFloat(1500),
	}).Return(item2, nil)

	_, err = svc.CreateBudgetItem(ctx, CreateBudgetItemInput{
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: decimal.NewFromFloat(2000),
	})
	assert.NoError(t, err)

	_, err = svc.CreateBudgetItem(ctx, CreateBudgetItemInput{
		BudgetID:      1,
		CategoryID:    6,
		PlannedAmount: decimal.NewFromFloat(1500),
	})
	assert.NoError(t, err)

	// Step 3: Fetch budget with items
	mockRepo.On("FetchBudgetByID", ctx, fetchBudgetByIDParams{
		BudgetID:       1,
		OrganizationID: 1,
	}).Return(budgetModel, nil)

	mockRepo.On("FetchBudgetItems", ctx, fetchBudgetItemsParams{
		BudgetID:       1,
		OrganizationID: 1,
	}).Return([]BudgetItemModel{item1, item2}, nil)

	budgetWithItems, err := svc.GetBudgetByID(ctx, GetBudgetByIDInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Len(t, budgetWithItems.Items, 2)

	// Verify calculated amount
	calculatedAmount := budgetWithItems.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(3500) // 2000 + 1500
	assert.True(t, calculatedAmount.Equal(expected))

	mockRepo.AssertExpectations(t)
}

func TestBudgetWorkflow_UpdateAndDelete(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{Repository: mockRepo}
	ctx := context.Background()

	// Update budget item
	newAmount := decimal.NewFromFloat(2500)
	updatedItem := BudgetItemModel{
		BudgetItemID:  1,
		BudgetID:      1,
		CategoryID:    5,
		PlannedAmount: newAmount,
	}

	mockRepo.On("ModifyBudgetItem", ctx, modifyBudgetItemParams{
		BudgetItemID:  1,
		UserID:        1,
		PlannedAmount: &newAmount,
	}).Return(updatedItem, nil)

	_, err := svc.UpdateBudgetItem(ctx, UpdateBudgetItemInput{
		UserID:        1,
		BudgetItemID:  1,
		PlannedAmount: &newAmount,
	})
	assert.NoError(t, err)

	// Delete budget item
	mockRepo.On("RemoveBudgetItem", ctx, removeBudgetItemParams{
		BudgetItemID: 1,
		UserID:       1,
	}).Return(nil)

	err = svc.DeleteBudgetItem(ctx, DeleteBudgetItemInput{
		UserID:       1,
		BudgetItemID: 1,
	})
	assert.NoError(t, err)

	// Delete budget
	mockRepo.On("RemoveBudget", ctx, removeBudgetParams{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	}).Return(nil)

	err = svc.DeleteBudget(ctx, DeleteBudgetInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
}

// =============================================================================
// Helper Functions
// =============================================================================

func boolPtr(b bool) *bool {
	return &b
}
