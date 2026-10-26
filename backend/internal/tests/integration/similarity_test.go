package integration

import (
	"context"
	"fmt"
	"time"

	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/shopspring/decimal"
)

func (test *FinancialTestSuite) TestSimilarityClassification_UsesTrustedScopedHistoryAndPreservesReimportEdits() {
	ctx := context.Background()
	auth := test.CreateUserAndAuthenticate("similarity@example.com", "Similarity User", "Similarity Org")
	otherAuth := test.CreateUserAndAuthenticate("similarity-other@example.com", "Other User", "Other Org")
	svc := financial.New(test.financialRepo, test.System, test.Logger, test.DB, nil)
	createAccount := func(auth *AuthHelper) financial.Account {
		account, err := svc.CreateAccount(ctx, financial.CreateAccountInput{
			UserID: auth.GetUserID(), OrganizationID: auth.GetOrganizationID(), Name: "Checking",
			AccountType: "checking", Currency: "BRL", Balance: decimal.Zero,
		})
		test.Require().NoError(err)
		return account
	}
	createCategory := func(auth *AuthHelper, name, categoryType string) financial.Category {
		category, err := svc.CreateCategory(ctx, financial.CreateCategoryInput{
			UserID: auth.GetUserID(), OrganizationID: auth.GetOrganizationID(), Name: name,
			Icon: "🏷️", Color: "#000000", CategoryType: categoryType,
		})
		test.Require().NoError(err)
		return category
	}
	account := createAccount(auth)
	otherAccount := createAccount(otherAuth)
	food := createCategory(auth, "Food", "expense")
	other := createCategory(auth, "Other", "expense")
	income := createCategory(auth, "Income", "income")
	foreign := createCategory(otherAuth, "Foreign", "expense")
	now := time.Now().UTC()
	original := "MERCADO TESTE SIMILARIDADE"
	insertHistory := func(accountID, categoryID int, transactionType, classifiedBy string, ignored, needsReview bool, date time.Time) {
		err := test.DB.Run(ctx, `
			INSERT INTO transactions (account_id, category_id, description, original_description, amount,
				transaction_date, transaction_type, classified_by, is_ignored, needs_review)
			VALUES ($1, $2, 'Mercado da família', $3, 100, $4, $5, NULLIF($6, ''), $7, $8)
		`, accountID, categoryID, original, date, transactionType, classifiedBy, ignored, needsReview)
		test.Require().NoError(err)
	}
	insertHistory(account.AccountID, food.CategoryID, "debit", "manual", false, false, now)
	insertHistory(account.AccountID, other.CategoryID, "debit", "manual", true, false, now)
	insertHistory(account.AccountID, other.CategoryID, "debit", "manual", false, true, now)
	insertHistory(account.AccountID, other.CategoryID, "debit", "similarity", false, false, now)
	insertHistory(account.AccountID, income.CategoryID, "credit", "manual", false, false, now)
	insertHistory(account.AccountID, other.CategoryID, "debit", "manual", false, false, now.AddDate(0, -4, 0))
	insertHistory(otherAccount.AccountID, foreign.CategoryID, "debit", "manual", false, false, now)

	suggestion, err := svc.SuggestCategoryForTransaction(ctx, financial.SuggestCategoryInput{
		OriginalDescription: original, OrganizationID: auth.GetOrganizationID(), TransactionType: "debit",
	})
	test.Require().NoError(err)
	test.Require().NotNil(suggestion.CategoryID)
	test.Equal(food.CategoryID, *suggestion.CategoryID)
	test.False(suggestion.IsAmbiguous, "untrusted, old, other-type and other-tenant history must be excluded")
	test.Equal(1.0, suggestion.Confidence)

	ofx := []byte(fmt.Sprintf(`<OFX><BANKTRANLIST><STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>%s</DTPOSTED>
<TRNAMT>-100</TRNAMT>
<FITID>similarity-regression</FITID>
<NAME>%s</NAME>
</STMTTRN></BANKTRANLIST></OFX>`, now.Format("20060102"), original))
	input := financial.ImportOFXInput{UserID: auth.GetUserID(), OrganizationID: auth.GetOrganizationID(), AccountID: account.AccountID, OFXData: ofx}
	imported, err := svc.ImportTransactionsFromOFX(ctx, input)
	test.Require().NoError(err)
	test.Equal(1, imported.SimilarityMatchedCount)
	test.Require().Len(imported.Transactions, 1)
	id := imported.Transactions[0].TransactionID
	transaction, err := svc.GetTransactionByID(ctx, financial.GetTransactionByIDInput{TransactionID: id, OrganizationID: auth.GetOrganizationID()})
	test.Require().NoError(err)
	test.Require().NotNil(transaction.ClassifiedBy)
	test.Equal("similarity", *transaction.ClassifiedBy)
	test.Equal(food.CategoryID, *transaction.CategoryID)

	review, err := svc.GetTransactionsNeedingReview(ctx, financial.GetTransactionsNeedingReviewInput{
		OrganizationID: auth.GetOrganizationID(), Month: int(now.Month()), Year: now.Year(),
	})
	test.Require().NoError(err)
	test.GreaterOrEqual(len(review), 1)

	manualDescription := "Minha escolha manual"
	transaction, err = svc.UpdateTransaction(ctx, financial.UpdateTransactionInput{
		TransactionID: id, OrganizationID: auth.GetOrganizationID(), CategoryID: &other.CategoryID, Description: &manualDescription,
	})
	test.Require().NoError(err)
	test.Equal("manual", *transaction.ClassifiedBy)
	test.Nil(transaction.SuggestedCategoryID)
	test.Nil(transaction.SuggestedDescription)
	test.Nil(transaction.SuggestionConfidence)

	imported, err = svc.ImportTransactionsFromOFX(ctx, input)
	test.Require().NoError(err)
	test.Zero(imported.SimilarityMatchedCount)
	transaction, err = svc.GetTransactionByID(ctx, financial.GetTransactionByIDInput{TransactionID: id, OrganizationID: auth.GetOrganizationID()})
	test.Require().NoError(err)
	test.Equal(other.CategoryID, *transaction.CategoryID)
	test.Equal(manualDescription, transaction.Description)
	test.Equal("manual", *transaction.ClassifiedBy)
}
