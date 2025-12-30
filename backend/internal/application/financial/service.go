package financial

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/catrutech/celeiro/pkg/errors"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/metrics"
	"github.com/catrutech/celeiro/pkg/system"
	"github.com/shopspring/decimal"
)

type Service interface {
	// Categories
	GetCategories(ctx context.Context, params GetCategoriesInput) ([]Category, error)
	GetCategoryByID(ctx context.Context, params GetCategoryByIDInput) (Category, error)
	CreateCategory(ctx context.Context, params CreateCategoryInput) (Category, error)
	UpdateCategory(ctx context.Context, params UpdateCategoryInput) (Category, error)
	DeleteCategory(ctx context.Context, params DeleteCategoryInput) error

	// Accounts
	GetAccounts(ctx context.Context, params GetAccountsInput) ([]Account, error)
	GetAccountByID(ctx context.Context, params GetAccountByIDInput) (Account, error)
	CreateAccount(ctx context.Context, params CreateAccountInput) (Account, error)
	UpdateAccount(ctx context.Context, params UpdateAccountInput) (Account, error)
	DeleteAccount(ctx context.Context, params DeleteAccountInput) error

	// Transactions
	GetTransactions(ctx context.Context, params GetTransactionsInput) ([]Transaction, error)
	GetUncategorizedTransactions(ctx context.Context, params GetUncategorizedTransactionsInput) ([]Transaction, error)
	GetTransactionByID(ctx context.Context, params GetTransactionByIDInput) (Transaction, error)
	CreateTransaction(ctx context.Context, params CreateTransactionInput) (Transaction, error)
	ImportTransactionsFromOFX(ctx context.Context, params ImportOFXInput) (ImportOFXOutput, error)
	UpdateTransaction(ctx context.Context, params UpdateTransactionInput) (Transaction, error)
	DeleteTransaction(ctx context.Context, params DeleteTransactionInput) error

	// Budgets
	GetBudgets(ctx context.Context, params GetBudgetsInput) ([]Budget, error)
	GetBudgetByID(ctx context.Context, params GetBudgetByIDInput) (BudgetWithItems, error)
	CreateBudget(ctx context.Context, params CreateBudgetInput) (Budget, error)
	UpdateBudget(ctx context.Context, params UpdateBudgetInput) (Budget, error)
	DeleteBudget(ctx context.Context, params DeleteBudgetInput) error

	// Budget Items
	CreateBudgetItem(ctx context.Context, params CreateBudgetItemInput) (BudgetItem, error)
	UpdateBudgetItem(ctx context.Context, params UpdateBudgetItemInput) (BudgetItem, error)
	DeleteBudgetItem(ctx context.Context, params DeleteBudgetItemInput) error
	GetBudgetSpending(ctx context.Context, params GetBudgetSpendingInput) (BudgetSpending, error)

	// Budget Progress
	CalculateBudgetProgress(ctx context.Context, input CalculateBudgetProgressInput) (*BudgetProgress, error)

	// Classification Rules
	GetClassificationRules(ctx context.Context, params GetClassificationRulesInput) ([]ClassificationRule, error)
	GetClassificationRuleByID(ctx context.Context, params GetClassificationRuleByIDInput) (ClassificationRule, error)
	CreateClassificationRule(ctx context.Context, params CreateClassificationRuleInput) (ClassificationRule, error)
	UpdateClassificationRule(ctx context.Context, params UpdateClassificationRuleInput) (ClassificationRule, error)
	DeleteClassificationRule(ctx context.Context, params DeleteClassificationRuleInput) error
	ApplyClassificationRules(ctx context.Context, params ApplyClassificationRulesInput) (ApplyClassificationRulesOutput, error)

	// Category Budgets
	GetCategoryBudgets(ctx context.Context, params GetCategoryBudgetsInput) ([]CategoryBudget, error)
	GetCategoryBudgetByID(ctx context.Context, params GetCategoryBudgetByIDInput) (CategoryBudget, error)
	CreateCategoryBudget(ctx context.Context, params CreateCategoryBudgetInput) (CategoryBudget, error)
	UpdateCategoryBudget(ctx context.Context, params UpdateCategoryBudgetInput) (CategoryBudget, error)
	DeleteCategoryBudget(ctx context.Context, params DeleteCategoryBudgetInput) error
	ConsolidateCategoryBudget(ctx context.Context, params ConsolidateCategoryBudgetInput) (MonthlySnapshot, error)
	CopyCategoryBudgetsFromMonth(ctx context.Context, params CopyCategoryBudgetsInput) ([]CategoryBudget, error)

	// Planned Entries
	GetPlannedEntries(ctx context.Context, params GetPlannedEntriesInput) ([]PlannedEntry, error)
	GetPlannedEntryByID(ctx context.Context, params GetPlannedEntryByIDInput) (PlannedEntry, error)
	GetSavedPatterns(ctx context.Context, params GetSavedPatternsInput) ([]PlannedEntry, error)
	CreatePlannedEntry(ctx context.Context, params CreatePlannedEntryInput) (PlannedEntry, error)
	UpdatePlannedEntry(ctx context.Context, params UpdatePlannedEntryInput) (PlannedEntry, error)
	DeletePlannedEntry(ctx context.Context, params DeletePlannedEntryInput) error
	GenerateMonthlyInstances(ctx context.Context, params GenerateMonthlyInstancesInput) ([]PlannedEntry, error)

	// Planned Entry Statuses (Entrada Planejada)
	GetPlannedEntriesForMonth(ctx context.Context, params GetPlannedEntriesForMonthInput) ([]PlannedEntryWithStatus, error)
	MatchPlannedEntryToTransaction(ctx context.Context, params MatchPlannedEntryInput) (PlannedEntryStatus, error)
	UnmatchPlannedEntry(ctx context.Context, params UnmatchPlannedEntryInput) error
	DismissPlannedEntry(ctx context.Context, params DismissPlannedEntryInput) (PlannedEntryStatus, error)
	UndismissPlannedEntry(ctx context.Context, params UndismissPlannedEntryInput) (PlannedEntryStatus, error)
	GetPlannedEntryForTransaction(ctx context.Context, params GetPlannedEntryForTransactionInput) (*PlannedEntryWithStatus, error)

	// Monthly Snapshots
	GetMonthlySnapshots(ctx context.Context, params GetMonthlySnapshotsInput) ([]MonthlySnapshot, error)
	GetMonthlySnapshotByID(ctx context.Context, params GetMonthlySnapshotByIDInput) (MonthlySnapshot, error)

	// Pattern Matching
	SaveTransactionAsPattern(ctx context.Context, input SaveTransactionAsPatternInput) (PlannedEntry, error)
	GetMatchSuggestionsForTransaction(ctx context.Context, input GetMatchSuggestionsInput) ([]MatchSuggestion, error)
	ApplyPatternToTransaction(ctx context.Context, input ApplyPatternToTransactionInput) (Transaction, error)
	AutoMatchTransaction(ctx context.Context, input AutoMatchTransactionInput) (bool, error)

	// Income Planning
	GetIncomePlanning(ctx context.Context, input GetIncomePlanningInput) (*IncomePlanningReport, error)

	// Advanced Patterns
	CreateAdvancedPattern(ctx context.Context, input CreateAdvancedPatternInput) (AdvancedPattern, error)
	GetAdvancedPatterns(ctx context.Context, input GetAdvancedPatternsInput) ([]AdvancedPattern, error)
	GetAdvancedPatternByID(ctx context.Context, input GetAdvancedPatternByIDInput) (AdvancedPattern, error)
	UpdateAdvancedPattern(ctx context.Context, input UpdateAdvancedPatternInput) (AdvancedPattern, error)
	DeleteAdvancedPattern(ctx context.Context, input DeleteAdvancedPatternInput) error
	ApplyPatternRetroactivelySync(ctx context.Context, input ApplyPatternRetroactivelyInput) (ApplyPatternRetroactivelyOutput, error)

	// Savings Goals
	GetSavingsGoals(ctx context.Context, input GetSavingsGoalsInput) ([]SavingsGoal, error)
	GetSavingsGoalByID(ctx context.Context, input GetSavingsGoalByIDInput) (SavingsGoal, error)
	GetSavingsGoalProgress(ctx context.Context, input GetSavingsGoalProgressInput) (SavingsGoalProgress, error)
	CreateSavingsGoal(ctx context.Context, input CreateSavingsGoalInput) (SavingsGoal, error)
	UpdateSavingsGoal(ctx context.Context, input UpdateSavingsGoalInput) (SavingsGoal, error)
	DeleteSavingsGoal(ctx context.Context, input DeleteSavingsGoalInput) error
	CompleteSavingsGoal(ctx context.Context, input CompleteSavingsGoalInput) (SavingsGoal, error)
	ReopenSavingsGoal(ctx context.Context, input ReopenSavingsGoalInput) (SavingsGoal, error)
	GetGoalSummary(ctx context.Context, input GetGoalSummaryInput) (SavingsGoalDetail, error)
	AddContribution(ctx context.Context, input AddContributionInput) (SavingsGoalProgress, error)

	// Amazon Sync
	SyncAmazonOrders(ctx context.Context, params SyncAmazonOrdersInput) (*SyncAmazonOrdersResult, error)

	// Tags
	GetTags(ctx context.Context, input GetTagsInput) ([]Tag, error)
	GetTagByID(ctx context.Context, input GetTagByIDInput) (Tag, error)
	CreateTag(ctx context.Context, input CreateTagInput) (Tag, error)
	UpdateTag(ctx context.Context, input UpdateTagInput) (Tag, error)
	DeleteTag(ctx context.Context, input DeleteTagInput) error

	// Transaction Tags
	GetTransactionTags(ctx context.Context, input GetTransactionTagsInput) ([]Tag, error)
	SetTransactionTags(ctx context.Context, input SetTransactionTagsInput) error
}

type service struct {
	Repository Repository
	system     *system.System
	logger     logging.Logger
	db         database.Database
	metrics    *metrics.Metrics
}

func New(
	repo Repository,
	system *system.System,
	logger logging.Logger,
	db database.Database,
	metrics *metrics.Metrics,
) Service {
	return &service{
		Repository: repo,
		system:     system,
		logger:     logger,
		db:         db,
		metrics:    metrics,
	}
}

// ============================================================================
// Categories
// ============================================================================

type GetCategoriesInput struct {
	UserID        int
	IncludeSystem bool
}

func (s *service) GetCategories(ctx context.Context, params GetCategoriesInput) ([]Category, error) {
	models, err := s.Repository.FetchCategories(ctx, fetchCategoriesParams{
		UserID:        &params.UserID,
		IncludeSystem: params.IncludeSystem,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch categories")
	}

	return Categories{}.FromModel(models), nil
}

type GetCategoryByIDInput struct {
	CategoryID int
	UserID     int
}

func (s *service) GetCategoryByID(ctx context.Context, params GetCategoryByIDInput) (Category, error) {
	model, err := s.Repository.FetchCategoryByID(ctx, fetchCategoryByIDParams{
		CategoryID: params.CategoryID,
		UserID:     params.UserID,
	})
	if err != nil {
		return Category{}, errors.Wrap(err, "failed to fetch category")
	}

	return Category{}.FromModel(&model), nil
}

type CreateCategoryInput struct {
	UserID       int
	Name         string
	Icon         string
	Color        string
	CategoryType string
}

func (s *service) CreateCategory(ctx context.Context, params CreateCategoryInput) (Category, error) {
	model, err := s.Repository.InsertCategory(ctx, insertCategoryParams{
		UserID:       params.UserID,
		Name:         params.Name,
		Icon:         params.Icon,
		Color:        params.Color,
		CategoryType: params.CategoryType,
	})
	if err != nil {
		return Category{}, errors.Wrap(err, "failed to create category")
	}

	return Category{}.FromModel(&model), nil
}

type UpdateCategoryInput struct {
	CategoryID   int
	UserID       int
	Name         *string
	Icon         *string
	Color        *string
	CategoryType *string
}

func (s *service) UpdateCategory(ctx context.Context, params UpdateCategoryInput) (Category, error) {
	model, err := s.Repository.ModifyCategory(ctx, modifyCategoryParams{
		CategoryID:   params.CategoryID,
		UserID:       params.UserID,
		Name:         params.Name,
		Icon:         params.Icon,
		Color:        params.Color,
		CategoryType: params.CategoryType,
	})
	if err != nil {
		return Category{}, errors.Wrap(err, "failed to update category")
	}

	return Category{}.FromModel(&model), nil
}

type DeleteCategoryInput struct {
	CategoryID int
	UserID     int
}

func (s *service) DeleteCategory(ctx context.Context, params DeleteCategoryInput) error {
	err := s.Repository.RemoveCategory(ctx, removeCategoryParams{
		CategoryID: params.CategoryID,
		UserID:     params.UserID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete category")
	}

	return nil
}

// ============================================================================
// Accounts
// ============================================================================

type GetAccountsInput struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
}

func (s *service) GetAccounts(ctx context.Context, params GetAccountsInput) ([]Account, error) {
	models, err := s.Repository.FetchAccounts(ctx, fetchAccountsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		IsActive:       params.IsActive,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch accounts")
	}

	return Accounts{}.FromModel(models), nil
}

type GetAccountByIDInput struct {
	AccountID      int
	UserID         int
	OrganizationID int
}

func (s *service) GetAccountByID(ctx context.Context, params GetAccountByIDInput) (Account, error) {
	model, err := s.Repository.FetchAccountByID(ctx, fetchAccountByIDParams{
		AccountID:      params.AccountID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return Account{}, errors.Wrap(err, "failed to fetch account")
	}

	return Account{}.FromModel(&model), nil
}

type CreateAccountInput struct {
	UserID         int
	OrganizationID int
	Name           string
	AccountType    string
	BankName       string
	Balance        decimal.Decimal
	Currency       string
}

func (s *service) CreateAccount(ctx context.Context, params CreateAccountInput) (Account, error) {
	model, err := s.Repository.InsertAccount(ctx, insertAccountParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Name:           params.Name,
		AccountType:    params.AccountType,
		BankName:       params.BankName,
		Balance:        params.Balance,
		Currency:       params.Currency,
	})
	if err != nil {
		return Account{}, errors.Wrap(err, "failed to create account")
	}

	return Account{}.FromModel(&model), nil
}

type UpdateAccountInput struct {
	AccountID      int
	UserID         int
	OrganizationID int
	Name           *string
	BankName       *string
	Balance        *decimal.Decimal
	IsActive       *bool
}

func (s *service) UpdateAccount(ctx context.Context, params UpdateAccountInput) (Account, error) {
	model, err := s.Repository.ModifyAccount(ctx, modifyAccountParams{
		AccountID:      params.AccountID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Name:           params.Name,
		BankName:       params.BankName,
		Balance:        params.Balance,
		IsActive:       params.IsActive,
	})
	if err != nil {
		return Account{}, errors.Wrap(err, "failed to update account")
	}

	return Account{}.FromModel(&model), nil
}

type DeleteAccountInput struct {
	AccountID      int
	UserID         int
	OrganizationID int
}

func (s *service) DeleteAccount(ctx context.Context, params DeleteAccountInput) error {
	err := s.Repository.RemoveAccount(ctx, removeAccountParams{
		AccountID:      params.AccountID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete account")
	}

	return nil
}

// ============================================================================
// Transactions
// ============================================================================

type GetTransactionsInput struct {
	AccountID      int
	UserID         int
	OrganizationID int
	Limit          int
	Offset         int
}

func (s *service) GetTransactions(ctx context.Context, params GetTransactionsInput) ([]Transaction, error) {
	// Set default limit if not provided
	if params.Limit == 0 {
		params.Limit = 100
	}

	models, err := s.Repository.FetchTransactions(ctx, fetchTransactionsParams{
		AccountID:      params.AccountID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Limit:          params.Limit,
		Offset:         params.Offset,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch transactions")
	}

	return Transactions{}.FromModel(models), nil
}

type GetUncategorizedTransactionsInput struct {
	UserID         int
	OrganizationID int
	Limit          int
	Offset         int
}

func (s *service) GetUncategorizedTransactions(ctx context.Context, params GetUncategorizedTransactionsInput) ([]Transaction, error) {
	models, err := s.Repository.FetchUncategorizedTransactions(ctx, fetchUncategorizedTransactionsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch uncategorized transactions")
	}

	// Apply limit and offset in memory if needed
	start := params.Offset
	end := params.Offset + params.Limit
	
	if start >= len(models) {
		return []Transaction{}, nil
	}
	
	if end > len(models) {
		end = len(models)
	}
	
	if params.Limit > 0 {
		models = models[start:end]
	}

	return Transactions{}.FromModel(models), nil
}

type GetTransactionByIDInput struct{
	TransactionID  int
	UserID         int
	OrganizationID int
}

func (s *service) GetTransactionByID(ctx context.Context, params GetTransactionByIDInput) (Transaction, error) {
	model, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
		TransactionID:  params.TransactionID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return Transaction{}, errors.Wrap(err, "failed to fetch transaction")
	}

	return Transaction{}.FromModel(&model), nil
}

type CreateTransactionInput struct {
	AccountID       int
	UserID          int
	OrganizationID  int
	CategoryID      *int
	Description     string
	Amount          decimal.Decimal
	TransactionDate string
	TransactionType string
	Notes           string
}

// validateCategoryTransactionType validates that the category type matches the transaction type.
// Income categories can only be assigned to credit transactions (money in).
// Expense categories can only be assigned to debit transactions (money out).
func (s *service) validateCategoryTransactionType(ctx context.Context, categoryID int, transactionType string, userID int) error {
	category, err := s.Repository.FetchCategoryByID(ctx, fetchCategoryByIDParams{
		CategoryID: categoryID,
		UserID:     userID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to fetch category for validation")
	}

	// Income categories must be assigned to credit transactions
	if category.CategoryType == "income" && transactionType == "debit" {
		return errors.New("cannot assign income category to a debit (expense) transaction")
	}

	// Expense categories must be assigned to debit transactions
	if category.CategoryType == "expense" && transactionType == "credit" {
		return errors.New("cannot assign expense category to a credit (income) transaction")
	}

	return nil
}

func (s *service) CreateTransaction(ctx context.Context, params CreateTransactionInput) (Transaction, error) {
	// Validate category type matches transaction type if category is provided
	if params.CategoryID != nil {
		if err := s.validateCategoryTransactionType(ctx, *params.CategoryID, params.TransactionType, params.UserID); err != nil {
			return Transaction{}, err
		}
	}

	model, err := s.Repository.InsertTransaction(ctx, insertTransactionParams{
		AccountID:       params.AccountID,
		CategoryID:      params.CategoryID,
		Description:     params.Description,
		Amount:          params.Amount,
		TransactionDate: params.TransactionDate,
		TransactionType: params.TransactionType,
	})
	if err != nil {
		return Transaction{}, errors.Wrap(err, "failed to create transaction")
	}

	return Transaction{}.FromModel(&model), nil
}

type ImportOFXInput struct {
	AccountID      int
	UserID         int
	OrganizationID int
	OFXData        []byte
}

type ImportOFXOutput struct {
	ImportedCount  int
	DuplicateCount int
	ErrorCount     int
	Transactions   []Transaction
}

// ImportTransactionsFromOFX parses OFX data and imports transactions
func (s *service) ImportTransactionsFromOFX(ctx context.Context, params ImportOFXInput) (ImportOFXOutput, error) {
	// Start metrics tracking
	importStart := s.system.Time.Now()
	if s.metrics != nil && s.metrics.OFXImportTotal != nil {
		s.metrics.OFXImportTotal.Add(ctx, 1)
	}

	// Verify account ownership
	_, err := s.Repository.FetchAccountByID(ctx, fetchAccountByIDParams{
		AccountID:      params.AccountID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		if s.metrics != nil && s.metrics.OFXImportFailure != nil {
			s.metrics.OFXImportFailure.Add(ctx, 1)
		}
		return ImportOFXOutput{}, errors.Wrap(err, "account not found or access denied")
	}

	// Parse OFX data
	parser := NewOFXParser()
	parseStart := s.system.Time.Now()
	ofxTransactions, err := parser.ParseOFX(params.OFXData)
	parseDuration := s.system.Time.Now().Sub(parseStart).Seconds()

	// Record parse metrics
	if s.metrics != nil && s.metrics.OFXParseDuration != nil {
		s.metrics.OFXParseDuration.Record(ctx, parseDuration)
	}

	if err != nil {
		if s.metrics != nil {
			if s.metrics.OFXParseErrors != nil {
				s.metrics.OFXParseErrors.Add(ctx, 1)
			}
			if s.metrics.OFXImportFailure != nil {
				s.metrics.OFXImportFailure.Add(ctx, 1)
			}
		}
		return ImportOFXOutput{}, errors.Wrap(err, "failed to parse OFX file")
	}

	// Record transaction count
	if s.metrics != nil && s.metrics.OFXTransactionCount != nil {
		s.metrics.OFXTransactionCount.Record(ctx, int64(len(ofxTransactions)))
	}

	// Convert OFX transactions to repository insert params
	insertParams := make([]insertTransactionParams, 0, len(ofxTransactions))
	for _, ofxTx := range ofxTransactions {
		insertParams = append(insertParams, ofxTx.ToInsertParams(params.AccountID))
	}

	// Bulk insert with deduplication
	inserted, err := s.Repository.BulkInsertTransactions(ctx, bulkInsertTransactionsParams{
		Transactions: insertParams,
	})
	if err != nil {
		return ImportOFXOutput{}, errors.Wrap(err, "failed to insert transactions")
	}

	// Calculate statistics
	importedCount := len(inserted)
	duplicateCount := len(ofxTransactions) - importedCount

	// Auto-match imported transactions
	matchedCount := 0
	for _, tx := range inserted {
		matched, err := s.AutoMatchTransaction(ctx, AutoMatchTransactionInput{
			UserID:         params.UserID,
			OrganizationID: params.OrganizationID,
			TransactionID:  tx.TransactionID,
		})
		if err != nil {
			// Log error but don't fail the import
			s.logger.Warn(ctx, "Failed to auto-match transaction",
				"transaction_id", tx.TransactionID,
				"error", err.Error(),
			)
			continue
		}
		if matched {
			matchedCount++
		}
	}

	// Record successful import metrics
	importDuration := s.system.Time.Now().Sub(importStart).Seconds()
	if s.metrics != nil {
		if s.metrics.OFXImportSuccess != nil {
			s.metrics.OFXImportSuccess.Add(ctx, 1)
		}
		if s.metrics.OFXImportDuration != nil {
			s.metrics.OFXImportDuration.Record(ctx, importDuration)
		}
	}

	s.logger.Info(ctx, "OFX import completed",
		"account_id", params.AccountID,
		"total_parsed", len(ofxTransactions),
		"imported", importedCount,
		"duplicates", duplicateCount,
		"auto_matched", matchedCount,
		"duration_seconds", importDuration,
	)

	return ImportOFXOutput{
		ImportedCount:  importedCount,
		DuplicateCount: duplicateCount,
		ErrorCount:     0,
		Transactions:   Transactions{}.FromModel(inserted),
	}, nil
}

type UpdateTransactionInput struct {
	TransactionID  int
	UserID         int
	OrganizationID int
	CategoryID     *int
	Description    *string
	Amount         *decimal.Decimal
	Notes          *string
	IsIgnored      *bool
}

func (s *service) UpdateTransaction(ctx context.Context, params UpdateTransactionInput) (Transaction, error) {
	// Validate category type matches transaction type if category is being updated
	if params.CategoryID != nil {
		// Fetch the existing transaction to get its transaction_type
		existingTx, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
			TransactionID:  params.TransactionID,
			UserID:         params.UserID,
			OrganizationID: params.OrganizationID,
		})
		if err != nil {
			return Transaction{}, errors.Wrap(err, "failed to fetch transaction for validation")
		}

		if err := s.validateCategoryTransactionType(ctx, *params.CategoryID, existingTx.TransactionType, params.UserID); err != nil {
			return Transaction{}, err
		}
	}

	model, err := s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
		TransactionID:  params.TransactionID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		Description:    params.Description,
		Amount:         params.Amount,
		Notes:          params.Notes,
		IsIgnored:      params.IsIgnored,
	})
	if err != nil {
		return Transaction{}, errors.Wrap(err, "failed to update transaction")
	}

	return Transaction{}.FromModel(&model), nil
}

type DeleteTransactionInput struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

func (s *service) DeleteTransaction(ctx context.Context, params DeleteTransactionInput) error {
	err := s.Repository.RemoveTransaction(ctx, removeTransactionParams{
		TransactionID:  params.TransactionID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete transaction")
	}

	return nil
}

// ============================================================================
// Budgets
// ============================================================================

type GetBudgetsInput struct {
	UserID         int
	OrganizationID int
	Year           *int
	Month          *int
}

func (s *service) GetBudgets(ctx context.Context, params GetBudgetsInput) ([]Budget, error) {
	models, err := s.Repository.FetchBudgets(ctx, fetchBudgetsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Year:           params.Year,
		Month:          params.Month,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch budgets")
	}

	return Budgets{}.FromModel(models), nil
}

type GetBudgetByIDInput struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

func (s *service) GetBudgetByID(ctx context.Context, params GetBudgetByIDInput) (BudgetWithItems, error) {
	budgetModel, err := s.Repository.FetchBudgetByID(ctx, fetchBudgetByIDParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return BudgetWithItems{}, errors.Wrap(err, "failed to fetch budget")
	}

	itemsModels, err := s.Repository.FetchBudgetItems(ctx, fetchBudgetItemsParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return BudgetWithItems{}, errors.Wrap(err, "failed to fetch budget items")
	}

	return BudgetWithItems{
		Budget: Budget{}.FromModel(&budgetModel),
		Items:  BudgetItems{}.FromModel(itemsModels),
	}, nil
}

type CreateBudgetInput struct {
	UserID         int
	OrganizationID int
	Name           string
	Month          int
	Year           int
	BudgetType     string
	Amount         decimal.Decimal
}

func (s *service) CreateBudget(ctx context.Context, params CreateBudgetInput) (Budget, error) {
	model, err := s.Repository.InsertBudget(ctx, insertBudgetParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Name:           params.Name,
		Month:          params.Month,
		Year:           params.Year,
		BudgetType:     params.BudgetType,
		Amount:         params.Amount,
	})
	if err != nil {
		return Budget{}, errors.Wrap(err, "failed to create budget")
	}

	return Budget{}.FromModel(&model), nil
}

type UpdateBudgetInput struct {
	BudgetID       int
	UserID         int
	OrganizationID int
	Name           *string
	BudgetType     *string
	Amount         *decimal.Decimal
	IsActive       *bool
}

func (s *service) UpdateBudget(ctx context.Context, params UpdateBudgetInput) (Budget, error) {
	model, err := s.Repository.ModifyBudget(ctx, modifyBudgetParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Name:           params.Name,
		BudgetType:     params.BudgetType,
		Amount:         params.Amount,
		IsActive:       params.IsActive,
	})
	if err != nil {
		return Budget{}, errors.Wrap(err, "failed to update budget")
	}

	return Budget{}.FromModel(&model), nil
}

type DeleteBudgetInput struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

func (s *service) DeleteBudget(ctx context.Context, params DeleteBudgetInput) error {
	err := s.Repository.RemoveBudget(ctx, removeBudgetParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete budget")
	}

	return nil
}

// ============================================================================
// Budget Items
// ============================================================================

type CreateBudgetItemInput struct {
	BudgetID      int
	CategoryID    int
	PlannedAmount decimal.Decimal
}

func (s *service) CreateBudgetItem(ctx context.Context, params CreateBudgetItemInput) (BudgetItem, error) {
	model, err := s.Repository.InsertBudgetItem(ctx, insertBudgetItemParams{
		BudgetID:      params.BudgetID,
		CategoryID:    params.CategoryID,
		PlannedAmount: params.PlannedAmount,
	})
	if err != nil {
		return BudgetItem{}, errors.Wrap(err, "failed to create budget item")
	}

	return BudgetItem{}.FromModel(&model), nil
}

type UpdateBudgetItemInput struct {
	BudgetItemID  int
	UserID        int
	PlannedAmount *decimal.Decimal
}

func (s *service) UpdateBudgetItem(ctx context.Context, params UpdateBudgetItemInput) (BudgetItem, error) {
	model, err := s.Repository.ModifyBudgetItem(ctx, modifyBudgetItemParams{
		BudgetItemID:  params.BudgetItemID,
		UserID:        params.UserID,
		PlannedAmount: params.PlannedAmount,
	})
	if err != nil {
		return BudgetItem{}, errors.Wrap(err, "failed to update budget item")
	}

	return BudgetItem{}.FromModel(&model), nil
}

type DeleteBudgetItemInput struct {
	BudgetItemID int
	UserID       int
}

func (s *service) DeleteBudgetItem(ctx context.Context, params DeleteBudgetItemInput) error {
	err := s.Repository.RemoveBudgetItem(ctx, removeBudgetItemParams{
		BudgetItemID: params.BudgetItemID,
		UserID:       params.UserID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete budget item")
	}

	return nil
}

type GetBudgetSpendingInput struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

type BudgetSpending struct {
	CategorySpending map[int]decimal.Decimal `json:"category_spending"`
}

func (s *service) GetBudgetSpending(ctx context.Context, params GetBudgetSpendingInput) (BudgetSpending, error) {
	// First, get the budget to extract month/year
	budget, err := s.Repository.FetchBudgetByID(ctx, fetchBudgetByIDParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return BudgetSpending{}, errors.Wrap(err, "failed to fetch budget")
	}

	// Fetch spending aggregated by category
	spendingMap, err := s.Repository.FetchBudgetSpending(ctx, fetchBudgetSpendingParams{
		BudgetID:       params.BudgetID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          budget.Month,
		Year:           budget.Year,
	})
	if err != nil {
		return BudgetSpending{}, errors.Wrap(err, "failed to fetch budget spending")
	}

	return BudgetSpending{
		CategorySpending: spendingMap,
	}, nil
}

// ============================================================================
// Classification Rules
// ============================================================================

type GetClassificationRulesInput struct {
	UserID   int
	IsActive *bool
}

func (s *service) GetClassificationRules(ctx context.Context, params GetClassificationRulesInput) ([]ClassificationRule, error) {
	models, err := s.Repository.FetchClassificationRules(ctx, fetchClassificationRulesParams{
		UserID:   params.UserID,
		IsActive: params.IsActive,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch classification rules")
	}

	return ClassificationRules{}.FromModel(models), nil
}

type GetClassificationRuleByIDInput struct {
	RuleID int
	UserID int
}

func (s *service) GetClassificationRuleByID(ctx context.Context, params GetClassificationRuleByIDInput) (ClassificationRule, error) {
	model, err := s.Repository.FetchClassificationRuleByID(ctx, fetchClassificationRuleByIDParams{
		RuleID: params.RuleID,
		UserID: params.UserID,
	})
	if err != nil {
		return ClassificationRule{}, errors.Wrap(err, "failed to fetch classification rule")
	}

	return ClassificationRule{}.FromModel(&model), nil
}

type CreateClassificationRuleInput struct {
	UserID               int
	CategoryID           int
	Name                 string
	Priority             int
	MatchDescription     *string
	MatchAmountMin       *decimal.Decimal
	MatchAmountMax       *decimal.Decimal
	MatchTransactionType *string
}

func (s *service) CreateClassificationRule(ctx context.Context, params CreateClassificationRuleInput) (ClassificationRule, error) {
	model, err := s.Repository.InsertClassificationRule(ctx, insertClassificationRuleParams{
		UserID:               params.UserID,
		CategoryID:           params.CategoryID,
		Name:                 params.Name,
		Priority:             params.Priority,
		MatchDescription:     params.MatchDescription,
		MatchAmountMin:       params.MatchAmountMin,
		MatchAmountMax:       params.MatchAmountMax,
		MatchTransactionType: params.MatchTransactionType,
	})
	if err != nil {
		return ClassificationRule{}, errors.Wrap(err, "failed to create classification rule")
	}

	return ClassificationRule{}.FromModel(&model), nil
}

type UpdateClassificationRuleInput struct {
	RuleID               int
	UserID               int
	CategoryID           *int
	Name                 *string
	Priority             *int
	MatchDescription     *string
	MatchAmountMin       *decimal.Decimal
	MatchAmountMax       *decimal.Decimal
	MatchTransactionType *string
	IsActive             *bool
}

func (s *service) UpdateClassificationRule(ctx context.Context, params UpdateClassificationRuleInput) (ClassificationRule, error) {
	model, err := s.Repository.ModifyClassificationRule(ctx, modifyClassificationRuleParams{
		RuleID:               params.RuleID,
		UserID:               params.UserID,
		CategoryID:           params.CategoryID,
		Name:                 params.Name,
		Priority:             params.Priority,
		MatchDescription:     params.MatchDescription,
		MatchAmountMin:       params.MatchAmountMin,
		MatchAmountMax:       params.MatchAmountMax,
		MatchTransactionType: params.MatchTransactionType,
		IsActive:             params.IsActive,
	})
	if err != nil {
		return ClassificationRule{}, errors.Wrap(err, "failed to update classification rule")
	}

	return ClassificationRule{}.FromModel(&model), nil
}

type DeleteClassificationRuleInput struct {
	RuleID int
	UserID int
}

func (s *service) DeleteClassificationRule(ctx context.Context, params DeleteClassificationRuleInput) error {
	err := s.Repository.RemoveClassificationRule(ctx, removeClassificationRuleParams{
		RuleID: params.RuleID,
		UserID: params.UserID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete classification rule")
	}

	return nil
}

type ApplyClassificationRulesInput struct {
	UserID         int
	OrganizationID int
	TransactionIDs []int
}

type ApplyClassificationRulesOutput struct {
	ClassifiedCount int
	FailedCount     int
}

// ApplyClassificationRules applies active rules to unclassified transactions
// TODO: Implement classification matching logic in Phase 2
func (s *service) ApplyClassificationRules(ctx context.Context, params ApplyClassificationRulesInput) (ApplyClassificationRulesOutput, error) {
	// TODO: Fetch active rules
	// TODO: For each transaction, find first matching rule
	// TODO: Update transaction category

	return ApplyClassificationRulesOutput{
		ClassifiedCount: 0,
		FailedCount:     0,
	}, errors.New("classification logic not implemented yet")
}

// ============================================================================
// Category Budgets
// ============================================================================

type GetCategoryBudgetsInput struct {
	UserID         int
	OrganizationID int
	Month          *int
	Year           *int
	CategoryID     *int
}

func (s *service) GetCategoryBudgets(ctx context.Context, params GetCategoryBudgetsInput) ([]CategoryBudget, error) {
	models, err := s.Repository.FetchCategoryBudgets(ctx, fetchCategoryBudgetsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          params.Month,
		Year:           params.Year,
		CategoryID:     params.CategoryID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch category budgets")
	}

	return CategoryBudgets{}.FromModel(models), nil
}

type GetCategoryBudgetByIDInput struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
}

func (s *service) GetCategoryBudgetByID(ctx context.Context, params GetCategoryBudgetByIDInput) (CategoryBudget, error) {
	model, err := s.Repository.FetchCategoryBudgetByID(ctx, fetchCategoryBudgetByIDParams{
		CategoryBudgetID: params.CategoryBudgetID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
	})
	if err != nil {
		return CategoryBudget{}, errors.Wrap(err, "failed to fetch category budget")
	}

	return CategoryBudget{}.FromModel(&model), nil
}

type CreateCategoryBudgetInput struct {
	UserID         int
	OrganizationID int
	CategoryID     int
	Month          int
	Year           int
	BudgetType     string
	PlannedAmount  decimal.Decimal
}

func (s *service) CreateCategoryBudget(ctx context.Context, params CreateCategoryBudgetInput) (CategoryBudget, error) {
	model, err := s.Repository.InsertCategoryBudget(ctx, insertCategoryBudgetParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		Month:          params.Month,
		Year:           params.Year,
		BudgetType:     params.BudgetType,
		PlannedAmount:  params.PlannedAmount,
	})
	if err != nil {
		return CategoryBudget{}, errors.Wrap(err, "failed to create category budget")
	}

	return CategoryBudget{}.FromModel(&model), nil
}

type UpdateCategoryBudgetInput struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
	BudgetType       *string
	PlannedAmount    *decimal.Decimal
}

func (s *service) UpdateCategoryBudget(ctx context.Context, params UpdateCategoryBudgetInput) (CategoryBudget, error) {
	model, err := s.Repository.ModifyCategoryBudget(ctx, modifyCategoryBudgetParams{
		CategoryBudgetID: params.CategoryBudgetID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
		BudgetType:       params.BudgetType,
		PlannedAmount:    params.PlannedAmount,
	})
	if err != nil {
		return CategoryBudget{}, errors.Wrap(err, "failed to update category budget")
	}

	return CategoryBudget{}.FromModel(&model), nil
}

type DeleteCategoryBudgetInput struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
}

func (s *service) DeleteCategoryBudget(ctx context.Context, params DeleteCategoryBudgetInput) error {
	err := s.Repository.RemoveCategoryBudget(ctx, removeCategoryBudgetParams{
		CategoryBudgetID: params.CategoryBudgetID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete category budget")
	}

	return nil
}

type ConsolidateCategoryBudgetInput struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
}

// ConsolidateCategoryBudget consolidates a budget and creates a snapshot
func (s *service) ConsolidateCategoryBudget(ctx context.Context, params ConsolidateCategoryBudgetInput) (MonthlySnapshot, error) {
	// Fetch the budget
	budget, err := s.Repository.FetchCategoryBudgetByID(ctx, fetchCategoryBudgetByIDParams{
		CategoryBudgetID: params.CategoryBudgetID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
	})
	if err != nil {
		return MonthlySnapshot{}, errors.Wrap(err, "failed to fetch budget for consolidation")
	}

	// Check if already consolidated
	if budget.IsConsolidated {
		return MonthlySnapshot{}, errors.New("budget already consolidated")
	}

	// Fetch actual spending for the category/month/year
	spending, err := s.Repository.FetchBudgetSpending(ctx, fetchBudgetSpendingParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          budget.Month,
		Year:           budget.Year,
	})
	if err != nil {
		return MonthlySnapshot{}, errors.Wrap(err, "failed to fetch spending")
	}

	actualAmount := spending[budget.CategoryID]
	if actualAmount.IsZero() {
		actualAmount = decimal.Zero
	}

	// Calculate variance percentage
	variancePercent := decimal.Zero
	if budget.PlannedAmount.GreaterThan(decimal.Zero) {
		variance := actualAmount.Sub(budget.PlannedAmount)
		variancePercent = variance.Div(budget.PlannedAmount).Mul(decimal.NewFromInt(100))
	}

	// Create snapshot
	snapshot, err := s.Repository.InsertMonthlySnapshot(ctx, insertMonthlySnapshotParams{
		UserID:          params.UserID,
		OrganizationID:  params.OrganizationID,
		CategoryID:      budget.CategoryID,
		Month:           budget.Month,
		Year:            budget.Year,
		PlannedAmount:   budget.PlannedAmount,
		ActualAmount:    actualAmount,
		VariancePercent: variancePercent,
		BudgetType:      budget.BudgetType,
	})
	if err != nil {
		return MonthlySnapshot{}, errors.Wrap(err, "failed to create snapshot")
	}

	// Mark budget as consolidated
	isConsolidated := true
	_, err = s.Repository.ModifyCategoryBudget(ctx, modifyCategoryBudgetParams{
		CategoryBudgetID: params.CategoryBudgetID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
		IsConsolidated:   &isConsolidated,
	})
	if err != nil {
		return MonthlySnapshot{}, errors.Wrap(err, "failed to mark budget as consolidated")
	}

	return MonthlySnapshot{}.FromModel(&snapshot), nil
}

// CopyCategoryBudgetsInput contains the parameters for copying budgets
type CopyCategoryBudgetsInput struct {
	UserID         int
	OrganizationID int
	SourceMonth    int
	SourceYear     int
	TargetMonth    int
	TargetYear     int
}

func (s *service) CopyCategoryBudgetsFromMonth(ctx context.Context, params CopyCategoryBudgetsInput) ([]CategoryBudget, error) {
	// Fetch all budgets from the source month
	sourceBudgets, err := s.Repository.FetchCategoryBudgets(ctx, fetchCategoryBudgetsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          &params.SourceMonth,
		Year:           &params.SourceYear,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch source month budgets")
	}

	if len(sourceBudgets) == 0 {
		return nil, errors.New("no budgets found in source month to copy")
	}

	// Check if target month already has budgets
	existingBudgets, err := s.Repository.FetchCategoryBudgets(ctx, fetchCategoryBudgetsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          &params.TargetMonth,
		Year:           &params.TargetYear,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to check existing budgets")
	}

	// Build a map of existing category IDs in target month
	existingCategoryIDs := make(map[int]bool)
	for _, b := range existingBudgets {
		existingCategoryIDs[b.CategoryID] = true
	}

	// Create new budgets for the target month (skip categories that already exist)
	var createdBudgets []CategoryBudget
	for _, src := range sourceBudgets {
		// Skip if category already has a budget in target month
		if existingCategoryIDs[src.CategoryID] {
			continue
		}

		model, err := s.Repository.InsertCategoryBudget(ctx, insertCategoryBudgetParams{
			UserID:         params.UserID,
			OrganizationID: params.OrganizationID,
			CategoryID:     src.CategoryID,
			Month:          params.TargetMonth,
			Year:           params.TargetYear,
			BudgetType:     src.BudgetType,
			PlannedAmount:  src.PlannedAmount,
		})
		if err != nil {
			return nil, errors.Wrap(err, fmt.Sprintf("failed to create budget for category %d", src.CategoryID))
		}

		createdBudgets = append(createdBudgets, CategoryBudget{}.FromModel(&model))
	}

	if len(createdBudgets) == 0 {
		return nil, errors.New("all categories from source month already have budgets in target month")
	}

	return createdBudgets, nil
}

// ============================================================================
// Planned Entries
// ============================================================================

type GetPlannedEntriesInput struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
	IsRecurrent    *bool
	IsActive       *bool
}

func (s *service) GetPlannedEntries(ctx context.Context, params GetPlannedEntriesInput) ([]PlannedEntry, error) {
	models, err := s.Repository.FetchPlannedEntries(ctx, fetchPlannedEntriesParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		IsRecurrent:    params.IsRecurrent,
		IsActive:       params.IsActive,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch planned entries")
	}

	return PlannedEntries{}.FromModel(models), nil
}

type GetPlannedEntryByIDInput struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
}

func (s *service) GetPlannedEntryByID(ctx context.Context, params GetPlannedEntryByIDInput) (PlannedEntry, error) {
	model, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: params.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return PlannedEntry{}, errors.Wrap(err, "failed to fetch planned entry")
	}

	return PlannedEntry{}.FromModel(&model), nil
}

type GetSavedPatternsInput struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
}

// GetSavedPatterns returns planned entries that have a linked pattern
// This is the new approach - patterns are entries with pattern_id != NULL
func (s *service) GetSavedPatterns(ctx context.Context, params GetSavedPatternsInput) ([]PlannedEntry, error) {
	isActiveTrue := true
	models, err := s.Repository.FetchPlannedEntriesWithPattern(ctx, fetchPlannedEntriesWithPatternParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		IsActive:       &isActiveTrue,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch saved patterns")
	}

	return PlannedEntries{}.FromModel(models), nil
}

type CreatePlannedEntryInput struct {
	UserID           int
	OrganizationID   int
	CategoryID       int
	PatternID        *int
	Description      string
	Amount           decimal.Decimal
	AmountMin        *decimal.Decimal
	AmountMax        *decimal.Decimal
	ExpectedDayStart *int
	ExpectedDayEnd   *int
	ExpectedDay      *int
	EntryType        string
	IsRecurrent      bool
	ParentEntryID    *int
}

func (s *service) CreatePlannedEntry(ctx context.Context, params CreatePlannedEntryInput) (PlannedEntry, error) {
	// Default entry type to expense if not provided
	if params.EntryType == "" {
		params.EntryType = PlannedEntryTypeExpense
	}

	model, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
		CategoryID:       params.CategoryID,
		PatternID:        params.PatternID,
		Description:      params.Description,
		Amount:           params.Amount,
		AmountMin:        params.AmountMin,
		AmountMax:        params.AmountMax,
		ExpectedDayStart: params.ExpectedDayStart,
		ExpectedDayEnd:   params.ExpectedDayEnd,
		ExpectedDay:      params.ExpectedDay,
		EntryType:        params.EntryType,
		IsRecurrent:      params.IsRecurrent,
		ParentEntryID:    params.ParentEntryID,
	})
	if err != nil {
		return PlannedEntry{}, errors.Wrap(err, "failed to create planned entry")
	}

	return PlannedEntry{}.FromModel(&model), nil
}

type UpdatePlannedEntryInput struct {
	PlannedEntryID   int
	UserID           int
	OrganizationID   int
	PatternID        *int
	Description      *string
	Amount           *decimal.Decimal
	AmountMin        *decimal.Decimal
	AmountMax        *decimal.Decimal
	ExpectedDayStart *int
	ExpectedDayEnd   *int
	ExpectedDay      *int
	EntryType        *string
	IsActive         *bool
}

func (s *service) UpdatePlannedEntry(ctx context.Context, params UpdatePlannedEntryInput) (PlannedEntry, error) {
	model, err := s.Repository.ModifyPlannedEntry(ctx, modifyPlannedEntryParams{
		PlannedEntryID:   params.PlannedEntryID,
		UserID:           params.UserID,
		OrganizationID:   params.OrganizationID,
		PatternID:        params.PatternID,
		Description:      params.Description,
		Amount:           params.Amount,
		AmountMin:        params.AmountMin,
		AmountMax:        params.AmountMax,
		ExpectedDayStart: params.ExpectedDayStart,
		ExpectedDayEnd:   params.ExpectedDayEnd,
		ExpectedDay:      params.ExpectedDay,
		EntryType:        params.EntryType,
		IsActive:         params.IsActive,
	})
	if err != nil {
		return PlannedEntry{}, errors.Wrap(err, "failed to update planned entry")
	}

	return PlannedEntry{}.FromModel(&model), nil
}

type DeletePlannedEntryInput struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
}

func (s *service) DeletePlannedEntry(ctx context.Context, params DeletePlannedEntryInput) error {
	err := s.Repository.RemovePlannedEntry(ctx, removePlannedEntryParams{
		PlannedEntryID: params.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return errors.Wrap(err, "failed to delete planned entry")
	}

	return nil
}

type GenerateMonthlyInstancesInput struct {
	ParentEntryID  int
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

// GenerateMonthlyInstances generates monthly instances for a recurrent entry
func (s *service) GenerateMonthlyInstances(ctx context.Context, params GenerateMonthlyInstancesInput) ([]PlannedEntry, error) {
	// Fetch the parent entry
	parent, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: params.ParentEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch parent entry")
	}

	if !parent.IsRecurrent {
		return nil, errors.New("entry is not recurrent")
	}

	// Check if instance already exists for this month
	existingInstances, err := s.Repository.FetchPlannedEntriesByParent(ctx, fetchPlannedEntriesByParentParams{
		ParentEntryID:  params.ParentEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to check existing instances")
	}

	// Filter to see if this month/year already has an instance
	for _, instance := range existingInstances {
		// This is a simplified check - in production you'd want to add month/year fields
		// or check creation dates more carefully
		if instance.IsActive {
			return nil, errors.New("instance already exists for this month")
		}
	}

	// Create new instance
	instance, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     parent.CategoryID,
		Description:    parent.Description,
		Amount:         parent.Amount,
		IsRecurrent:    false,
		ParentEntryID:  &params.ParentEntryID,
		ExpectedDay:    parent.ExpectedDay,
		EntryType:      parent.EntryType,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to create monthly instance")
	}

	return []PlannedEntry{PlannedEntry{}.FromModel(&instance)}, nil
}

// ============================================================================
// Monthly Snapshots
// ============================================================================

type GetMonthlySnapshotsInput struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
	Month          *int
	Year           *int
}

func (s *service) GetMonthlySnapshots(ctx context.Context, params GetMonthlySnapshotsInput) ([]MonthlySnapshot, error) {
	models, err := s.Repository.FetchMonthlySnapshots(ctx, fetchMonthlySnapshotsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		Month:          params.Month,
		Year:           params.Year,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch monthly snapshots")
	}

	return MonthlySnapshots{}.FromModel(models), nil
}

type GetMonthlySnapshotByIDInput struct {
	SnapshotID     int
	UserID         int
	OrganizationID int
}

func (s *service) GetMonthlySnapshotByID(ctx context.Context, params GetMonthlySnapshotByIDInput) (MonthlySnapshot, error) {
	model, err := s.Repository.FetchMonthlySnapshotByID(ctx, fetchMonthlySnapshotByIDParams{
		SnapshotID:     params.SnapshotID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return MonthlySnapshot{}, errors.Wrap(err, "failed to fetch monthly snapshot")
	}

	return MonthlySnapshot{}.FromModel(&model), nil
}

// ============================================================================
// Planned Entry Statuses (Entrada Planejada)
// ============================================================================

type GetPlannedEntriesForMonthInput struct {
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

// GetPlannedEntriesForMonth returns all planned entries with their monthly status
func (s *service) GetPlannedEntriesForMonth(ctx context.Context, params GetPlannedEntriesForMonthInput) ([]PlannedEntryWithStatus, error) {
	// 1. Fetch active recurrent planned entries (entradas planejadas)
	// These are entries that should appear every month for tracking
	isActive := true
	isRecurrent := true
	entries, err := s.Repository.FetchPlannedEntries(ctx, fetchPlannedEntriesParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		IsRecurrent:    &isRecurrent,
		IsActive:       &isActive,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch planned entries")
	}

	// 2. Fetch statuses for the given month
	statuses, err := s.Repository.FetchPlannedEntryStatusesByMonth(ctx, fetchPlannedEntryStatusesByMonthParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          params.Month,
		Year:           params.Year,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch planned entry statuses")
	}

	// 3. Create a map of status by planned entry ID
	statusMap := make(map[int]PlannedEntryStatusModel)
	for _, status := range statuses {
		statusMap[status.PlannedEntryID] = status
	}

	// 4. Fetch linked patterns
	patterns, err := s.Repository.FetchAdvancedPatterns(ctx, fetchAdvancedPatternsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		IsActive:       &isActive,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch patterns")
	}

	patternMap := make(map[int]AdvancedPatternModel)
	for _, pattern := range patterns {
		patternMap[pattern.PatternID] = pattern
	}

	// 5. Build result with computed status
	currentDay := s.system.Time.Now().Day()
	currentMonth := int(s.system.Time.Now().Month())
	currentYear := s.system.Time.Now().Year()

	result := make([]PlannedEntryWithStatus, 0, len(entries))
	for _, entry := range entries {
		entryDTO := PlannedEntry{}.FromModel(&entry)
		statusDTO := PlannedEntryWithStatus{
			PlannedEntry: entryDTO,
		}

		// Check if we have a status for this month
		if status, exists := statusMap[entry.PlannedEntryID]; exists {
			statusDTO.Status = status.Status
			statusDTO.StatusColor = GetStatusColor(status.Status)
			statusDTO.MatchedAmount = status.MatchedAmount
			statusDTO.MatchedTransactionID = status.MatchedTransactionID
			if status.MatchedAt != nil {
				matchedAt := status.MatchedAt.Format("2006-01-02T15:04:05Z")
				statusDTO.MatchedAt = &matchedAt
			}
		} else {
			// Compute status based on current day and expected day range
			statusDTO.Status = s.computePlannedEntryStatus(entry, currentDay, currentMonth, currentYear, params.Month, params.Year)
			statusDTO.StatusColor = GetStatusColor(statusDTO.Status)
		}

		// Add linked pattern if available
		if entry.PatternID != nil {
			if pattern, exists := patternMap[*entry.PatternID]; exists {
				patternDTO := AdvancedPattern{}.FromModel(&pattern)
				statusDTO.LinkedPattern = &patternDTO
			}
		}

		result = append(result, statusDTO)
	}

	return result, nil
}

// computePlannedEntryStatus calculates the status based on current date and expected period
func (s *service) computePlannedEntryStatus(entry PlannedEntryModel, currentDay, currentMonth, currentYear, targetMonth, targetYear int) string {
	// If target month is in the past
	if targetYear < currentYear || (targetYear == currentYear && targetMonth < currentMonth) {
		return PlannedEntryStatusMissed
	}

	// If target month is in the future
	if targetYear > currentYear || (targetYear == currentYear && targetMonth > currentMonth) {
		return PlannedEntryStatusPending
	}

	// Same month - check expected day
	if entry.ExpectedDayEnd != nil && currentDay > *entry.ExpectedDayEnd {
		return PlannedEntryStatusMissed
	}

	return PlannedEntryStatusPending
}

type MatchPlannedEntryInput struct {
	PlannedEntryID int
	TransactionID  int
	Month          int
	Year           int
	UserID         int
	OrganizationID int
}

// MatchPlannedEntryToTransaction links a transaction to a planned entry
func (s *service) MatchPlannedEntryToTransaction(ctx context.Context, params MatchPlannedEntryInput) (PlannedEntryStatus, error) {
	// 1. Verify the planned entry exists and belongs to the user
	entry, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: params.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to fetch planned entry")
	}

	// 2. Verify the transaction exists and belongs to the user
	tx, err := s.Repository.FetchTransactionByID(ctx, fetchTransactionByIDParams{
		TransactionID:  params.TransactionID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to fetch transaction")
	}

	// 3. First create/update the status as "matched"
	matchedAt := s.system.Time.Now().Format("2006-01-02T15:04:05Z")
	statusModel, err := s.Repository.UpsertPlannedEntryStatus(ctx, upsertPlannedEntryStatusParams{
		PlannedEntryID: params.PlannedEntryID,
		Month:          params.Month,
		Year:           params.Year,
		Status:         PlannedEntryStatusMatched,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to create status")
	}

	// 4. Update the status with transaction details
	statusModel, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
		StatusID:             statusModel.StatusID,
		MatchedTransactionID: &params.TransactionID,
		MatchedAmount:        &tx.Amount,
		MatchedAt:            &matchedAt,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to update status with match details")
	}

	// 5. Update the transaction with the category from the planned entry
	if entry.CategoryID > 0 {
		_, err = s.Repository.ModifyTransaction(ctx, modifyTransactionParams{
			TransactionID:  params.TransactionID,
			UserID:         params.UserID,
			OrganizationID: params.OrganizationID,
			CategoryID:     &entry.CategoryID,
		})
		if err != nil {
			s.logger.Warn(ctx, "failed to update transaction category",
				"transaction_id", params.TransactionID,
				"category_id", entry.CategoryID,
				"error", err.Error(),
			)
		}
	}

	return PlannedEntryStatus{}.FromModel(&statusModel), nil
}

type UnmatchPlannedEntryInput struct {
	PlannedEntryID int
	Month          int
	Year           int
	UserID         int
	OrganizationID int
}

// UnmatchPlannedEntry removes the link between a transaction and a planned entry
func (s *service) UnmatchPlannedEntry(ctx context.Context, params UnmatchPlannedEntryInput) error {
	// 1. Fetch the status
	status, err := s.Repository.FetchPlannedEntryStatus(ctx, fetchPlannedEntryStatusParams{
		PlannedEntryID: params.PlannedEntryID,
		Month:          params.Month,
		Year:           params.Year,
	})
	if err != nil {
		return errors.Wrap(err, "failed to fetch status")
	}

	// 2. Update status back to pending
	pendingStatus := PlannedEntryStatusPending
	_, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
		StatusID: status.StatusID,
		Status:   &pendingStatus,
	})
	if err != nil {
		return errors.Wrap(err, "failed to update status")
	}

	return nil
}

type DismissPlannedEntryInput struct {
	PlannedEntryID  int
	Month           int
	Year            int
	Reason          string
	UserID          int
	OrganizationID  int
}

// DismissPlannedEntry dismisses a planned entry for a specific month
func (s *service) DismissPlannedEntry(ctx context.Context, params DismissPlannedEntryInput) (PlannedEntryStatus, error) {
	// 1. Verify the planned entry exists and belongs to the user
	_, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: params.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to fetch planned entry")
	}

	// 2. Create/update the status as "dismissed"
	statusModel, err := s.Repository.UpsertPlannedEntryStatus(ctx, upsertPlannedEntryStatusParams{
		PlannedEntryID: params.PlannedEntryID,
		Month:          params.Month,
		Year:           params.Year,
		Status:         PlannedEntryStatusDismissed,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to create status")
	}

	// 3. Update with dismissal details
	dismissedAt := s.system.Time.Now().Format("2006-01-02T15:04:05Z")
	statusModel, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
		StatusID:        statusModel.StatusID,
		DismissedAt:     &dismissedAt,
		DismissalReason: &params.Reason,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to update status with dismissal details")
	}

	return PlannedEntryStatus{}.FromModel(&statusModel), nil
}

type UndismissPlannedEntryInput struct {
	PlannedEntryID int
	Month          int
	Year           int
	UserID         int
	OrganizationID int
}

// UndismissPlannedEntry reverts a dismissed planned entry back to pending
func (s *service) UndismissPlannedEntry(ctx context.Context, params UndismissPlannedEntryInput) (PlannedEntryStatus, error) {
	// 1. Fetch the status
	status, err := s.Repository.FetchPlannedEntryStatus(ctx, fetchPlannedEntryStatusParams{
		PlannedEntryID: params.PlannedEntryID,
		Month:          params.Month,
		Year:           params.Year,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to fetch status")
	}

	// 2. Update status back to pending
	pendingStatus := PlannedEntryStatusPending
	status, err = s.Repository.ModifyPlannedEntryStatus(ctx, modifyPlannedEntryStatusParams{
		StatusID: status.StatusID,
		Status:   &pendingStatus,
	})
	if err != nil {
		return PlannedEntryStatus{}, errors.Wrap(err, "failed to update status")
	}

	return PlannedEntryStatus{}.FromModel(&status), nil
}

type GetPlannedEntryForTransactionInput struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

// GetPlannedEntryForTransaction retrieves the planned entry linked to a transaction, if any.
// Returns nil if the transaction is not linked to any planned entry.
func (s *service) GetPlannedEntryForTransaction(ctx context.Context, params GetPlannedEntryForTransactionInput) (*PlannedEntryWithStatus, error) {
	// 1. Find the status that has this transaction as matched
	status, err := s.Repository.FetchPlannedEntryStatusByTransactionID(ctx, fetchPlannedEntryStatusByTransactionIDParams{
		TransactionID:  params.TransactionID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		// If not found, return nil (not an error, just no linked entry)
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, errors.Wrap(err, "failed to fetch planned entry status")
	}

	// 2. Fetch the planned entry itself
	entry, err := s.Repository.FetchPlannedEntryByID(ctx, fetchPlannedEntryByIDParams{
		PlannedEntryID: status.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch planned entry")
	}

	// 3. Convert matched_at timestamp if present
	var matchedAt *string
	if status.MatchedAt != nil {
		formatted := status.MatchedAt.Format("2006-01-02T15:04:05Z")
		matchedAt = &formatted
	}

	// 4. Build the result
	result := &PlannedEntryWithStatus{
		PlannedEntry:         PlannedEntry{}.FromModel(&entry),
		Status:               status.Status,
		StatusColor:          GetStatusColor(status.Status),
		MatchedAmount:        status.MatchedAmount,
		MatchedTransactionID: status.MatchedTransactionID,
		MatchedAt:            matchedAt,
	}

	return result, nil
}

// =============================================================================
// Amazon Sync
// =============================================================================

// SyncAmazonOrders matches Amazon orders with transactions and updates descriptions
func (s *service) SyncAmazonOrders(ctx context.Context, params SyncAmazonOrdersInput) (*SyncAmazonOrdersResult, error) {
	s.logger.Info(ctx, "Starting Amazon orders sync",
		"user_id", params.UserID,
		"organization_id", params.OrganizationID,
		"order_count", len(params.Orders),
		"month", params.Month,
		"year", params.Year,
	)

	// Fetch all transactions for the organization in the given month/year
	transactions, err := s.Repository.FetchTransactionsByMonth(ctx, fetchTransactionsByMonthParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Month:          params.Month,
		Year:           params.Year,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch transactions")
	}

	s.logger.Info(ctx, "Found transactions for matching",
		"transaction_count", len(transactions),
	)

	result := &SyncAmazonOrdersResult{
		TotalOrders:    len(params.Orders),
		MatchedOrders:  make([]AmazonMatchedOrder, 0),
		UnmatchedOrders: make([]AmazonUnmatchedOrder, 0),
	}

	// Track matched transaction IDs to avoid duplicates
	matchedTxIDs := make(map[int]bool)

	// For each Amazon order, find a matching transaction
	for _, order := range params.Orders {
		if order.ParsedTotal.IsZero() {
			result.UnmatchedOrders = append(result.UnmatchedOrders, AmazonUnmatchedOrder{
				OrderID:     order.OrderID,
				Amount:      order.ParsedTotal,
				Date:        order.DateString,
				Description: order.ItemDescription,
				Reason:      "Valor do pedido não disponível",
			})
			continue
		}

		// Parse order date if available
		var orderDate *time.Time
		if order.ParsedDate != nil && *order.ParsedDate != "" {
			if parsed, err := time.Parse("2006-01-02", *order.ParsedDate); err == nil {
				orderDate = &parsed
			}
		}

		// Find matching transaction by amount (with tolerance) and date (±2 days)
		var bestMatch *TransactionModel
		var bestMatchScore float64 = 0

		for i := range transactions {
			tx := &transactions[i]

			// Skip already matched transactions
			if matchedTxIDs[tx.TransactionID] {
				continue
			}

			// Calculate amount match score
			// Amazon orders are typically negative (purchases), so compare absolute values
			orderAmt := order.ParsedTotal.Abs()
			txAmt := tx.Amount.Abs()

			// Calculate percentage difference
			if orderAmt.IsZero() || txAmt.IsZero() {
				continue
			}

			diff := orderAmt.Sub(txAmt).Abs()
			percentDiff := diff.Div(orderAmt).InexactFloat64()

			// Allow 2% tolerance for rounding differences
			if percentDiff > 0.02 {
				continue
			}

			// Check date proximity (±5 days tolerance for credit card processing delays)
			var dateScore float64 = 0.3 // Default score if no date available
			if orderDate != nil {
				daysDiff := int(tx.TransactionDate.Sub(*orderDate).Hours() / 24)
				if daysDiff < 0 {
					daysDiff = -daysDiff
				}

				// Skip if more than 5 days apart
				if daysDiff > 5 {
					continue
				}

				// Score based on date proximity (0 days = 0.5, decreasing by 0.08 per day)
				dateScore = 0.5 - (float64(daysDiff) * 0.08)
			}

			// Score based on how close the amounts are (1.0 = exact match)
			score := 1.0 - percentDiff + dateScore

			// Prefer transactions with Amazon-related patterns in description
			desc := tx.Description
			if tx.OriginalDescription != nil {
				desc = *tx.OriginalDescription
			}
			isAmazonTx := containsIgnoreCase(desc, "amazon") ||
				containsIgnoreCase(desc, "amzn") ||
				containsIgnoreCase(desc, "mktplc") ||
				containsIgnoreCase(desc, "marketplace")
			if isAmazonTx {
				score += 0.5
			}

			if score > bestMatchScore {
				bestMatchScore = score
				bestMatch = tx
			}
		}

		if bestMatch != nil {
			// Build new description with Amazon order info
			newDesc := order.ItemDescription
			if order.OrderID != "" {
				newDesc = fmt.Sprintf("Amazon: %s (Pedido: %s)", order.ItemDescription, order.OrderID)
			} else if order.ItemDescription != "" {
				newDesc = fmt.Sprintf("Amazon: %s", order.ItemDescription)
			}

			// Update transaction description
			_, err := s.UpdateTransaction(ctx, UpdateTransactionInput{
				TransactionID:  bestMatch.TransactionID,
				UserID:         params.UserID,
				OrganizationID: params.OrganizationID,
				Description:    &newDesc,
			})
			if err != nil {
				s.logger.Warn(ctx, "Failed to update transaction",
					"transaction_id", bestMatch.TransactionID,
					"error", err.Error(),
				)
				result.UnmatchedOrders = append(result.UnmatchedOrders, AmazonUnmatchedOrder{
					OrderID:     order.OrderID,
					Amount:      order.ParsedTotal,
					Date:        order.DateString,
					Description: order.ItemDescription,
					Reason:      "Erro ao atualizar transação",
				})
				continue
			}

			// Track matched transaction
			matchedTxIDs[bestMatch.TransactionID] = true

			result.MatchedOrders = append(result.MatchedOrders, AmazonMatchedOrder{
				OrderID:           order.OrderID,
				TransactionID:     bestMatch.TransactionID,
				OriginalDesc:      bestMatch.Description,
				NewDescription:    newDesc,
				OrderAmount:       order.ParsedTotal,
				TransactionAmount: bestMatch.Amount,
			})
		} else {
			// Log why no match was found - find potential candidates
			reason := "Nenhuma transação correspondente encontrada"
			orderAmt := order.ParsedTotal.Abs()

			// Look for close matches to explain why they didn't match
			for _, tx := range transactions {
				if matchedTxIDs[tx.TransactionID] {
					continue
				}
				txAmt := tx.Amount.Abs()
				diff := orderAmt.Sub(txAmt).Abs()
				percentDiff := diff.Div(orderAmt).InexactFloat64() * 100

				desc := tx.Description
				if tx.OriginalDescription != nil {
					desc = *tx.OriginalDescription
				}

				isAmazonTx := containsIgnoreCase(desc, "amazon") ||
					containsIgnoreCase(desc, "amzn") ||
					containsIgnoreCase(desc, "mktplc") ||
					containsIgnoreCase(desc, "marketplace")

				if isAmazonTx {
					// This is an Amazon transaction that didn't match - explain why
					if orderDate != nil {
						daysDiff := int(tx.TransactionDate.Sub(*orderDate).Hours() / 24)
						if daysDiff < 0 {
							daysDiff = -daysDiff
						}
						if percentDiff <= 2 && daysDiff > 5 {
							reason = fmt.Sprintf("Valor OK (%.1f%% diff) mas data muito distante (%d dias): TX %s em %s",
								percentDiff, daysDiff, desc, tx.TransactionDate.Format("02/01"))
							break
						}
						if percentDiff > 2 && daysDiff <= 5 {
							reason = fmt.Sprintf("Data OK (%d dias) mas valor diferente (%.1f%%): TX R$%.2f vs Pedido R$%.2f",
								daysDiff, percentDiff, txAmt.InexactFloat64(), orderAmt.InexactFloat64())
							break
						}
						if percentDiff > 2 && daysDiff > 5 {
							reason = fmt.Sprintf("Candidato Amazon: %s - valor %.1f%% diff, %d dias diff",
								desc, percentDiff, daysDiff)
						}
					} else {
						if percentDiff <= 2 {
							reason = fmt.Sprintf("Valor OK mas sem data para comparar: TX %s", desc)
							break
						}
					}
				}
			}

			result.UnmatchedOrders = append(result.UnmatchedOrders, AmazonUnmatchedOrder{
				OrderID:     order.OrderID,
				Amount:      order.ParsedTotal,
				Date:        order.DateString,
				Description: order.ItemDescription,
				Reason:      reason,
			})
		}
	}

	result.MatchedCount = len(result.MatchedOrders)

	if result.MatchedCount > 0 {
		result.Message = fmt.Sprintf("Sincronizado! %d de %d pedidos correspondidos", result.MatchedCount, result.TotalOrders)
	} else {
		result.Message = "Nenhum pedido correspondido"
	}

	s.logger.Info(ctx, "Amazon sync completed",
		"matched", result.MatchedCount,
		"unmatched", len(result.UnmatchedOrders),
		"total", result.TotalOrders,
	)

	return result, nil
}

// containsIgnoreCase checks if s contains substr (case-insensitive)
func containsIgnoreCase(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

// ============================================================================
// Tags
// ============================================================================

type GetTagsInput struct {
	UserID         int
	OrganizationID int
}

func (s *service) GetTags(ctx context.Context, input GetTagsInput) ([]Tag, error) {
	models, err := s.Repository.FetchTags(ctx, fetchTagsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	return Tags{}.FromModel(models), nil
}

type GetTagByIDInput struct {
	TagID          int
	UserID         int
	OrganizationID int
}

func (s *service) GetTagByID(ctx context.Context, input GetTagByIDInput) (Tag, error) {
	model, err := s.Repository.FetchTagByID(ctx, fetchTagByIDParams{
		TagID:          input.TagID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return Tag{}, errors.Wrap(err, "failed to fetch tag")
	}

	return Tag{}.FromModel(&model), nil
}

type CreateTagInput struct {
	UserID         int
	OrganizationID int
	Name           string
	Icon           string
	Color          string
}

func (s *service) CreateTag(ctx context.Context, input CreateTagInput) (Tag, error) {
	// Validate required fields
	if input.Name == "" {
		return Tag{}, fmt.Errorf("name is required")
	}

	// Set defaults
	icon := input.Icon
	if icon == "" {
		icon = "🏷️"
	}
	color := input.Color
	if color == "" {
		color = "#6B7280"
	}

	model, err := s.Repository.InsertTag(ctx, insertTagParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Name:           input.Name,
		Icon:           icon,
		Color:          color,
	})
	if err != nil {
		return Tag{}, err
	}

	return Tag{}.FromModel(&model), nil
}

type UpdateTagInput struct {
	TagID          int
	UserID         int
	OrganizationID int
	Name           *string
	Icon           *string
	Color          *string
}

func (s *service) UpdateTag(ctx context.Context, input UpdateTagInput) (Tag, error) {
	model, err := s.Repository.ModifyTag(ctx, modifyTagParams{
		TagID:          input.TagID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Name:           input.Name,
		Icon:           input.Icon,
		Color:          input.Color,
	})
	if err != nil {
		return Tag{}, errors.Wrap(err, "failed to update tag")
	}

	return Tag{}.FromModel(&model), nil
}

type DeleteTagInput struct {
	TagID          int
	UserID         int
	OrganizationID int
}

func (s *service) DeleteTag(ctx context.Context, input DeleteTagInput) error {
	return s.Repository.RemoveTag(ctx, removeTagParams{
		TagID:          input.TagID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
}

// ============================================================================
// Transaction Tags
// ============================================================================

type GetTransactionTagsInput struct {
	TransactionID int
}

func (s *service) GetTransactionTags(ctx context.Context, input GetTransactionTagsInput) ([]Tag, error) {
	models, err := s.Repository.FetchTagsByTransactionID(ctx, fetchTagsByTransactionIDParams{
		TransactionID: input.TransactionID,
	})
	if err != nil {
		return nil, err
	}

	return Tags{}.FromModel(models), nil
}

type SetTransactionTagsInput struct {
	TransactionID int
	TagIDs        []int
}

func (s *service) SetTransactionTags(ctx context.Context, input SetTransactionTagsInput) error {
	return s.Repository.SetTransactionTags(ctx, setTransactionTagsParams{
		TransactionID: input.TransactionID,
		TagIDs:        input.TagIDs,
	})
}
