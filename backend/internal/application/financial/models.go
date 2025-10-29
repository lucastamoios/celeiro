package financial

import (
	"time"

	"github.com/lib/pq"
	"github.com/shopspring/decimal"
)

// Category represents a transaction category (system or user-defined)
type CategoryModel struct {
	CategoryID int       `db:"category_id"`
	CreatedAt  time.Time `db:"created_at"`
	UpdatedAt  time.Time `db:"updated_at"`

	Name     string `db:"name"`
	Icon     string `db:"icon"`
	IsSystem bool   `db:"is_system"`
	UserID   *int   `db:"user_id"` // NULL for system categories
}

type CategoriesModel []CategoryModel

// Account represents a bank account (checking, savings, credit card, etc.)
type AccountModel struct {
	AccountID      int       `db:"account_id"`
	CreatedAt      time.Time `db:"created_at"`
	UpdatedAt      time.Time `db:"updated_at"`

	UserID         int    `db:"user_id"`
	OrganizationID int    `db:"organization_id"`

	Name        string          `db:"name"`
	AccountType string          `db:"account_type"` // checking, savings, credit_card, investment
	BankName    string          `db:"bank_name"`

	Balance  decimal.Decimal `db:"balance"`
	Currency string          `db:"currency"`

	IsActive bool `db:"is_active"`
}

type AccountsModel []AccountModel

// Transaction represents a financial transaction
type TransactionModel struct {
	TransactionID int       `db:"transaction_id"`
	CreatedAt     time.Time `db:"created_at"`
	UpdatedAt     time.Time `db:"updated_at"`

	AccountID  int  `db:"account_id"`
	CategoryID *int `db:"category_id"` // NULL if not classified

	Description     string          `db:"description"`
	Amount          decimal.Decimal `db:"amount"`
	TransactionDate time.Time       `db:"transaction_date"`
	TransactionType string          `db:"transaction_type"` // debit, credit

	// OFX-specific fields
	OFXFitID      *string `db:"ofx_fitid"`
	OFXCheckNum   *string `db:"ofx_check_number"`
	OFXMemo       *string `db:"ofx_memo"`
	RawOFXData    *string `db:"raw_ofx_data"` // JSONB stored as string

	// Classification
	IsClassified          bool `db:"is_classified"`
	ClassificationRuleID  *int `db:"classification_rule_id"`

	// Metadata
	Notes *string        `db:"notes"`
	Tags  pq.StringArray `db:"tags"`
}

type TransactionsModel []TransactionModel

// Budget represents a monthly budget
type BudgetModel struct {
	BudgetID int       `db:"budget_id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`

	UserID         int `db:"user_id"`
	OrganizationID int `db:"organization_id"`

	Name  string `db:"name"`
	Month int    `db:"month"`
	Year  int    `db:"year"`

	BudgetType string          `db:"budget_type"` // fixed, calculated, hybrid
	Amount     decimal.Decimal `db:"amount"`

	IsActive bool `db:"is_active"`
}

type BudgetsModel []BudgetModel

// BudgetItem represents a category allocation within a budget
type BudgetItemModel struct {
	BudgetItemID int       `db:"budget_item_id"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`

	BudgetID   int `db:"budget_id"`
	CategoryID int `db:"category_id"`

	PlannedAmount decimal.Decimal `db:"planned_amount"`
}

type BudgetItemsModel []BudgetItemModel

// ClassificationRule represents an automatic transaction classification rule
type ClassificationRuleModel struct {
	RuleID    int       `db:"rule_id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`

	UserID     int `db:"user_id"`
	CategoryID int `db:"category_id"`

	Name     string `db:"name"`
	Priority int    `db:"priority"`

	// Match conditions (all optional, AND logic)
	MatchDescription    *string          `db:"match_description"`
	MatchAmountMin      *decimal.Decimal `db:"match_amount_min"`
	MatchAmountMax      *decimal.Decimal `db:"match_amount_max"`
	MatchTransactionType *string         `db:"match_transaction_type"` // debit, credit, or NULL

	IsActive bool `db:"is_active"`
}

type ClassificationRulesModel []ClassificationRuleModel

// BudgetType constants
const (
	BudgetTypeFixed      = "fixed"
	BudgetTypeCalculated = "calculated"
	BudgetTypeHybrid     = "hybrid"
)

// AccountType constants
const (
	AccountTypeChecking   = "checking"
	AccountTypeSavings    = "savings"
	AccountTypeCreditCard = "credit_card"
	AccountTypeInvestment = "investment"
)

// TransactionType constants
const (
	TransactionTypeDebit  = "debit"
	TransactionTypeCredit = "credit"
)
