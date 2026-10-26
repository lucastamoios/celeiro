package financial

import (
	"context"
	"testing"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/stretchr/testify/require"
)

func TestFinancialRepository_FetchCategoriesByIDs_UsesOneScopedQuery(t *testing.T) {
	db := database.NewMemoryDatabase()
	categories := []CategoryModel{{CategoryID: 10}, {CategoryID: 20}}
	db.ExpectQuery(fetchCategoriesByIDsQuery, []int{10, 20}, 7).WillReturn(categories)

	result, err := NewRepository(db).FetchCategoriesByIDs(context.Background(), fetchCategoriesByIDsParams{
		CategoryIDs: []int{10, 20}, OrganizationID: 7,
	})

	require.NoError(t, err)
	require.Equal(t, categories, result)
	require.NoError(t, db.ExpectationsWereMet())
}

func TestFinancialRepository_FetchCategoriesByIDs_EmptyListSkipsQuery(t *testing.T) {
	for _, ids := range [][]int{nil, {}} {
		db := database.NewMemoryDatabase()
		result, err := NewRepository(db).FetchCategoriesByIDs(context.Background(), fetchCategoriesByIDsParams{
			CategoryIDs: ids, OrganizationID: 7,
		})
		require.NoError(t, err)
		require.Empty(t, result)
	}
}

func TestFinancialRepository_FetchTransactionsByMonth_PreservesOptionalCategoryFilter(t *testing.T) {
	for _, ids := range [][]int{nil, {}, {10, 20}} {
		db := database.NewMemoryDatabase()
		db.ExpectQuery(fetchTransactionsByMonthQuery, 7, 6, 2026, ids).WillReturn([]TransactionModel{})

		_, err := NewRepository(db).FetchTransactionsByMonth(context.Background(), fetchTransactionsByMonthParams{
			OrganizationID: 7, Month: 6, Year: 2026, CategoryIDs: ids,
		})

		require.NoError(t, err)
		require.NoError(t, db.ExpectationsWereMet())
	}
}
