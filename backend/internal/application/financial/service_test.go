package financial

import (
	"context"
	"testing"

	"github.com/catrutech/celeiro/pkg/system"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRepository is a mock implementation of Repository for testing
type MockRepository struct {
	mock.Mock
}

// Categories
func (m *MockRepository) FetchCategories(ctx context.Context, params fetchCategoriesParams) ([]CategoryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]CategoryModel), args.Error(1)
}

func (m *MockRepository) FetchCategoryByID(ctx context.Context, params fetchCategoryByIDParams) (CategoryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryModel), args.Error(1)
}

func (m *MockRepository) InsertCategory(ctx context.Context, params insertCategoryParams) (CategoryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryModel), args.Error(1)
}

func (m *MockRepository) ModifyCategory(ctx context.Context, params modifyCategoryParams) (CategoryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryModel), args.Error(1)
}

func (m *MockRepository) RemoveCategory(ctx context.Context, params removeCategoryParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Accounts
func (m *MockRepository) FetchAccounts(ctx context.Context, params fetchAccountsParams) ([]AccountModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]AccountModel), args.Error(1)
}

func (m *MockRepository) FetchAccountByID(ctx context.Context, params fetchAccountByIDParams) (AccountModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AccountModel), args.Error(1)
}

func (m *MockRepository) InsertAccount(ctx context.Context, params insertAccountParams) (AccountModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AccountModel), args.Error(1)
}

func (m *MockRepository) ModifyAccount(ctx context.Context, params modifyAccountParams) (AccountModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AccountModel), args.Error(1)
}

func (m *MockRepository) RemoveAccount(ctx context.Context, params removeAccountParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Transactions
func (m *MockRepository) FetchTransactions(ctx context.Context, params fetchTransactionsParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

func (m *MockRepository) FetchTransactionByID(ctx context.Context, params fetchTransactionByIDParams) (TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TransactionModel), args.Error(1)
}

func (m *MockRepository) FetchTransactionsByMonth(ctx context.Context, params fetchTransactionsByMonthParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

func (m *MockRepository) InsertTransaction(ctx context.Context, params insertTransactionParams) (TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TransactionModel), args.Error(1)
}

func (m *MockRepository) BulkInsertTransactions(ctx context.Context, params bulkInsertTransactionsParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

func (m *MockRepository) ModifyTransaction(ctx context.Context, params modifyTransactionParams) (TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TransactionModel), args.Error(1)
}

func (m *MockRepository) RemoveTransaction(ctx context.Context, params removeTransactionParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockRepository) FetchTransactionsForPatternMatching(ctx context.Context, params fetchTransactionsForPatternMatchingParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

func (m *MockRepository) FetchUncategorizedTransactions(ctx context.Context, params fetchUncategorizedTransactionsParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

// Budgets
func (m *MockRepository) FetchBudgets(ctx context.Context, params fetchBudgetsParams) ([]BudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]BudgetModel), args.Error(1)
}

func (m *MockRepository) FetchBudgetByID(ctx context.Context, params fetchBudgetByIDParams) (BudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(BudgetModel), args.Error(1)
}

func (m *MockRepository) InsertBudget(ctx context.Context, params insertBudgetParams) (BudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(BudgetModel), args.Error(1)
}

func (m *MockRepository) ModifyBudget(ctx context.Context, params modifyBudgetParams) (BudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(BudgetModel), args.Error(1)
}

func (m *MockRepository) RemoveBudget(ctx context.Context, params removeBudgetParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Budget Items
func (m *MockRepository) FetchBudgetItems(ctx context.Context, params fetchBudgetItemsParams) ([]BudgetItemModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]BudgetItemModel), args.Error(1)
}

func (m *MockRepository) InsertBudgetItem(ctx context.Context, params insertBudgetItemParams) (BudgetItemModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(BudgetItemModel), args.Error(1)
}

func (m *MockRepository) ModifyBudgetItem(ctx context.Context, params modifyBudgetItemParams) (BudgetItemModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(BudgetItemModel), args.Error(1)
}

func (m *MockRepository) RemoveBudgetItem(ctx context.Context, params removeBudgetItemParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockRepository) FetchBudgetSpending(ctx context.Context, params fetchBudgetSpendingParams) (map[int]decimal.Decimal, error) {
	args := m.Called(ctx, params)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[int]decimal.Decimal), args.Error(1)
}

// Classification Rules
func (m *MockRepository) FetchClassificationRules(ctx context.Context, params fetchClassificationRulesParams) ([]ClassificationRuleModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]ClassificationRuleModel), args.Error(1)
}

func (m *MockRepository) FetchClassificationRuleByID(ctx context.Context, params fetchClassificationRuleByIDParams) (ClassificationRuleModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(ClassificationRuleModel), args.Error(1)
}

func (m *MockRepository) InsertClassificationRule(ctx context.Context, params insertClassificationRuleParams) (ClassificationRuleModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(ClassificationRuleModel), args.Error(1)
}

func (m *MockRepository) ModifyClassificationRule(ctx context.Context, params modifyClassificationRuleParams) (ClassificationRuleModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(ClassificationRuleModel), args.Error(1)
}

func (m *MockRepository) RemoveClassificationRule(ctx context.Context, params removeClassificationRuleParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Category Budgets
func (m *MockRepository) FetchCategoryBudgets(ctx context.Context, params fetchCategoryBudgetsParams) ([]CategoryBudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]CategoryBudgetModel), args.Error(1)
}

func (m *MockRepository) FetchCategoryBudgetByID(ctx context.Context, params fetchCategoryBudgetByIDParams) (CategoryBudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryBudgetModel), args.Error(1)
}

func (m *MockRepository) InsertCategoryBudget(ctx context.Context, params insertCategoryBudgetParams) (CategoryBudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryBudgetModel), args.Error(1)
}

func (m *MockRepository) ModifyCategoryBudget(ctx context.Context, params modifyCategoryBudgetParams) (CategoryBudgetModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(CategoryBudgetModel), args.Error(1)
}

func (m *MockRepository) RemoveCategoryBudget(ctx context.Context, params removeCategoryBudgetParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Planned Entries
func (m *MockRepository) FetchPlannedEntries(ctx context.Context, params fetchPlannedEntriesParams) ([]PlannedEntryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]PlannedEntryModel), args.Error(1)
}

func (m *MockRepository) FetchPlannedEntryByID(ctx context.Context, params fetchPlannedEntryByIDParams) (PlannedEntryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryModel), args.Error(1)
}

func (m *MockRepository) FetchPlannedEntriesByParent(ctx context.Context, params fetchPlannedEntriesByParentParams) ([]PlannedEntryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]PlannedEntryModel), args.Error(1)
}

func (m *MockRepository) InsertPlannedEntry(ctx context.Context, params insertPlannedEntryParams) (PlannedEntryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryModel), args.Error(1)
}

func (m *MockRepository) ModifyPlannedEntry(ctx context.Context, params modifyPlannedEntryParams) (PlannedEntryModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryModel), args.Error(1)
}

func (m *MockRepository) RemovePlannedEntry(ctx context.Context, params removePlannedEntryParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Planned Entry Statuses
func (m *MockRepository) FetchPlannedEntryStatus(ctx context.Context, params fetchPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryStatusModel), args.Error(1)
}

func (m *MockRepository) FetchPlannedEntryStatusesByMonth(ctx context.Context, params fetchPlannedEntryStatusesByMonthParams) ([]PlannedEntryStatusModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]PlannedEntryStatusModel), args.Error(1)
}

func (m *MockRepository) FetchPlannedEntryStatusByTransactionID(ctx context.Context, params fetchPlannedEntryStatusByTransactionIDParams) (PlannedEntryStatusModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryStatusModel), args.Error(1)
}

func (m *MockRepository) UpsertPlannedEntryStatus(ctx context.Context, params upsertPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryStatusModel), args.Error(1)
}

func (m *MockRepository) ModifyPlannedEntryStatus(ctx context.Context, params modifyPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(PlannedEntryStatusModel), args.Error(1)
}

func (m *MockRepository) RemovePlannedEntryStatus(ctx context.Context, params removePlannedEntryStatusParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Monthly Snapshots
func (m *MockRepository) FetchMonthlySnapshots(ctx context.Context, params fetchMonthlySnapshotsParams) ([]MonthlySnapshotModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]MonthlySnapshotModel), args.Error(1)
}

func (m *MockRepository) FetchMonthlySnapshotByID(ctx context.Context, params fetchMonthlySnapshotByIDParams) (MonthlySnapshotModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(MonthlySnapshotModel), args.Error(1)
}

func (m *MockRepository) InsertMonthlySnapshot(ctx context.Context, params insertMonthlySnapshotParams) (MonthlySnapshotModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(MonthlySnapshotModel), args.Error(1)
}

// Advanced Patterns
func (m *MockRepository) FetchAdvancedPatterns(ctx context.Context, params fetchAdvancedPatternsParams) ([]AdvancedPatternModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]AdvancedPatternModel), args.Error(1)
}

func (m *MockRepository) FetchAdvancedPatternByID(ctx context.Context, params fetchAdvancedPatternByIDParams) (AdvancedPatternModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AdvancedPatternModel), args.Error(1)
}

func (m *MockRepository) InsertAdvancedPattern(ctx context.Context, params insertAdvancedPatternParams) (AdvancedPatternModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AdvancedPatternModel), args.Error(1)
}

func (m *MockRepository) ModifyAdvancedPattern(ctx context.Context, params modifyAdvancedPatternParams) (AdvancedPatternModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(AdvancedPatternModel), args.Error(1)
}

func (m *MockRepository) RemoveAdvancedPattern(ctx context.Context, params removeAdvancedPatternParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockRepository) FetchPlannedEntriesByPatternIDs(ctx context.Context, params fetchPlannedEntriesByPatternIDsParams) ([]PlannedEntryByPatternModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]PlannedEntryByPatternModel), args.Error(1)
}

// Savings Goals
func (m *MockRepository) FetchSavingsGoals(ctx context.Context, params fetchSavingsGoalsParams) ([]SavingsGoalModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]SavingsGoalModel), args.Error(1)
}

func (m *MockRepository) FetchSavingsGoalByID(ctx context.Context, params fetchSavingsGoalByIDParams) (SavingsGoalModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(SavingsGoalModel), args.Error(1)
}

func (m *MockRepository) InsertSavingsGoal(ctx context.Context, params insertSavingsGoalParams) (SavingsGoalModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(SavingsGoalModel), args.Error(1)
}

func (m *MockRepository) ModifySavingsGoal(ctx context.Context, params modifySavingsGoalParams) (SavingsGoalModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(SavingsGoalModel), args.Error(1)
}

func (m *MockRepository) RemoveSavingsGoal(ctx context.Context, params removeSavingsGoalParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

func (m *MockRepository) AddContribution(ctx context.Context, params addContributionParams) (SavingsGoalModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(SavingsGoalModel), args.Error(1)
}

func (m *MockRepository) FetchGoalContributions(ctx context.Context, params fetchGoalContributionsParams) ([]TransactionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TransactionModel), args.Error(1)
}

func (m *MockRepository) FetchGoalMonthlyContributions(ctx context.Context, params fetchGoalMonthlyContributionsParams) ([]GoalMonthlyContributionModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]GoalMonthlyContributionModel), args.Error(1)
}

// Tags
func (m *MockRepository) FetchTags(ctx context.Context, params fetchTagsParams) ([]TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TagModel), args.Error(1)
}

func (m *MockRepository) FetchTagByID(ctx context.Context, params fetchTagByIDParams) (TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TagModel), args.Error(1)
}

func (m *MockRepository) InsertTag(ctx context.Context, params insertTagParams) (TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TagModel), args.Error(1)
}

func (m *MockRepository) ModifyTag(ctx context.Context, params modifyTagParams) (TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).(TagModel), args.Error(1)
}

func (m *MockRepository) RemoveTag(ctx context.Context, params removeTagParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Transaction Tags (junction table)
func (m *MockRepository) FetchTagsByTransactionID(ctx context.Context, params fetchTagsByTransactionIDParams) ([]TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TagModel), args.Error(1)
}

func (m *MockRepository) SetTransactionTags(ctx context.Context, params setTransactionTagsParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// Planned Entry Tags (junction table)
func (m *MockRepository) FetchTagsByPlannedEntryID(ctx context.Context, params fetchTagsByPlannedEntryIDParams) ([]TagModel, error) {
	args := m.Called(ctx, params)
	return args.Get(0).([]TagModel), args.Error(1)
}

func (m *MockRepository) SetPlannedEntryTags(ctx context.Context, params setPlannedEntryTagsParams) error {
	args := m.Called(ctx, params)
	return args.Error(0)
}

// ============================================================================
// Service Tests
// ============================================================================

func TestGetCategories_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()
	organizationID := 1

	expectedModels := []CategoryModel{
		{CategoryID: 1, Name: "Food", Icon: "🍔", IsSystem: true, OrganizationID: nil},
		{CategoryID: 2, Name: "Custom", Icon: "✨", IsSystem: false, OrganizationID: &organizationID},
	}

	mockRepo.On("FetchCategories", ctx, mock.MatchedBy(func(params fetchCategoriesParams) bool {
		return *params.OrganizationID == organizationID && params.IncludeSystem == true
	})).Return(expectedModels, nil)

	result, err := svc.GetCategories(ctx, GetCategoriesInput{
		OrganizationID: organizationID,
		IncludeSystem:  true,
	})

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, "Food", result[0].Name)
	assert.True(t, result[0].IsSystem)
	mockRepo.AssertExpectations(t)
}

func TestCreateAccount_Success(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()
	balance := decimal.NewFromFloat(1000.50)

	expectedModel := AccountModel{
		AccountID:      1,
		UserID:         1,
		OrganizationID: 1,
		Name:           "Checking Account",
		AccountType:    AccountTypeChecking,
		BankName:       "Test Bank",
		Balance:        balance,
		Currency:       "BRL",
		IsActive:       true,
	}

	mockRepo.On("InsertAccount", ctx, mock.MatchedBy(func(params insertAccountParams) bool {
		return params.Name == "Checking Account" &&
			params.AccountType == AccountTypeChecking &&
			params.Balance.Equal(balance)
	})).Return(expectedModel, nil)

	result, err := svc.CreateAccount(ctx, CreateAccountInput{
		UserID:         1,
		OrganizationID: 1,
		Name:           "Checking Account",
		AccountType:    AccountTypeChecking,
		BankName:       "Test Bank",
		Balance:        balance,
		Currency:       "BRL",
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.AccountID)
	assert.Equal(t, "Checking Account", result.Name)
	assert.True(t, result.Balance.Equal(balance))
	mockRepo.AssertExpectations(t)
}

func TestGetBudgetByID_Success(t *testing.T) {
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
		Name:           "Monthly Budget",
		Month:          10,
		Year:           2025,
		BudgetType:     BudgetTypeCalculated,
		Amount:         decimal.NewFromFloat(5000),
		IsActive:       true,
	}

	itemModels := []BudgetItemModel{
		{BudgetItemID: 1, BudgetID: 1, CategoryID: 1, PlannedAmount: decimal.NewFromFloat(2000)},
		{BudgetItemID: 2, BudgetID: 1, CategoryID: 2, PlannedAmount: decimal.NewFromFloat(1500)},
	}

	mockRepo.On("FetchBudgetByID", ctx, fetchBudgetByIDParams{
		BudgetID:       1,
		OrganizationID: 1,
	}).Return(budgetModel, nil)

	mockRepo.On("FetchBudgetItems", ctx, fetchBudgetItemsParams{
		BudgetID:       1,
		OrganizationID: 1,
	}).Return(itemModels, nil)

	result, err := svc.GetBudgetByID(ctx, GetBudgetByIDInput{
		BudgetID:       1,
		UserID:         1,
		OrganizationID: 1,
	})

	assert.NoError(t, err)
	assert.Equal(t, 1, result.BudgetID)
	assert.Len(t, result.Items, 2)

	// Test calculated budget amount
	calculatedAmount := result.CalculatedBudgetAmount()
	expectedAmount := decimal.NewFromFloat(3500) // 2000 + 1500
	assert.True(t, calculatedAmount.Equal(expectedAmount),
		"Expected %s, got %s", expectedAmount.String(), calculatedAmount.String())

	mockRepo.AssertExpectations(t)
}

func TestGetTransactions_DefaultLimit(t *testing.T) {
	mockRepo := new(MockRepository)
	svc := &service{
		metrics:    nil,
		Repository: mockRepo,
		system:     system.NewSystem(),
	}

	ctx := context.Background()
	expectedModels := []TransactionModel{}

	mockRepo.On("FetchTransactions", ctx, mock.MatchedBy(func(params fetchTransactionsParams) bool {
		// Should default to 100 if limit is 0
		return params.Limit == 100
	})).Return(expectedModels, nil)

	_, err := svc.GetTransactions(ctx, GetTransactionsInput{
		AccountID:      1,
		OrganizationID: 1,
		Limit:          0, // Should default to 100
		Offset:         0,
	})

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
