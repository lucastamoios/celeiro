package financial

import (
	"context"

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

	// Planned Entries
	GetPlannedEntries(ctx context.Context, params GetPlannedEntriesInput) ([]PlannedEntry, error)
	GetPlannedEntryByID(ctx context.Context, params GetPlannedEntryByIDInput) (PlannedEntry, error)
	GetSavedPatterns(ctx context.Context, params GetSavedPatternsInput) ([]PlannedEntry, error)
	CreatePlannedEntry(ctx context.Context, params CreatePlannedEntryInput) (PlannedEntry, error)
	UpdatePlannedEntry(ctx context.Context, params UpdatePlannedEntryInput) (PlannedEntry, error)
	DeletePlannedEntry(ctx context.Context, params DeletePlannedEntryInput) error
	GenerateMonthlyInstances(ctx context.Context, params GenerateMonthlyInstancesInput) ([]PlannedEntry, error)

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
	UserID int
	Name   string
	Icon   string
}

func (s *service) CreateCategory(ctx context.Context, params CreateCategoryInput) (Category, error) {
	model, err := s.Repository.InsertCategory(ctx, insertCategoryParams{
		UserID: params.UserID,
		Name:   params.Name,
		Icon:   params.Icon,
	})
	if err != nil {
		return Category{}, errors.Wrap(err, "failed to create category")
	}

	return Category{}.FromModel(&model), nil
}

type UpdateCategoryInput struct {
	CategoryID int
	UserID     int
	Name       *string
	Icon       *string
}

func (s *service) UpdateCategory(ctx context.Context, params UpdateCategoryInput) (Category, error) {
	model, err := s.Repository.ModifyCategory(ctx, modifyCategoryParams{
		CategoryID: params.CategoryID,
		UserID:     params.UserID,
		Name:       params.Name,
		Icon:       params.Icon,
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

type GetTransactionByIDInput struct {
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
	CategoryID      *int
	Description     string
	Amount          decimal.Decimal
	TransactionDate string
	TransactionType string
	Notes           string
}

func (s *service) CreateTransaction(ctx context.Context, params CreateTransactionInput) (Transaction, error) {
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

// ============================================================================
// Planned Entries
// ============================================================================

type GetPlannedEntriesInput struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
	IsRecurrent    *bool
	IsSavedPattern *bool
	IsActive       *bool
}

func (s *service) GetPlannedEntries(ctx context.Context, params GetPlannedEntriesInput) ([]PlannedEntry, error) {
	models, err := s.Repository.FetchPlannedEntries(ctx, fetchPlannedEntriesParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		IsRecurrent:    params.IsRecurrent,
		IsSavedPattern: params.IsSavedPattern,
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

func (s *service) GetSavedPatterns(ctx context.Context, params GetSavedPatternsInput) ([]PlannedEntry, error) {
	models, err := s.Repository.FetchSavedPatterns(ctx, fetchSavedPatternsParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
	})
	if err != nil {
		return nil, errors.Wrap(err, "failed to fetch saved patterns")
	}

	return PlannedEntries{}.FromModel(models), nil
}

type CreatePlannedEntryInput struct {
	UserID         int
	OrganizationID int
	CategoryID     int
	Description    string
	Amount         decimal.Decimal
	IsRecurrent    bool
	ParentEntryID  *int
	ExpectedDay    *int
	IsSavedPattern bool
}

func (s *service) CreatePlannedEntry(ctx context.Context, params CreatePlannedEntryInput) (PlannedEntry, error) {
	model, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		CategoryID:     params.CategoryID,
		Description:    params.Description,
		Amount:         params.Amount,
		IsRecurrent:    params.IsRecurrent,
		ParentEntryID:  params.ParentEntryID,
		ExpectedDay:    params.ExpectedDay,
		IsSavedPattern: params.IsSavedPattern,
	})
	if err != nil {
		return PlannedEntry{}, errors.Wrap(err, "failed to create planned entry")
	}

	return PlannedEntry{}.FromModel(&model), nil
}

type UpdatePlannedEntryInput struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
	Description    *string
	Amount         *decimal.Decimal
	ExpectedDay    *int
	IsActive       *bool
}

func (s *service) UpdatePlannedEntry(ctx context.Context, params UpdatePlannedEntryInput) (PlannedEntry, error) {
	model, err := s.Repository.ModifyPlannedEntry(ctx, modifyPlannedEntryParams{
		PlannedEntryID: params.PlannedEntryID,
		UserID:         params.UserID,
		OrganizationID: params.OrganizationID,
		Description:    params.Description,
		Amount:         params.Amount,
		ExpectedDay:    params.ExpectedDay,
		IsActive:       params.IsActive,
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
		IsSavedPattern: false,
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
