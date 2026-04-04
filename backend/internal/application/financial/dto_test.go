package financial

import (
	"testing"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

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
