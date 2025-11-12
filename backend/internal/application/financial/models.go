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

	// Status
	IsIgnored bool `db:"is_ignored"`

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
	BudgetTypeMaior      = "maior"
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

// CategoryBudget represents a category-centric monthly budget
type CategoryBudgetModel struct {
	CategoryBudgetID int       `db:"category_budget_id"`
	CreatedAt        time.Time `db:"created_at"`
	UpdatedAt        time.Time `db:"updated_at"`

	UserID         int `db:"user_id"`
	OrganizationID int `db:"organization_id"`
	CategoryID     int `db:"category_id"`

	Month int `db:"month"`
	Year  int `db:"year"`

	BudgetType     string          `db:"budget_type"` // fixed, calculated, maior
	PlannedAmount  decimal.Decimal `db:"planned_amount"`

	IsConsolidated bool       `db:"is_consolidated"`
	ConsolidatedAt *time.Time `db:"consolidated_at"`
}

type CategoryBudgetsModel []CategoryBudgetModel

// PlannedEntry represents a planned transaction (recurrent or one-time)
type PlannedEntryModel struct {
	PlannedEntryID int       `db:"planned_entry_id"`
	CreatedAt      time.Time `db:"created_at"`
	UpdatedAt      time.Time `db:"updated_at"`

	UserID         int `db:"user_id"`
	OrganizationID int `db:"organization_id"`
	CategoryID     int `db:"category_id"`

	Description string          `db:"description"`
	Amount      decimal.Decimal `db:"amount"`

	IsRecurrent    bool  `db:"is_recurrent"`
	ParentEntryID  *int  `db:"parent_entry_id"`
	ExpectedDay    *int  `db:"expected_day"`

	IsActive       bool `db:"is_active"`
	IsSavedPattern bool `db:"is_saved_pattern"`
}

type PlannedEntriesModel []PlannedEntryModel

// MonthlySnapshot represents historical budget vs actual data
type MonthlySnapshotModel struct {
	SnapshotID int       `db:"snapshot_id"`
	CreatedAt  time.Time `db:"created_at"`

	UserID         int `db:"user_id"`
	OrganizationID int `db:"organization_id"`
	CategoryID     int `db:"category_id"`

	Month int `db:"month"`
	Year  int `db:"year"`

	PlannedAmount   decimal.Decimal `db:"planned_amount"`
	ActualAmount    decimal.Decimal `db:"actual_amount"`
	VariancePercent decimal.Decimal `db:"variance_percent"`
	BudgetType      string          `db:"budget_type"`
}

type MonthlySnapshotsModel []MonthlySnapshotModel

// AdvancedPattern represents a regex-based transaction matching pattern
type AdvancedPatternModel struct {
	PatternID  int       `db:"pattern_id"`
	CreatedAt  time.Time `db:"created_at"`
	UpdatedAt  time.Time `db:"updated_at"`

	UserID         int `db:"user_id"`
	OrganizationID int `db:"organization_id"`

	// Pattern matching rules
	DescriptionPattern *string          `db:"description_pattern"`
	DatePattern        *string          `db:"date_pattern"`
	WeekdayPattern     *string          `db:"weekday_pattern"`
	AmountMin          *decimal.Decimal `db:"amount_min"`
	AmountMax          *decimal.Decimal `db:"amount_max"`

	// Target mapping
	TargetDescription string `db:"target_description"`
	TargetCategoryID  int    `db:"target_category_id"`

	// Behavior
	ApplyRetroactively bool `db:"apply_retroactively"`
	IsActive           bool `db:"is_active"`
}

type AdvancedPatternsModel []AdvancedPatternModel

// Transaction Matching Constants
const (
	// Matching weights (must sum to 1.0)
	MatchWeightCategory    = 0.40 // 40% weight for category match
	MatchWeightAmount      = 0.30 // 30% weight for amount match
	MatchWeightDescription = 0.20 // 20% weight for description match
	MatchWeightDate        = 0.10 // 10% weight for date match

	// Confidence thresholds
	MatchConfidenceHigh   = 0.70 // Auto-apply matches above this
	MatchConfidenceMedium = 0.50 // Suggest matches above this
	MatchConfidenceLow    = 0.50 // Ignore matches below this

	// Matching tolerances
	MatchAmountTolerance = 0.05  // ±5% amount tolerance
	MatchDateProximity   = 3     // Days within for full date score
	MatchMinScore        = 0.50  // Minimum score to return
)

// MatchScore represents the calculated match between a transaction and a pattern
type MatchScore struct {
	// Pattern being matched against
	PatternID   int
	Description string
	Amount      decimal.Decimal
	CategoryID  int

	// Component scores (0.0 - 1.0)
	CategoryScore    float64
	AmountScore      float64
	DescriptionScore float64
	DateScore        float64

	// Overall weighted score (0.0 - 1.0)
	TotalScore float64

	// Confidence level based on total score
	Confidence string // "HIGH", "MEDIUM", "LOW"
}

// MatchConfidence returns the confidence level based on score
func (m *MatchScore) MatchConfidence() string {
	if m.TotalScore >= MatchConfidenceHigh {
		return "HIGH"
	} else if m.TotalScore >= MatchConfidenceMedium {
		return "MEDIUM"
	}
	return "LOW"
}
