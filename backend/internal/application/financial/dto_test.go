package financial

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

func TestBudgetWithItems_CalculatedBudgetAmount_Fixed(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: BudgetTypeFixed,
			Amount:     decimal.NewFromFloat(5000),
		},
		Items: []BudgetItem{
			{PlannedAmount: decimal.NewFromFloat(2000)},
			{PlannedAmount: decimal.NewFromFloat(1500)},
		},
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(5000) // Should use fixed amount, ignore items

	assert.True(t, result.Equal(expected),
		"Fixed budget should return fixed amount. Expected %s, got %s",
		expected.String(), result.String())
}

func TestBudgetWithItems_CalculatedBudgetAmount_Calculated(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: BudgetTypeCalculated,
			Amount:     decimal.NewFromFloat(5000), // Ignored
		},
		Items: []BudgetItem{
			{PlannedAmount: decimal.NewFromFloat(2000)},
			{PlannedAmount: decimal.NewFromFloat(1500)},
			{PlannedAmount: decimal.NewFromFloat(800)},
		},
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(4300) // 2000 + 1500 + 800

	assert.True(t, result.Equal(expected),
		"Calculated budget should sum items. Expected %s, got %s",
		expected.String(), result.String())
}

func TestBudgetWithItems_CalculatedBudgetAmount_Hybrid_ItemsHigher(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: BudgetTypeHybrid,
			Amount:     decimal.NewFromFloat(3000), // Lower than items
		},
		Items: []BudgetItem{
			{PlannedAmount: decimal.NewFromFloat(2000)},
			{PlannedAmount: decimal.NewFromFloat(2500)},
		},
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(4500) // max(3000, 4500) = 4500

	assert.True(t, result.Equal(expected),
		"Hybrid budget should return max. Expected %s, got %s",
		expected.String(), result.String())
}

func TestBudgetWithItems_CalculatedBudgetAmount_Hybrid_FixedHigher(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: BudgetTypeHybrid,
			Amount:     decimal.NewFromFloat(6000), // Higher than items
		},
		Items: []BudgetItem{
			{PlannedAmount: decimal.NewFromFloat(2000)},
			{PlannedAmount: decimal.NewFromFloat(1500)},
		},
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(6000) // max(6000, 3500) = 6000

	assert.True(t, result.Equal(expected),
		"Hybrid budget should return max. Expected %s, got %s",
		expected.String(), result.String())
}

func TestBudgetWithItems_CalculatedBudgetAmount_EmptyItems(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: BudgetTypeCalculated,
			Amount:     decimal.NewFromFloat(5000),
		},
		Items: []BudgetItem{}, // Empty
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.Zero

	assert.True(t, result.Equal(expected),
		"Calculated budget with no items should be zero. Expected %s, got %s",
		expected.String(), result.String())
}

func TestBudgetWithItems_CalculatedBudgetAmount_InvalidType(t *testing.T) {
	budget := BudgetWithItems{
		Budget: Budget{
			BudgetType: "invalid_type",
			Amount:     decimal.NewFromFloat(5000),
		},
		Items: []BudgetItem{
			{PlannedAmount: decimal.NewFromFloat(2000)},
		},
	}

	result := budget.CalculatedBudgetAmount()
	expected := decimal.NewFromFloat(5000) // Should default to fixed amount

	assert.True(t, result.Equal(expected),
		"Invalid budget type should default to fixed. Expected %s, got %s",
		expected.String(), result.String())
}

func TestCategories_FromModel(t *testing.T) {
	userID := 1
	models := []CategoryModel{
		{CategoryID: 1, Name: "Food", Icon: "🍔", IsSystem: true, UserID: nil},
		{CategoryID: 2, Name: "Custom", Icon: "✨", IsSystem: false, UserID: &userID},
	}

	categories := Categories{}.FromModel(models)

	assert.Len(t, categories, 2)
	assert.Equal(t, "Food", categories[0].Name)
	assert.True(t, categories[0].IsSystem)
	assert.Nil(t, categories[0].UserID)

	assert.Equal(t, "Custom", categories[1].Name)
	assert.False(t, categories[1].IsSystem)
	assert.NotNil(t, categories[1].UserID)
	assert.Equal(t, 1, *categories[1].UserID)
}

func TestTransactions_FromModel(t *testing.T) {
	categoryID := 1
	models := []TransactionModel{
		{
			TransactionID:   1,
			Description:     "Grocery Shopping",
			Amount:          decimal.NewFromFloat(150.75),
			TransactionType: TransactionTypeDebit,
			CategoryID:      &categoryID,
			Tags:            []string{"groceries", "monthly"},
		},
	}

	transactions := Transactions{}.FromModel(models)

	assert.Len(t, transactions, 1)
	assert.Equal(t, "Grocery Shopping", transactions[0].Description)
	assert.True(t, transactions[0].Amount.Equal(decimal.NewFromFloat(150.75)))
	assert.Equal(t, TransactionTypeDebit, transactions[0].TransactionType)
	assert.NotNil(t, transactions[0].CategoryID)
	assert.Equal(t, 1, *transactions[0].CategoryID)
	assert.Len(t, transactions[0].Tags, 2)
	assert.Contains(t, transactions[0].Tags, "groceries")
}
