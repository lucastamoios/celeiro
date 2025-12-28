package financial

import (
	"context"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/catrutech/celeiro/pkg/system"
	"github.com/shopspring/decimal"
)

type Repository interface {
	// Categories
	FetchCategories(ctx context.Context, params fetchCategoriesParams) ([]CategoryModel, error)
	FetchCategoryByID(ctx context.Context, params fetchCategoryByIDParams) (CategoryModel, error)
	InsertCategory(ctx context.Context, params insertCategoryParams) (CategoryModel, error)
	ModifyCategory(ctx context.Context, params modifyCategoryParams) (CategoryModel, error)
	RemoveCategory(ctx context.Context, params removeCategoryParams) error

	// Accounts
	FetchAccounts(ctx context.Context, params fetchAccountsParams) ([]AccountModel, error)
	FetchAccountByID(ctx context.Context, params fetchAccountByIDParams) (AccountModel, error)
	InsertAccount(ctx context.Context, params insertAccountParams) (AccountModel, error)
	ModifyAccount(ctx context.Context, params modifyAccountParams) (AccountModel, error)
	RemoveAccount(ctx context.Context, params removeAccountParams) error

	// Transactions
	FetchTransactions(ctx context.Context, params fetchTransactionsParams) ([]TransactionModel, error)
	FetchTransactionByID(ctx context.Context, params fetchTransactionByIDParams) (TransactionModel, error)
	FetchTransactionsByMonth(ctx context.Context, params fetchTransactionsByMonthParams) ([]TransactionModel, error)
	FetchUncategorizedTransactions(ctx context.Context, params fetchUncategorizedTransactionsParams) ([]TransactionModel, error)
	FetchTransactionsForPatternMatching(ctx context.Context, params fetchTransactionsForPatternMatchingParams) ([]TransactionModel, error)
	InsertTransaction(ctx context.Context, params insertTransactionParams) (TransactionModel, error)
	BulkInsertTransactions(ctx context.Context, params bulkInsertTransactionsParams) ([]TransactionModel, error)
	ModifyTransaction(ctx context.Context, params modifyTransactionParams) (TransactionModel, error)
	RemoveTransaction(ctx context.Context, params removeTransactionParams) error

	// Budgets
	FetchBudgets(ctx context.Context, params fetchBudgetsParams) ([]BudgetModel, error)
	FetchBudgetByID(ctx context.Context, params fetchBudgetByIDParams) (BudgetModel, error)
	InsertBudget(ctx context.Context, params insertBudgetParams) (BudgetModel, error)
	ModifyBudget(ctx context.Context, params modifyBudgetParams) (BudgetModel, error)
	RemoveBudget(ctx context.Context, params removeBudgetParams) error

	// Budget Items
	FetchBudgetItems(ctx context.Context, params fetchBudgetItemsParams) ([]BudgetItemModel, error)
	InsertBudgetItem(ctx context.Context, params insertBudgetItemParams) (BudgetItemModel, error)
	ModifyBudgetItem(ctx context.Context, params modifyBudgetItemParams) (BudgetItemModel, error)
	RemoveBudgetItem(ctx context.Context, params removeBudgetItemParams) error
	FetchBudgetSpending(ctx context.Context, params fetchBudgetSpendingParams) (map[int]decimal.Decimal, error)

	// Classification Rules
	FetchClassificationRules(ctx context.Context, params fetchClassificationRulesParams) ([]ClassificationRuleModel, error)
	FetchClassificationRuleByID(ctx context.Context, params fetchClassificationRuleByIDParams) (ClassificationRuleModel, error)
	InsertClassificationRule(ctx context.Context, params insertClassificationRuleParams) (ClassificationRuleModel, error)
	ModifyClassificationRule(ctx context.Context, params modifyClassificationRuleParams) (ClassificationRuleModel, error)
	RemoveClassificationRule(ctx context.Context, params removeClassificationRuleParams) error

	// Category Budgets
	FetchCategoryBudgets(ctx context.Context, params fetchCategoryBudgetsParams) ([]CategoryBudgetModel, error)
	FetchCategoryBudgetByID(ctx context.Context, params fetchCategoryBudgetByIDParams) (CategoryBudgetModel, error)
	InsertCategoryBudget(ctx context.Context, params insertCategoryBudgetParams) (CategoryBudgetModel, error)
	ModifyCategoryBudget(ctx context.Context, params modifyCategoryBudgetParams) (CategoryBudgetModel, error)
	RemoveCategoryBudget(ctx context.Context, params removeCategoryBudgetParams) error

	// Planned Entries
	FetchPlannedEntries(ctx context.Context, params fetchPlannedEntriesParams) ([]PlannedEntryModel, error)
	FetchPlannedEntryByID(ctx context.Context, params fetchPlannedEntryByIDParams) (PlannedEntryModel, error)
	FetchPlannedEntriesByParent(ctx context.Context, params fetchPlannedEntriesByParentParams) ([]PlannedEntryModel, error)
	FetchPlannedEntriesWithPattern(ctx context.Context, params fetchPlannedEntriesWithPatternParams) ([]PlannedEntryModel, error)
	InsertPlannedEntry(ctx context.Context, params insertPlannedEntryParams) (PlannedEntryModel, error)
	ModifyPlannedEntry(ctx context.Context, params modifyPlannedEntryParams) (PlannedEntryModel, error)
	RemovePlannedEntry(ctx context.Context, params removePlannedEntryParams) error

	// Planned Entry Statuses
	FetchPlannedEntryStatus(ctx context.Context, params fetchPlannedEntryStatusParams) (PlannedEntryStatusModel, error)
	FetchPlannedEntryStatusesByMonth(ctx context.Context, params fetchPlannedEntryStatusesByMonthParams) ([]PlannedEntryStatusModel, error)
	FetchPlannedEntryStatusByTransactionID(ctx context.Context, params fetchPlannedEntryStatusByTransactionIDParams) (PlannedEntryStatusModel, error)
	UpsertPlannedEntryStatus(ctx context.Context, params upsertPlannedEntryStatusParams) (PlannedEntryStatusModel, error)
	ModifyPlannedEntryStatus(ctx context.Context, params modifyPlannedEntryStatusParams) (PlannedEntryStatusModel, error)
	RemovePlannedEntryStatus(ctx context.Context, params removePlannedEntryStatusParams) error

	// Monthly Snapshots
	FetchMonthlySnapshots(ctx context.Context, params fetchMonthlySnapshotsParams) ([]MonthlySnapshotModel, error)
	FetchMonthlySnapshotByID(ctx context.Context, params fetchMonthlySnapshotByIDParams) (MonthlySnapshotModel, error)
	InsertMonthlySnapshot(ctx context.Context, params insertMonthlySnapshotParams) (MonthlySnapshotModel, error)

	// Advanced Patterns
	FetchAdvancedPatterns(ctx context.Context, params fetchAdvancedPatternsParams) ([]AdvancedPatternModel, error)
	FetchAdvancedPatternByID(ctx context.Context, params fetchAdvancedPatternByIDParams) (AdvancedPatternModel, error)
	InsertAdvancedPattern(ctx context.Context, params insertAdvancedPatternParams) (AdvancedPatternModel, error)
	ModifyAdvancedPattern(ctx context.Context, params modifyAdvancedPatternParams) (AdvancedPatternModel, error)
	RemoveAdvancedPattern(ctx context.Context, params removeAdvancedPatternParams) error
	FetchPlannedEntriesByPatternIDs(ctx context.Context, params fetchPlannedEntriesByPatternIDsParams) ([]PlannedEntryByPatternModel, error)
}

type repository struct {
	db     database.Database
	system *system.System
}

func NewRepository(db database.Database) Repository {
	return &repository{
		db:     db,
		system: system.NewSystem(),
	}
}

func NewWithSystem(db database.Database, sys *system.System) Repository {
	return &repository{
		db:     db,
		system: sys,
	}
}

// ============================================================================
// Categories
// ============================================================================

type fetchCategoriesParams struct {
	UserID *int  // NULL fetches system categories
	IncludeSystem bool
}

const fetchCategoriesQuery = `
	-- financial.fetchCategoriesQuery
	SELECT
		category_id,
		created_at,
		updated_at,
		name,
		icon,
		color,
		is_system,
		user_id
	FROM categories
	WHERE (user_id = $1 OR (is_system = true AND $2 = true))
	ORDER BY is_system DESC, name ASC;
`

func (r *repository) FetchCategories(ctx context.Context, params fetchCategoriesParams) ([]CategoryModel, error) {
	var result []CategoryModel
	err := r.db.Query(ctx, &result, fetchCategoriesQuery, params.UserID, params.IncludeSystem)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchCategoryByIDParams struct {
	CategoryID int
	UserID     int
}

const fetchCategoryByIDQuery = `
	-- financial.fetchCategoryByIDQuery
	SELECT
		category_id,
		created_at,
		updated_at,
		name,
		icon,
		color,
		is_system,
		user_id
	FROM categories
	WHERE category_id = $1
		AND (user_id = $2 OR is_system = true);
`

func (r *repository) FetchCategoryByID(ctx context.Context, params fetchCategoryByIDParams) (CategoryModel, error) {
	var result CategoryModel
	err := r.db.Query(ctx, &result, fetchCategoryByIDQuery, params.CategoryID, params.UserID)
	if err != nil {
		return CategoryModel{}, err
	}
	return result, nil
}

type insertCategoryParams struct {
	Name   string
	Icon   string
	Color  string
	UserID int
}

const insertCategoryQuery = `
	-- financial.insertCategoryQuery
	INSERT INTO categories (name, icon, color, user_id)
	VALUES ($1, $2, $3, $4)
	RETURNING category_id, created_at, updated_at, name, icon, color, is_system, user_id;
`

func (r *repository) InsertCategory(ctx context.Context, params insertCategoryParams) (CategoryModel, error) {
	var result CategoryModel
	err := r.db.Query(ctx, &result, insertCategoryQuery, params.Name, params.Icon, params.Color, params.UserID)
	if err != nil {
		return CategoryModel{}, err
	}
	return result, nil
}

type modifyCategoryParams struct {
	CategoryID int
	UserID     int
	Name       *string
	Icon       *string
	Color      *string
}

const modifyCategoryQuery = `
	-- financial.modifyCategoryQuery
	UPDATE categories
	SET name = COALESCE($3, name),
		icon = COALESCE($4, icon),
		color = COALESCE($5, color),
		updated_at = NOW()
	WHERE category_id = $1 AND user_id = $2 AND is_system = false
	RETURNING category_id, created_at, updated_at, name, icon, color, is_system, user_id;
`

func (r *repository) ModifyCategory(ctx context.Context, params modifyCategoryParams) (CategoryModel, error) {
	var result CategoryModel
	err := r.db.Query(ctx, &result, modifyCategoryQuery, params.CategoryID, params.UserID, params.Name, params.Icon, params.Color)
	if err != nil {
		return CategoryModel{}, err
	}
	return result, nil
}

type removeCategoryParams struct {
	CategoryID int
	UserID     int
}

const removeCategoryQuery = `
	-- financial.removeCategoryQuery
	DELETE FROM categories
	WHERE category_id = $1 AND user_id = $2 AND is_system = false;
`

func (r *repository) RemoveCategory(ctx context.Context, params removeCategoryParams) error {
	err := r.db.Run(ctx, removeCategoryQuery, params.CategoryID, params.UserID)
	return err
}

// ============================================================================
// Accounts
// ============================================================================

type fetchAccountsParams struct {
	UserID         int
	OrganizationID int
	IsActive       *bool // NULL fetches all
}

const fetchAccountsQuery = `
	-- financial.fetchAccountsQuery
	SELECT
		account_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		name,
		account_type,
		bank_name,
		balance,
		currency,
		is_active
	FROM accounts
	WHERE user_id = $1
		AND organization_id = $2
		AND (is_active = $3 OR $3 IS NULL)
	ORDER BY created_at DESC;
`

func (r *repository) FetchAccounts(ctx context.Context, params fetchAccountsParams) ([]AccountModel, error) {
	var result []AccountModel
	err := r.db.Query(ctx, &result, fetchAccountsQuery, params.UserID, params.OrganizationID, params.IsActive)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchAccountByIDParams struct {
	AccountID      int
	UserID         int
	OrganizationID int
}

const fetchAccountByIDQuery = `
	-- financial.fetchAccountByIDQuery
	SELECT
		account_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		name,
		account_type,
		bank_name,
		balance,
		currency,
		is_active
	FROM accounts
	WHERE account_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchAccountByID(ctx context.Context, params fetchAccountByIDParams) (AccountModel, error) {
	var result AccountModel
	err := r.db.Query(ctx, &result, fetchAccountByIDQuery, params.AccountID, params.UserID, params.OrganizationID)
	if err != nil {
		return AccountModel{}, err
	}
	return result, nil
}

type insertAccountParams struct {
	UserID         int
	OrganizationID int
	Name           string
	AccountType    string
	BankName       string
	Balance        decimal.Decimal
	Currency       string
}

const insertAccountQuery = `
	-- financial.insertAccountQuery
	INSERT INTO accounts (user_id, organization_id, name, account_type, bank_name, balance, currency)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING account_id, created_at, updated_at, user_id, organization_id, name, account_type,
			  bank_name, balance, currency, is_active;
`

func (r *repository) InsertAccount(ctx context.Context, params insertAccountParams) (AccountModel, error) {
	var result AccountModel
	err := r.db.Query(ctx, &result, insertAccountQuery,
		params.UserID, params.OrganizationID, params.Name, params.AccountType,
		params.BankName, params.Balance, params.Currency)
	if err != nil {
		return AccountModel{}, err
	}
	return result, nil
}

type modifyAccountParams struct {
	AccountID      int
	UserID         int
	OrganizationID int
	Name           *string
	BankName       *string
	Balance        *decimal.Decimal
	IsActive       *bool
}

const modifyAccountQuery = `
	-- financial.modifyAccountQuery
	UPDATE accounts
	SET name = COALESCE($4, name),
		bank_name = COALESCE($5, bank_name),
		balance = COALESCE($6, balance),
		is_active = COALESCE($7, is_active),
		updated_at = NOW()
	WHERE account_id = $1 AND user_id = $2 AND organization_id = $3
	RETURNING account_id, created_at, updated_at, user_id, organization_id, name, account_type,
			  bank_name, balance, currency, is_active;
`

func (r *repository) ModifyAccount(ctx context.Context, params modifyAccountParams) (AccountModel, error) {
	var result AccountModel
	err := r.db.Query(ctx, &result, modifyAccountQuery,
		params.AccountID, params.UserID, params.OrganizationID,
		params.Name, params.BankName, params.Balance, params.IsActive)
	if err != nil {
		return AccountModel{}, err
	}
	return result, nil
}

type removeAccountParams struct {
	AccountID      int
	UserID         int
	OrganizationID int
}

const removeAccountQuery = `
	-- financial.removeAccountQuery
	DELETE FROM accounts
	WHERE account_id = $1 AND user_id = $2 AND organization_id = $3;
`

func (r *repository) RemoveAccount(ctx context.Context, params removeAccountParams) error {
	err := r.db.Run(ctx, removeAccountQuery, params.AccountID, params.UserID, params.OrganizationID)
	return err
}

// ============================================================================
// Transactions
// ============================================================================

type fetchTransactionsParams struct {
	AccountID      int
	UserID         int
	OrganizationID int
	Limit          int
	Offset         int
}

const fetchTransactionsQuery = `
	-- financial.fetchTransactionsQuery
	SELECT
		t.transaction_id,
		t.created_at,
		t.updated_at,
		t.account_id,
		t.category_id,
		t.description,
		t.original_description,
		t.amount,
		t.transaction_date,
		t.transaction_type,
		t.ofx_fitid,
		t.ofx_check_number,
		t.ofx_memo,
		t.raw_ofx_data,
		t.is_classified,
		t.classification_rule_id,
		t.is_ignored,
		t.notes,
		t.tags
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE t.account_id = $1
		AND a.user_id = $2
		AND a.organization_id = $3
	ORDER BY t.transaction_date DESC, t.created_at DESC
	LIMIT $4 OFFSET $5;
`

func (r *repository) FetchTransactions(ctx context.Context, params fetchTransactionsParams) ([]TransactionModel, error) {
	var result []TransactionModel
	err := r.db.Query(ctx, &result, fetchTransactionsQuery,
		params.AccountID, params.UserID, params.OrganizationID, params.Limit, params.Offset)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchTransactionByIDParams struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

const fetchTransactionByIDQuery = `
	-- financial.fetchTransactionByIDQuery
	SELECT
		t.transaction_id,
		t.created_at,
		t.updated_at,
		t.account_id,
		t.category_id,
		t.description,
		t.original_description,
		t.amount,
		t.transaction_date,
		t.transaction_type,
		t.ofx_fitid,
		t.ofx_check_number,
		t.ofx_memo,
		t.raw_ofx_data,
		t.is_classified,
		t.classification_rule_id,
		t.is_ignored,
		t.notes,
		t.tags
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE t.transaction_id = $1
		AND a.user_id = $2
		AND a.organization_id = $3;
`

func (r *repository) FetchTransactionByID(ctx context.Context, params fetchTransactionByIDParams) (TransactionModel, error) {
	var result TransactionModel
	err := r.db.Query(ctx, &result, fetchTransactionByIDQuery, params.TransactionID, params.UserID, params.OrganizationID)
	if err != nil {
		return TransactionModel{}, err
	}
	return result, nil
}

// FetchUncategorizedTransactions fetches all transactions without a category for a user/organization
// Used for retroactive pattern application
type fetchUncategorizedTransactionsParams struct {
	UserID         int
	OrganizationID int
}

const fetchUncategorizedTransactionsQuery = `
	-- financial.fetchUncategorizedTransactionsQuery
	SELECT
		t.transaction_id,
		t.created_at,
		t.updated_at,
		t.account_id,
		t.category_id,
		t.description,
		t.original_description,
		t.amount,
		t.transaction_date,
		t.transaction_type,
		t.ofx_fitid,
		t.ofx_check_number,
		t.ofx_memo,
		t.raw_ofx_data,
		t.is_classified,
		t.classification_rule_id,
		t.is_ignored,
		t.notes,
		t.tags
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE a.user_id = $1
		AND a.organization_id = $2
		AND t.category_id IS NULL
		AND t.is_ignored = FALSE
	ORDER BY t.transaction_date DESC;
`

func (r *repository) FetchUncategorizedTransactions(ctx context.Context, params fetchUncategorizedTransactionsParams) ([]TransactionModel, error) {
	var result []TransactionModel
	err := r.db.Query(ctx, &result, fetchUncategorizedTransactionsQuery, params.UserID, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// FetchTransactionsForPatternMatching fetches all transactions for pattern matching (including already categorized ones)
// Used for retroactive pattern application when user wants to re-apply patterns to all transactions
type fetchTransactionsForPatternMatchingParams struct {
	UserID         int
	OrganizationID int
}

const fetchTransactionsForPatternMatchingQuery = `
	-- financial.fetchTransactionsForPatternMatchingQuery
	SELECT
		t.transaction_id,
		t.created_at,
		t.updated_at,
		t.account_id,
		t.category_id,
		t.description,
		t.original_description,
		t.amount,
		t.transaction_date,
		t.transaction_type,
		t.ofx_fitid,
		t.ofx_check_number,
		t.ofx_memo,
		t.raw_ofx_data,
		t.is_classified,
		t.classification_rule_id,
		t.is_ignored,
		t.notes,
		t.tags
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE a.user_id = $1
		AND a.organization_id = $2
		AND t.is_ignored = FALSE
	ORDER BY t.transaction_date DESC;
`

func (r *repository) FetchTransactionsForPatternMatching(ctx context.Context, params fetchTransactionsForPatternMatchingParams) ([]TransactionModel, error) {
	var result []TransactionModel
	err := r.db.Query(ctx, &result, fetchTransactionsForPatternMatchingQuery, params.UserID, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchTransactionsByMonthParams struct {
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

const fetchTransactionsByMonthQuery = `
	-- financial.fetchTransactionsByMonthQuery
	SELECT
		t.transaction_id,
		t.created_at,
		t.updated_at,
		t.account_id,
		t.category_id,
		t.description,
		t.original_description,
		t.amount,
		t.transaction_date,
		t.transaction_type,
		t.ofx_fitid,
		t.ofx_check_number,
		t.ofx_memo,
		t.raw_ofx_data,
		t.is_classified,
		t.classification_rule_id,
		t.is_ignored,
		t.notes,
		t.tags
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE a.user_id = $1
		AND a.organization_id = $2
		AND EXTRACT(MONTH FROM t.transaction_date) = $3
		AND EXTRACT(YEAR FROM t.transaction_date) = $4
	ORDER BY t.transaction_date ASC;
`

func (r *repository) FetchTransactionsByMonth(ctx context.Context, params fetchTransactionsByMonthParams) ([]TransactionModel, error) {
	var result []TransactionModel
	err := r.db.Query(ctx, &result, fetchTransactionsByMonthQuery,
		params.UserID, params.OrganizationID, params.Month, params.Year)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type insertTransactionParams struct {
	AccountID           int
	CategoryID          *int
	Description         string
	OriginalDescription string // Immutable OFX description for pattern matching
	Amount              decimal.Decimal
	TransactionDate     string // Will be parsed to time.Time
	TransactionType     string
	OFXFitID            *string
	OFXCheckNum         *string
	OFXMemo             *string
	RawOFXData          *string
}

const insertTransactionQuery = `
	-- financial.insertTransactionQuery
	INSERT INTO transactions (
		account_id, category_id, description, original_description, amount, transaction_date, transaction_type,
		ofx_fitid, ofx_check_number, ofx_memo, raw_ofx_data
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	ON CONFLICT (account_id, ofx_fitid) WHERE ofx_fitid IS NOT NULL
	DO UPDATE SET
		description = EXCLUDED.description,
		-- Note: original_description is NOT updated on conflict (immutable)
		amount = EXCLUDED.amount,
		transaction_date = EXCLUDED.transaction_date,
		transaction_type = EXCLUDED.transaction_type,
		ofx_check_number = EXCLUDED.ofx_check_number,
		ofx_memo = EXCLUDED.ofx_memo,
		raw_ofx_data = EXCLUDED.raw_ofx_data,
		updated_at = NOW()
	RETURNING transaction_id, created_at, updated_at, account_id, category_id, description, original_description, amount,
			  transaction_date, transaction_type, ofx_fitid, ofx_check_number, ofx_memo, raw_ofx_data,
			  is_classified, classification_rule_id, is_ignored, notes, tags;
`

func (r *repository) InsertTransaction(ctx context.Context, params insertTransactionParams) (TransactionModel, error) {
	var result TransactionModel
	err := r.db.Query(ctx, &result, insertTransactionQuery,
		params.AccountID, params.CategoryID, params.Description, params.OriginalDescription, params.Amount, params.TransactionDate,
		params.TransactionType, params.OFXFitID, params.OFXCheckNum, params.OFXMemo, params.RawOFXData)
	if err != nil {
		return TransactionModel{}, err
	}
	return result, nil
}

type bulkInsertTransactionsParams struct {
	Transactions []insertTransactionParams
}

// BulkInsertTransactions uses the same query as InsertTransaction but in a loop
// TODO: Optimize with UNNEST for true bulk insert if needed
func (r *repository) BulkInsertTransactions(ctx context.Context, params bulkInsertTransactionsParams) ([]TransactionModel, error) {
	var results []TransactionModel
	for _, tx := range params.Transactions {
		result, err := r.InsertTransaction(ctx, tx)
		if err != nil {
			// Continue on conflict (duplicate FITID), but fail on other errors
			continue
		}
		results = append(results, result)
	}
	return results, nil
}

type modifyTransactionParams struct {
	TransactionID  int
	UserID         int
	OrganizationID int
	CategoryID     *int
	Description    *string
	Amount         *decimal.Decimal
	Notes          *string
	IsIgnored      *bool
}

const modifyTransactionQuery = `
	-- financial.modifyTransactionQuery
	UPDATE transactions t
	SET category_id = COALESCE($4, t.category_id),
		description = COALESCE($5, t.description),
		-- Preserve original_description on first edit (if it's NULL, copy current description)
		original_description = COALESCE(t.original_description, t.description),
		amount = COALESCE($6, t.amount),
		notes = COALESCE($7, t.notes),
		is_ignored = COALESCE($8, t.is_ignored),
		updated_at = NOW()
	FROM accounts a
	WHERE t.transaction_id = $1
		AND t.account_id = a.account_id
		AND a.user_id = $2
		AND a.organization_id = $3
	RETURNING t.transaction_id, t.created_at, t.updated_at, t.account_id, t.category_id, t.description,
			  t.original_description, t.amount, t.transaction_date, t.transaction_type, t.ofx_fitid, 
			  t.ofx_check_number, t.ofx_memo, t.raw_ofx_data, t.is_classified, t.classification_rule_id, 
			  t.is_ignored, t.notes, t.tags;
`

func (r *repository) ModifyTransaction(ctx context.Context, params modifyTransactionParams) (TransactionModel, error) {
	var result TransactionModel
	err := r.db.Query(ctx, &result, modifyTransactionQuery,
		params.TransactionID, params.UserID, params.OrganizationID,
		params.CategoryID, params.Description, params.Amount, params.Notes, params.IsIgnored)
	if err != nil {
		return TransactionModel{}, err
	}
	return result, nil
}

type removeTransactionParams struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

const removeTransactionQuery = `
	-- financial.removeTransactionQuery
	DELETE FROM transactions t
	USING accounts a
	WHERE t.transaction_id = $1
		AND t.account_id = a.account_id
		AND a.user_id = $2
		AND a.organization_id = $3;
`

func (r *repository) RemoveTransaction(ctx context.Context, params removeTransactionParams) error {
	err := r.db.Run(ctx, removeTransactionQuery, params.TransactionID, params.UserID, params.OrganizationID)
	return err
}

// ============================================================================
// Budgets
// ============================================================================

type fetchBudgetsParams struct {
	UserID         int
	OrganizationID int
	Year           *int
	Month          *int
}

const fetchBudgetsQuery = `
	-- financial.fetchBudgetsQuery
	SELECT
		budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		name,
		month,
		year,
		budget_type,
		amount,
		is_active
	FROM budgets
	WHERE user_id = $1
		AND organization_id = $2
		AND (year = $3 OR $3 IS NULL)
		AND (month = $4 OR $4 IS NULL)
	ORDER BY year DESC, month DESC;
`

func (r *repository) FetchBudgets(ctx context.Context, params fetchBudgetsParams) ([]BudgetModel, error) {
	var result []BudgetModel
	err := r.db.Query(ctx, &result, fetchBudgetsQuery,
		params.UserID, params.OrganizationID, params.Year, params.Month)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchBudgetByIDParams struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

const fetchBudgetByIDQuery = `
	-- financial.fetchBudgetByIDQuery
	SELECT
		budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		name,
		month,
		year,
		budget_type,
		amount,
		is_active
	FROM budgets
	WHERE budget_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchBudgetByID(ctx context.Context, params fetchBudgetByIDParams) (BudgetModel, error) {
	var result BudgetModel
	err := r.db.Query(ctx, &result, fetchBudgetByIDQuery, params.BudgetID, params.UserID, params.OrganizationID)
	if err != nil {
		return BudgetModel{}, err
	}
	return result, nil
}

type insertBudgetParams struct {
	UserID         int
	OrganizationID int
	Name           string
	Month          int
	Year           int
	BudgetType     string
	Amount         decimal.Decimal
}

const insertBudgetQuery = `
	-- financial.insertBudgetQuery
	INSERT INTO budgets (user_id, organization_id, name, month, year, budget_type, amount)
	VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING budget_id, created_at, updated_at, user_id, organization_id, name, month, year,
			  budget_type, amount, is_active;
`

func (r *repository) InsertBudget(ctx context.Context, params insertBudgetParams) (BudgetModel, error) {
	var result BudgetModel
	err := r.db.Query(ctx, &result, insertBudgetQuery,
		params.UserID, params.OrganizationID, params.Name, params.Month, params.Year,
		params.BudgetType, params.Amount)
	if err != nil {
		return BudgetModel{}, err
	}
	return result, nil
}

type modifyBudgetParams struct {
	BudgetID       int
	UserID         int
	OrganizationID int
	Name           *string
	BudgetType     *string
	Amount         *decimal.Decimal
	IsActive       *bool
}

const modifyBudgetQuery = `
	-- financial.modifyBudgetQuery
	UPDATE budgets
	SET name = COALESCE($4, name),
		budget_type = COALESCE($5, budget_type),
		amount = COALESCE($6, amount),
		is_active = COALESCE($7, is_active),
		updated_at = NOW()
	WHERE budget_id = $1 AND user_id = $2 AND organization_id = $3
	RETURNING budget_id, created_at, updated_at, user_id, organization_id, name, month, year,
			  budget_type, amount, is_active;
`

func (r *repository) ModifyBudget(ctx context.Context, params modifyBudgetParams) (BudgetModel, error) {
	var result BudgetModel
	err := r.db.Query(ctx, &result, modifyBudgetQuery,
		params.BudgetID, params.UserID, params.OrganizationID,
		params.Name, params.BudgetType, params.Amount, params.IsActive)
	if err != nil {
		return BudgetModel{}, err
	}
	return result, nil
}

type removeBudgetParams struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

const removeBudgetQuery = `
	-- financial.removeBudgetQuery
	DELETE FROM budgets
	WHERE budget_id = $1 AND user_id = $2 AND organization_id = $3;
`

func (r *repository) RemoveBudget(ctx context.Context, params removeBudgetParams) error {
	err := r.db.Run(ctx, removeBudgetQuery, params.BudgetID, params.UserID, params.OrganizationID)
	return err
}

// ============================================================================
// Budget Items
// ============================================================================

type fetchBudgetItemsParams struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

const fetchBudgetItemsQuery = `
	-- financial.fetchBudgetItemsQuery
	SELECT
		bi.budget_item_id,
		bi.created_at,
		bi.updated_at,
		bi.budget_id,
		bi.category_id,
		bi.planned_amount
	FROM budget_items bi
	INNER JOIN budgets b ON b.budget_id = bi.budget_id
	WHERE bi.budget_id = $1
		AND b.user_id = $2
		AND b.organization_id = $3;
`

func (r *repository) FetchBudgetItems(ctx context.Context, params fetchBudgetItemsParams) ([]BudgetItemModel, error) {
	var result []BudgetItemModel
	err := r.db.Query(ctx, &result, fetchBudgetItemsQuery, params.BudgetID, params.UserID, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type insertBudgetItemParams struct {
	BudgetID      int
	CategoryID    int
	PlannedAmount decimal.Decimal
}

const insertBudgetItemQuery = `
	-- financial.insertBudgetItemQuery
	INSERT INTO budget_items (budget_id, category_id, planned_amount)
	VALUES ($1, $2, $3)
	RETURNING budget_item_id, created_at, updated_at, budget_id, category_id, planned_amount;
`

func (r *repository) InsertBudgetItem(ctx context.Context, params insertBudgetItemParams) (BudgetItemModel, error) {
	var result BudgetItemModel
	err := r.db.Query(ctx, &result, insertBudgetItemQuery, params.BudgetID, params.CategoryID, params.PlannedAmount)
	if err != nil {
		return BudgetItemModel{}, err
	}
	return result, nil
}

type modifyBudgetItemParams struct {
	BudgetItemID  int
	UserID        int
	PlannedAmount *decimal.Decimal
}

const modifyBudgetItemQuery = `
	-- financial.modifyBudgetItemQuery
	UPDATE budget_items bi
	SET planned_amount = COALESCE($3, bi.planned_amount),
		updated_at = NOW()
	FROM budgets b
	WHERE bi.budget_item_id = $1
		AND bi.budget_id = b.budget_id
		AND b.user_id = $2
	RETURNING bi.budget_item_id, bi.created_at, bi.updated_at, bi.budget_id, bi.category_id, bi.planned_amount;
`

func (r *repository) ModifyBudgetItem(ctx context.Context, params modifyBudgetItemParams) (BudgetItemModel, error) {
	var result BudgetItemModel
	err := r.db.Query(ctx, &result, modifyBudgetItemQuery, params.BudgetItemID, params.UserID, params.PlannedAmount)
	if err != nil {
		return BudgetItemModel{}, err
	}
	return result, nil
}

type removeBudgetItemParams struct {
	BudgetItemID int
	UserID       int
}

const removeBudgetItemQuery = `
	-- financial.removeBudgetItemQuery
	DELETE FROM budget_items bi
	USING budgets b
	WHERE bi.budget_item_id = $1
		AND bi.budget_id = b.budget_id
		AND b.user_id = $2;
`

func (r *repository) RemoveBudgetItem(ctx context.Context, params removeBudgetItemParams) error {
	err := r.db.Run(ctx, removeBudgetItemQuery, params.BudgetItemID, params.UserID)
	return err
}

// ============================================================================
// Classification Rules
// ============================================================================

type fetchClassificationRulesParams struct {
	UserID   int
	IsActive *bool
}

const fetchClassificationRulesQuery = `
	-- financial.fetchClassificationRulesQuery
	SELECT
		rule_id,
		created_at,
		updated_at,
		user_id,
		category_id,
		name,
		priority,
		match_description,
		match_amount_min,
		match_amount_max,
		match_transaction_type,
		is_active
	FROM classification_rules
	WHERE user_id = $1
		AND (is_active = $2 OR $2 IS NULL)
	ORDER BY priority ASC, created_at ASC;
`

func (r *repository) FetchClassificationRules(ctx context.Context, params fetchClassificationRulesParams) ([]ClassificationRuleModel, error) {
	var result []ClassificationRuleModel
	err := r.db.Query(ctx, &result, fetchClassificationRulesQuery, params.UserID, params.IsActive)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchClassificationRuleByIDParams struct {
	RuleID int
	UserID int
}

const fetchClassificationRuleByIDQuery = `
	-- financial.fetchClassificationRuleByIDQuery
	SELECT
		rule_id,
		created_at,
		updated_at,
		user_id,
		category_id,
		name,
		priority,
		match_description,
		match_amount_min,
		match_amount_max,
		match_transaction_type,
		is_active
	FROM classification_rules
	WHERE rule_id = $1 AND user_id = $2;
`

func (r *repository) FetchClassificationRuleByID(ctx context.Context, params fetchClassificationRuleByIDParams) (ClassificationRuleModel, error) {
	var result ClassificationRuleModel
	err := r.db.Query(ctx, &result, fetchClassificationRuleByIDQuery, params.RuleID, params.UserID)
	if err != nil {
		return ClassificationRuleModel{}, err
	}
	return result, nil
}

type insertClassificationRuleParams struct {
	UserID               int
	CategoryID           int
	Name                 string
	Priority             int
	MatchDescription     *string
	MatchAmountMin       *decimal.Decimal
	MatchAmountMax       *decimal.Decimal
	MatchTransactionType *string
}

const insertClassificationRuleQuery = `
	-- financial.insertClassificationRuleQuery
	INSERT INTO classification_rules (
		user_id, category_id, name, priority, match_description,
		match_amount_min, match_amount_max, match_transaction_type
	)
	VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	RETURNING rule_id, created_at, updated_at, user_id, category_id, name, priority,
			  match_description, match_amount_min, match_amount_max, match_transaction_type, is_active;
`

func (r *repository) InsertClassificationRule(ctx context.Context, params insertClassificationRuleParams) (ClassificationRuleModel, error) {
	var result ClassificationRuleModel
	err := r.db.Query(ctx, &result, insertClassificationRuleQuery,
		params.UserID, params.CategoryID, params.Name, params.Priority,
		params.MatchDescription, params.MatchAmountMin, params.MatchAmountMax, params.MatchTransactionType)
	if err != nil {
		return ClassificationRuleModel{}, err
	}
	return result, nil
}

type modifyClassificationRuleParams struct {
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

const modifyClassificationRuleQuery = `
	-- financial.modifyClassificationRuleQuery
	UPDATE classification_rules
	SET category_id = COALESCE($3, category_id),
		name = COALESCE($4, name),
		priority = COALESCE($5, priority),
		match_description = COALESCE($6, match_description),
		match_amount_min = COALESCE($7, match_amount_min),
		match_amount_max = COALESCE($8, match_amount_max),
		match_transaction_type = COALESCE($9, match_transaction_type),
		is_active = COALESCE($10, is_active),
		updated_at = NOW()
	WHERE rule_id = $1 AND user_id = $2
	RETURNING rule_id, created_at, updated_at, user_id, category_id, name, priority,
			  match_description, match_amount_min, match_amount_max, match_transaction_type, is_active;
`

func (r *repository) ModifyClassificationRule(ctx context.Context, params modifyClassificationRuleParams) (ClassificationRuleModel, error) {
	var result ClassificationRuleModel
	err := r.db.Query(ctx, &result, modifyClassificationRuleQuery,
		params.RuleID, params.UserID, params.CategoryID, params.Name, params.Priority,
		params.MatchDescription, params.MatchAmountMin, params.MatchAmountMax,
		params.MatchTransactionType, params.IsActive)
	if err != nil {
		return ClassificationRuleModel{}, err
	}
	return result, nil
}

type removeClassificationRuleParams struct {
	RuleID int
	UserID int
}

const removeClassificationRuleQuery = `
	-- financial.removeClassificationRuleQuery
	DELETE FROM classification_rules
	WHERE rule_id = $1 AND user_id = $2;
`

func (r *repository) RemoveClassificationRule(ctx context.Context, params removeClassificationRuleParams) error {
	err := r.db.Run(ctx, removeClassificationRuleQuery, params.RuleID, params.UserID)
	return err
}

// ============================================================================
// Budget Spending Aggregation
// ============================================================================

type fetchBudgetSpendingParams struct {
	BudgetID       int
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

type CategorySpendingResult struct {
	CategoryID int             `db:"category_id"`
	TotalSpent decimal.Decimal `db:"total_spent"`
}

const fetchBudgetSpendingQuery = `
	-- financial.fetchBudgetSpendingQuery
	SELECT
		t.category_id,
		COALESCE(SUM(ABS(t.amount)), 0) as total_spent
	FROM transactions t
	INNER JOIN accounts a ON a.account_id = t.account_id
	WHERE a.user_id = $1
		AND a.organization_id = $2
		AND t.category_id IS NOT NULL
		AND EXTRACT(MONTH FROM t.transaction_date) = $3
		AND EXTRACT(YEAR FROM t.transaction_date) = $4
		AND t.transaction_type = 'debit'
		AND t.is_ignored = false
	GROUP BY t.category_id;
`

func (r *repository) FetchBudgetSpending(ctx context.Context, params fetchBudgetSpendingParams) (map[int]decimal.Decimal, error) {
	var results []CategorySpendingResult
	err := r.db.Query(ctx, &results, fetchBudgetSpendingQuery,
		params.UserID, params.OrganizationID, params.Month, params.Year)
	if err != nil {
		return nil, err
	}

	// Convert to map
	spendingMap := make(map[int]decimal.Decimal)
	for _, result := range results {
		spendingMap[result.CategoryID] = result.TotalSpent
	}

	return spendingMap, nil
}

// ============================================================================
// Category Budgets
// ============================================================================

type fetchCategoryBudgetsParams struct {
	UserID         int
	OrganizationID int
	Month          *int
	Year           *int
	CategoryID     *int
}

const fetchCategoryBudgetsQuery = `
	-- financial.fetchCategoryBudgetsQuery
	SELECT
		category_budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		budget_type,
		planned_amount,
		is_consolidated,
		consolidated_at
	FROM category_budgets
	WHERE user_id = $1
		AND organization_id = $2
		AND ($3::int IS NULL OR month = $3)
		AND ($4::int IS NULL OR year = $4)
		AND ($5::int IS NULL OR category_id = $5)
	ORDER BY year DESC, month DESC, category_id ASC;
`

func (r *repository) FetchCategoryBudgets(ctx context.Context, params fetchCategoryBudgetsParams) ([]CategoryBudgetModel, error) {
	var budgets []CategoryBudgetModel
	err := r.db.Query(ctx, &budgets, fetchCategoryBudgetsQuery,
		params.UserID, params.OrganizationID, params.Month, params.Year, params.CategoryID)
	return budgets, err
}

type fetchCategoryBudgetByIDParams struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
}

const fetchCategoryBudgetByIDQuery = `
	-- financial.fetchCategoryBudgetByIDQuery
	SELECT
		category_budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		budget_type,
		planned_amount,
		is_consolidated,
		consolidated_at
	FROM category_budgets
	WHERE category_budget_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchCategoryBudgetByID(ctx context.Context, params fetchCategoryBudgetByIDParams) (CategoryBudgetModel, error) {
	var budget CategoryBudgetModel
	err := r.db.Query(ctx, &budget, fetchCategoryBudgetByIDQuery,
		params.CategoryBudgetID, params.UserID, params.OrganizationID)
	return budget, err
}

type insertCategoryBudgetParams struct {
	UserID         int
	OrganizationID int
	CategoryID     int
	Month          int
	Year           int
	BudgetType     string
	PlannedAmount  decimal.Decimal
}

const insertCategoryBudgetQuery = `
	-- financial.insertCategoryBudgetQuery
	INSERT INTO category_budgets (
		user_id,
		organization_id,
		category_id,
		month,
		year,
		budget_type,
		planned_amount
	) VALUES ($1, $2, $3, $4, $5, $6, $7)
	RETURNING
		category_budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		budget_type,
		planned_amount,
		is_consolidated,
		consolidated_at;
`

func (r *repository) InsertCategoryBudget(ctx context.Context, params insertCategoryBudgetParams) (CategoryBudgetModel, error) {
	var budget CategoryBudgetModel
	err := r.db.Query(ctx, &budget, insertCategoryBudgetQuery,
		params.UserID, params.OrganizationID, params.CategoryID,
		params.Month, params.Year, params.BudgetType, params.PlannedAmount)
	return budget, err
}

type modifyCategoryBudgetParams struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
	BudgetType       *string
	PlannedAmount    *decimal.Decimal
	IsConsolidated   *bool
}

const modifyCategoryBudgetQuery = `
	-- financial.modifyCategoryBudgetQuery
	UPDATE category_budgets
	SET
		budget_type = COALESCE($4, budget_type),
		planned_amount = COALESCE($5, planned_amount),
		is_consolidated = COALESCE($6, is_consolidated),
		consolidated_at = CASE WHEN $6 = true AND is_consolidated = false THEN CURRENT_TIMESTAMP ELSE consolidated_at END,
		updated_at = CURRENT_TIMESTAMP
	WHERE category_budget_id = $1
		AND user_id = $2
		AND organization_id = $3
	RETURNING
		category_budget_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		budget_type,
		planned_amount,
		is_consolidated,
		consolidated_at;
`

func (r *repository) ModifyCategoryBudget(ctx context.Context, params modifyCategoryBudgetParams) (CategoryBudgetModel, error) {
	var budget CategoryBudgetModel
	err := r.db.Query(ctx, &budget, modifyCategoryBudgetQuery,
		params.CategoryBudgetID, params.UserID, params.OrganizationID,
		params.BudgetType, params.PlannedAmount, params.IsConsolidated)
	return budget, err
}

type removeCategoryBudgetParams struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
}

const removeCategoryBudgetQuery = `
	-- financial.removeCategoryBudgetQuery
	DELETE FROM category_budgets
	WHERE category_budget_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) RemoveCategoryBudget(ctx context.Context, params removeCategoryBudgetParams) error {
	return r.db.Run(ctx, removeCategoryBudgetQuery,
		params.CategoryBudgetID, params.UserID, params.OrganizationID)
}

// ============================================================================
// Planned Entries
// ============================================================================

type fetchPlannedEntriesParams struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
	IsRecurrent    *bool
	IsActive       *bool
}

const fetchPlannedEntriesQuery = `
	-- financial.fetchPlannedEntriesQuery
	SELECT
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active
	FROM planned_entries
	WHERE user_id = $1
		AND organization_id = $2
		AND ($3::int IS NULL OR category_id = $3)
		AND ($4::bool IS NULL OR is_recurrent = $4)
		AND ($5::bool IS NULL OR is_active = $5)
	ORDER BY created_at DESC;
`

func (r *repository) FetchPlannedEntries(ctx context.Context, params fetchPlannedEntriesParams) ([]PlannedEntryModel, error) {
	var entries []PlannedEntryModel
	err := r.db.Query(ctx, &entries, fetchPlannedEntriesQuery,
		params.UserID, params.OrganizationID, params.CategoryID,
		params.IsRecurrent, params.IsActive)
	return entries, err
}

type fetchPlannedEntryByIDParams struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
}

const fetchPlannedEntryByIDQuery = `
	-- financial.fetchPlannedEntryByIDQuery
	SELECT
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active
	FROM planned_entries
	WHERE planned_entry_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchPlannedEntryByID(ctx context.Context, params fetchPlannedEntryByIDParams) (PlannedEntryModel, error) {
	var entry PlannedEntryModel
	err := r.db.Query(ctx, &entry, fetchPlannedEntryByIDQuery,
		params.PlannedEntryID, params.UserID, params.OrganizationID)
	return entry, err
}

type fetchPlannedEntriesByParentParams struct {
	ParentEntryID  int
	UserID         int
	OrganizationID int
}

const fetchPlannedEntriesByParentQuery = `
	-- financial.fetchPlannedEntriesByParentQuery
	SELECT
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active
	FROM planned_entries
	WHERE parent_entry_id = $1
		AND user_id = $2
		AND organization_id = $3
	ORDER BY expected_day_start ASC, expected_day ASC;
`

func (r *repository) FetchPlannedEntriesByParent(ctx context.Context, params fetchPlannedEntriesByParentParams) ([]PlannedEntryModel, error) {
	var entries []PlannedEntryModel
	err := r.db.Query(ctx, &entries, fetchPlannedEntriesByParentQuery,
		params.ParentEntryID, params.UserID, params.OrganizationID)
	return entries, err
}

type insertPlannedEntryParams struct {
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

const insertPlannedEntryQuery = `
	-- financial.insertPlannedEntryQuery
	INSERT INTO planned_entries (
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	RETURNING
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active;
`

func (r *repository) InsertPlannedEntry(ctx context.Context, params insertPlannedEntryParams) (PlannedEntryModel, error) {
	var entry PlannedEntryModel
	err := r.db.Query(ctx, &entry, insertPlannedEntryQuery,
		params.UserID, params.OrganizationID, params.CategoryID, params.PatternID,
		params.Description, params.Amount, params.AmountMin, params.AmountMax,
		params.ExpectedDayStart, params.ExpectedDayEnd, params.ExpectedDay,
		params.EntryType, params.IsRecurrent, params.ParentEntryID)
	return entry, err
}

type modifyPlannedEntryParams struct {
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

const modifyPlannedEntryQuery = `
	-- financial.modifyPlannedEntryQuery
	UPDATE planned_entries
	SET
		pattern_id = COALESCE($4, pattern_id),
		description = COALESCE($5, description),
		amount = COALESCE($6, amount),
		amount_min = COALESCE($7, amount_min),
		amount_max = COALESCE($8, amount_max),
		expected_day_start = COALESCE($9, expected_day_start),
		expected_day_end = COALESCE($10, expected_day_end),
		expected_day = COALESCE($11, expected_day),
		entry_type = COALESCE($12, entry_type),
		is_active = COALESCE($13, is_active),
		updated_at = CURRENT_TIMESTAMP
	WHERE planned_entry_id = $1
		AND user_id = $2
		AND organization_id = $3
	RETURNING
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active;
`

func (r *repository) ModifyPlannedEntry(ctx context.Context, params modifyPlannedEntryParams) (PlannedEntryModel, error) {
	var entry PlannedEntryModel
	err := r.db.Query(ctx, &entry, modifyPlannedEntryQuery,
		params.PlannedEntryID, params.UserID, params.OrganizationID,
		params.PatternID, params.Description, params.Amount, params.AmountMin,
		params.AmountMax, params.ExpectedDayStart, params.ExpectedDayEnd,
		params.ExpectedDay, params.EntryType, params.IsActive)
	return entry, err
}

type removePlannedEntryParams struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
}

const removePlannedEntryQuery = `
	-- financial.removePlannedEntryQuery
	DELETE FROM planned_entries
	WHERE planned_entry_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) RemovePlannedEntry(ctx context.Context, params removePlannedEntryParams) error {
	return r.db.Run(ctx, removePlannedEntryQuery,
		params.PlannedEntryID, params.UserID, params.OrganizationID)
}

// ============================================================================
// Monthly Snapshots
// ============================================================================

type fetchMonthlySnapshotsParams struct {
	UserID         int
	OrganizationID int
	CategoryID     *int
	Month          *int
	Year           *int
}

const fetchMonthlySnapshotsQuery = `
	-- financial.fetchMonthlySnapshotsQuery
	SELECT
		snapshot_id,
		created_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		planned_amount,
		actual_amount,
		variance_percent,
		budget_type
	FROM monthly_snapshots
	WHERE user_id = $1
		AND organization_id = $2
		AND ($3::int IS NULL OR category_id = $3)
		AND ($4::int IS NULL OR month = $4)
		AND ($5::int IS NULL OR year = $5)
	ORDER BY year DESC, month DESC, category_id ASC;
`

func (r *repository) FetchMonthlySnapshots(ctx context.Context, params fetchMonthlySnapshotsParams) ([]MonthlySnapshotModel, error) {
	var snapshots []MonthlySnapshotModel
	err := r.db.Query(ctx, &snapshots, fetchMonthlySnapshotsQuery,
		params.UserID, params.OrganizationID, params.CategoryID, params.Month, params.Year)
	return snapshots, err
}

type fetchMonthlySnapshotByIDParams struct {
	SnapshotID     int
	UserID         int
	OrganizationID int
}

const fetchMonthlySnapshotByIDQuery = `
	-- financial.fetchMonthlySnapshotByIDQuery
	SELECT
		snapshot_id,
		created_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		planned_amount,
		actual_amount,
		variance_percent,
		budget_type
	FROM monthly_snapshots
	WHERE snapshot_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchMonthlySnapshotByID(ctx context.Context, params fetchMonthlySnapshotByIDParams) (MonthlySnapshotModel, error) {
	var snapshot MonthlySnapshotModel
	err := r.db.Query(ctx, &snapshot, fetchMonthlySnapshotByIDQuery,
		params.SnapshotID, params.UserID, params.OrganizationID)
	return snapshot, err
}

type insertMonthlySnapshotParams struct {
	UserID          int
	OrganizationID  int
	CategoryID      int
	Month           int
	Year            int
	PlannedAmount   decimal.Decimal
	ActualAmount    decimal.Decimal
	VariancePercent decimal.Decimal
	BudgetType      string
}

const insertMonthlySnapshotQuery = `
	-- financial.insertMonthlySnapshotQuery
	INSERT INTO monthly_snapshots (
		user_id,
		organization_id,
		category_id,
		month,
		year,
		planned_amount,
		actual_amount,
		variance_percent,
		budget_type
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	RETURNING
		snapshot_id,
		created_at,
		user_id,
		organization_id,
		category_id,
		month,
		year,
		planned_amount,
		actual_amount,
		variance_percent,
		budget_type;
`

func (r *repository) InsertMonthlySnapshot(ctx context.Context, params insertMonthlySnapshotParams) (MonthlySnapshotModel, error) {
	var snapshot MonthlySnapshotModel
	err := r.db.Query(ctx, &snapshot, insertMonthlySnapshotQuery,
		params.UserID, params.OrganizationID, params.CategoryID,
		params.Month, params.Year, params.PlannedAmount, params.ActualAmount,
		params.VariancePercent, params.BudgetType)
	return snapshot, err
}

// ============================================================================
// Advanced Patterns
// ============================================================================

type fetchAdvancedPatternsParams struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
	CategoryID     *int
}

const fetchAdvancedPatternsQuery = `
	-- financial.fetchAdvancedPatternsQuery
	SELECT
		pattern_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		description_pattern,
		date_pattern,
		weekday_pattern,
		amount_min,
		amount_max,
		target_description,
		target_category_id,
		apply_retroactively,
		is_active
	FROM patterns
	WHERE user_id = $1
		AND organization_id = $2
		AND ($3::boolean IS NULL OR is_active = $3)
		AND ($4::integer IS NULL OR target_category_id = $4)
	ORDER BY created_at DESC;
`

func (r *repository) FetchAdvancedPatterns(ctx context.Context, params fetchAdvancedPatternsParams) ([]AdvancedPatternModel, error) {
	var result []AdvancedPatternModel
	err := r.db.Query(ctx, &result, fetchAdvancedPatternsQuery,
		params.UserID, params.OrganizationID, params.IsActive, params.CategoryID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

type fetchAdvancedPatternByIDParams struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

const fetchAdvancedPatternByIDQuery = `
	-- financial.fetchAdvancedPatternByIDQuery
	SELECT
		pattern_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		description_pattern,
		date_pattern,
		weekday_pattern,
		amount_min,
		amount_max,
		target_description,
		target_category_id,
		apply_retroactively,
		is_active
	FROM patterns
	WHERE pattern_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) FetchAdvancedPatternByID(ctx context.Context, params fetchAdvancedPatternByIDParams) (AdvancedPatternModel, error) {
	var pattern AdvancedPatternModel
	err := r.db.Query(ctx, &pattern, fetchAdvancedPatternByIDQuery,
		params.PatternID, params.UserID, params.OrganizationID)
	return pattern, err
}

type insertAdvancedPatternParams struct {
	UserID             int
	OrganizationID     int
	DescriptionPattern *string
	DatePattern        *string
	WeekdayPattern     *string
	AmountMin          *decimal.Decimal
	AmountMax          *decimal.Decimal
	TargetDescription  string
	TargetCategoryID   int
	ApplyRetroactively bool
}

const insertAdvancedPatternQuery = `
	-- financial.insertAdvancedPatternQuery
	INSERT INTO patterns (
		user_id,
		organization_id,
		description_pattern,
		date_pattern,
		weekday_pattern,
		amount_min,
		amount_max,
		target_description,
		target_category_id,
		apply_retroactively
	) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	RETURNING
		pattern_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		description_pattern,
		date_pattern,
		weekday_pattern,
		amount_min,
		amount_max,
		target_description,
		target_category_id,
		apply_retroactively,
		is_active;
`

func (r *repository) InsertAdvancedPattern(ctx context.Context, params insertAdvancedPatternParams) (AdvancedPatternModel, error) {
	var pattern AdvancedPatternModel
	err := r.db.Query(ctx, &pattern, insertAdvancedPatternQuery,
		params.UserID, params.OrganizationID, params.DescriptionPattern,
		params.DatePattern, params.WeekdayPattern, params.AmountMin, params.AmountMax,
		params.TargetDescription, params.TargetCategoryID, params.ApplyRetroactively)
	return pattern, err
}

type modifyAdvancedPatternParams struct {
	PatternID          int
	UserID             int
	OrganizationID     int
	IsActive           *bool
	DescriptionPattern *string
	DatePattern        *string
	WeekdayPattern     *string
	AmountMin          *string
	AmountMax          *string
	TargetDescription  *string
	TargetCategoryID   *int
}

const modifyAdvancedPatternQuery = `
	-- financial.modifyAdvancedPatternQuery
	UPDATE patterns
	SET
		is_active = COALESCE($4, is_active),
		description_pattern = COALESCE($5, description_pattern),
		date_pattern = COALESCE($6, date_pattern),
		weekday_pattern = COALESCE($7, weekday_pattern),
		amount_min = COALESCE($8, amount_min),
		amount_max = COALESCE($9, amount_max),
		target_description = COALESCE($10, target_description),
		target_category_id = COALESCE($11, target_category_id),
		updated_at = CURRENT_TIMESTAMP
	WHERE pattern_id = $1
		AND user_id = $2
		AND organization_id = $3
	RETURNING
		pattern_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		description_pattern,
		date_pattern,
		weekday_pattern,
		amount_min,
		amount_max,
		target_description,
		target_category_id,
		apply_retroactively,
		is_active;
`

func (r *repository) ModifyAdvancedPattern(ctx context.Context, params modifyAdvancedPatternParams) (AdvancedPatternModel, error) {
	var pattern AdvancedPatternModel
	err := r.db.Query(ctx, &pattern, modifyAdvancedPatternQuery,
		params.PatternID, 
		params.UserID, 
		params.OrganizationID, 
		params.IsActive,
		params.DescriptionPattern,
		params.DatePattern,
		params.WeekdayPattern,
		params.AmountMin,
		params.AmountMax,
		params.TargetDescription,
		params.TargetCategoryID,
	)
	return pattern, err
}

type removeAdvancedPatternParams struct {
	PatternID      int
	UserID         int
	OrganizationID int
}

const removeAdvancedPatternQuery = `
	-- financial.removeAdvancedPatternQuery
	DELETE FROM patterns
	WHERE pattern_id = $1
		AND user_id = $2
		AND organization_id = $3;
`

func (r *repository) RemoveAdvancedPattern(ctx context.Context, params removeAdvancedPatternParams) error {
	var result struct{}
	err := r.db.Query(ctx, &result, removeAdvancedPatternQuery,
		params.PatternID, params.UserID, params.OrganizationID)
	return err
}

// FetchPlannedEntriesByPatternIDs fetches planned entries linked to the given pattern IDs
type fetchPlannedEntriesByPatternIDsParams struct {
	PatternIDs     []int
	UserID         int
	OrganizationID int
}

const fetchPlannedEntriesByPatternIDsQuery = `
	-- financial.fetchPlannedEntriesByPatternIDsQuery
	SELECT
		planned_entry_id,
		pattern_id,
		description
	FROM planned_entries
	WHERE pattern_id = ANY($1::int[])
		AND user_id = $2
		AND organization_id = $3
	ORDER BY description;
`

func (r *repository) FetchPlannedEntriesByPatternIDs(ctx context.Context, params fetchPlannedEntriesByPatternIDsParams) ([]PlannedEntryByPatternModel, error) {
	var result []PlannedEntryByPatternModel
	err := r.db.Query(ctx, &result, fetchPlannedEntriesByPatternIDsQuery,
		params.PatternIDs, params.UserID, params.OrganizationID)
	if err != nil {
		return nil, err
	}
	return result, nil
}

// ============================================================================
// Planned Entries With Pattern (for Entrada Planejada feature)
// ============================================================================

type fetchPlannedEntriesWithPatternParams struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
}

const fetchPlannedEntriesWithPatternQuery = `
	-- financial.fetchPlannedEntriesWithPatternQuery
	SELECT
		planned_entry_id,
		created_at,
		updated_at,
		user_id,
		organization_id,
		category_id,
		pattern_id,
		description,
		amount,
		amount_min,
		amount_max,
		expected_day_start,
		expected_day_end,
		expected_day,
		entry_type,
		is_recurrent,
		parent_entry_id,
		is_active
	FROM planned_entries
	WHERE user_id = $1
		AND organization_id = $2
		AND pattern_id IS NOT NULL
		AND ($3::bool IS NULL OR is_active = $3)
	ORDER BY entry_type ASC, description ASC;
`

func (r *repository) FetchPlannedEntriesWithPattern(ctx context.Context, params fetchPlannedEntriesWithPatternParams) ([]PlannedEntryModel, error) {
	var entries []PlannedEntryModel
	err := r.db.Query(ctx, &entries, fetchPlannedEntriesWithPatternQuery,
		params.UserID, params.OrganizationID, params.IsActive)
	return entries, err
}

// ============================================================================
// Planned Entry Statuses
// ============================================================================

type fetchPlannedEntryStatusParams struct {
	PlannedEntryID int
	Month          int
	Year           int
}

const fetchPlannedEntryStatusQuery = `
	-- financial.fetchPlannedEntryStatusQuery
	SELECT
		status_id,
		created_at,
		updated_at,
		planned_entry_id,
		month,
		year,
		status,
		matched_transaction_id,
		matched_amount,
		matched_at,
		dismissed_at,
		dismissal_reason
	FROM planned_entry_statuses
	WHERE planned_entry_id = $1
		AND month = $2
		AND year = $3;
`

func (r *repository) FetchPlannedEntryStatus(ctx context.Context, params fetchPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	var status PlannedEntryStatusModel
	err := r.db.Query(ctx, &status, fetchPlannedEntryStatusQuery,
		params.PlannedEntryID, params.Month, params.Year)
	return status, err
}

type fetchPlannedEntryStatusesByMonthParams struct {
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

const fetchPlannedEntryStatusesByMonthQuery = `
	-- financial.fetchPlannedEntryStatusesByMonthQuery
	SELECT
		pes.status_id,
		pes.created_at,
		pes.updated_at,
		pes.planned_entry_id,
		pes.month,
		pes.year,
		pes.status,
		pes.matched_transaction_id,
		pes.matched_amount,
		pes.matched_at,
		pes.dismissed_at,
		pes.dismissal_reason
	FROM planned_entry_statuses pes
	INNER JOIN planned_entries pe ON pe.planned_entry_id = pes.planned_entry_id
	WHERE pe.user_id = $1
		AND pe.organization_id = $2
		AND pes.month = $3
		AND pes.year = $4
	ORDER BY pe.entry_type ASC, pe.description ASC;
`

func (r *repository) FetchPlannedEntryStatusesByMonth(ctx context.Context, params fetchPlannedEntryStatusesByMonthParams) ([]PlannedEntryStatusModel, error) {
	var statuses []PlannedEntryStatusModel
	err := r.db.Query(ctx, &statuses, fetchPlannedEntryStatusesByMonthQuery,
		params.UserID, params.OrganizationID, params.Month, params.Year)
	return statuses, err
}

type fetchPlannedEntryStatusByTransactionIDParams struct {
	TransactionID  int
	UserID         int
	OrganizationID int
}

const fetchPlannedEntryStatusByTransactionIDQuery = `
	-- financial.fetchPlannedEntryStatusByTransactionIDQuery
	SELECT
		pes.status_id,
		pes.created_at,
		pes.updated_at,
		pes.planned_entry_id,
		pes.month,
		pes.year,
		pes.status,
		pes.matched_transaction_id,
		pes.matched_amount,
		pes.matched_at,
		pes.dismissed_at,
		pes.dismissal_reason
	FROM planned_entry_statuses pes
	INNER JOIN planned_entries pe ON pe.planned_entry_id = pes.planned_entry_id
	WHERE pes.matched_transaction_id = $1
		AND pe.user_id = $2
		AND pe.organization_id = $3
	LIMIT 1;
`

func (r *repository) FetchPlannedEntryStatusByTransactionID(ctx context.Context, params fetchPlannedEntryStatusByTransactionIDParams) (PlannedEntryStatusModel, error) {
	var status PlannedEntryStatusModel
	err := r.db.Query(ctx, &status, fetchPlannedEntryStatusByTransactionIDQuery,
		params.TransactionID, params.UserID, params.OrganizationID)
	return status, err
}

type upsertPlannedEntryStatusParams struct {
	PlannedEntryID int
	Month          int
	Year           int
	Status         string
}

const upsertPlannedEntryStatusQuery = `
	-- financial.upsertPlannedEntryStatusQuery
	INSERT INTO planned_entry_statuses (
		planned_entry_id,
		month,
		year,
		status
	) VALUES ($1, $2, $3, $4)
	ON CONFLICT (planned_entry_id, month, year)
	DO UPDATE SET
		status = EXCLUDED.status,
		updated_at = CURRENT_TIMESTAMP
	RETURNING
		status_id,
		created_at,
		updated_at,
		planned_entry_id,
		month,
		year,
		status,
		matched_transaction_id,
		matched_amount,
		matched_at,
		dismissed_at,
		dismissal_reason;
`

func (r *repository) UpsertPlannedEntryStatus(ctx context.Context, params upsertPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	var status PlannedEntryStatusModel
	err := r.db.Query(ctx, &status, upsertPlannedEntryStatusQuery,
		params.PlannedEntryID, params.Month, params.Year, params.Status)
	return status, err
}

type modifyPlannedEntryStatusParams struct {
	StatusID             int
	Status               *string
	MatchedTransactionID *int
	MatchedAmount        *decimal.Decimal
	MatchedAt            *string // Will be parsed as timestamp
	DismissedAt          *string // Will be parsed as timestamp
	DismissalReason      *string
}

const modifyPlannedEntryStatusQuery = `
	-- financial.modifyPlannedEntryStatusQuery
	UPDATE planned_entry_statuses
	SET
		status = COALESCE($2, status),
		matched_transaction_id = COALESCE($3, matched_transaction_id),
		matched_amount = COALESCE($4, matched_amount),
		matched_at = COALESCE($5::timestamp, matched_at),
		dismissed_at = COALESCE($6::timestamp, dismissed_at),
		dismissal_reason = COALESCE($7, dismissal_reason),
		updated_at = CURRENT_TIMESTAMP
	WHERE status_id = $1
	RETURNING
		status_id,
		created_at,
		updated_at,
		planned_entry_id,
		month,
		year,
		status,
		matched_transaction_id,
		matched_amount,
		matched_at,
		dismissed_at,
		dismissal_reason;
`

func (r *repository) ModifyPlannedEntryStatus(ctx context.Context, params modifyPlannedEntryStatusParams) (PlannedEntryStatusModel, error) {
	var status PlannedEntryStatusModel
	err := r.db.Query(ctx, &status, modifyPlannedEntryStatusQuery,
		params.StatusID, params.Status, params.MatchedTransactionID,
		params.MatchedAmount, params.MatchedAt, params.DismissedAt, params.DismissalReason)
	return status, err
}

type removePlannedEntryStatusParams struct {
	StatusID int
}

const removePlannedEntryStatusQuery = `
	-- financial.removePlannedEntryStatusQuery
	DELETE FROM planned_entry_statuses
	WHERE status_id = $1;
`

func (r *repository) RemovePlannedEntryStatus(ctx context.Context, params removePlannedEntryStatusParams) error {
	return r.db.Run(ctx, removePlannedEntryStatusQuery, params.StatusID)
}
