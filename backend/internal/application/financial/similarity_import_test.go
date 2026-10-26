package financial

import (
	"context"
	"testing"

	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/system"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// Re-import returns existing transactions as well as new rows. Similarity must
// not replace a user's category or restore an ignored transaction's description.
func TestFinancialService_ImportTransactionsFromOFX_PreservesExistingClassification(t *testing.T) {
	categoryID := 10
	for _, tc := range []struct {
		name       string
		categoryID *int
		isIgnored  bool
	}{
		{name: "categorized", categoryID: &categoryID},
		{name: "ignored", isIgnored: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			ctx := context.Background()
			repo := new(MockRepository)
			svc := &service{Repository: repo, system: system.NewSystem(), logger: &logging.TestLogger{}}
			original := "Supermercado Extra"
			tx := TransactionModel{TransactionID: 1, AccountID: 1, CategoryID: tc.categoryID, IsIgnored: tc.isIgnored,
				Description: "My edited description", OriginalDescription: &original, TransactionType: TransactionTypeDebit}
			repo.On("FetchAccountByID", ctx, mock.Anything).Return(AccountModel{AccountID: 1, OrganizationID: 1}, nil)
			repo.On("IsMonthClosed", ctx, mock.Anything).Return(false, nil)
			repo.On("BulkInsertTransactions", ctx, mock.Anything).Return([]TransactionModel{tx}, nil)
			repo.On("FetchTransactionByID", ctx, mock.Anything).Return(tx, nil)
			repo.On("FetchAdvancedPatterns", ctx, mock.Anything).Return([]AdvancedPatternModel{}, nil)
			repo.On("FetchSimilarCategoryDistribution", ctx, mock.Anything).Return([]CategoryDistributionModel{}, nil).Maybe()

			result, err := svc.ImportTransactionsFromOFX(ctx, ImportOFXInput{UserID: 1, OrganizationID: 1, AccountID: 1, OFXData: generateOFXData(1)})

			assert.NoError(t, err)
			assert.Equal(t, 0, result.SimilarityMatchedCount)
			repo.AssertNotCalled(t, "FetchSimilarCategoryDistribution", mock.Anything, mock.Anything)
			repo.AssertNotCalled(t, "SetTransactionSimilarityResult", mock.Anything, mock.Anything)
			repo.AssertExpectations(t)
		})
	}
}

func TestFinancialService_SuggestCategoryForTransaction_ScopesHistoryByTransactionType(t *testing.T) {
	ctx := context.Background()
	repo := new(MockRepository)
	svc := &service{Repository: repo}
	repo.On("FetchSimilarCategoryDistribution", ctx, fetchSimilarCategoryDistributionParams{
		OriginalDescription: "TRANSFERENCIA", OrganizationID: 1, TransactionType: TransactionTypeDebit,
		SimilarityThreshold: SimilarityThreshold, LookbackMonths: SimilarityLookbackMonths,
	}).Return([]CategoryDistributionModel{}, nil)

	_, err := svc.SuggestCategoryForTransaction(ctx, SuggestCategoryInput{
		OriginalDescription: "TRANSFERENCIA", OrganizationID: 1, TransactionType: TransactionTypeDebit,
	})

	assert.NoError(t, err)
	repo.AssertExpectations(t)
}
