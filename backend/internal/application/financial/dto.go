package financial

import (
	"time"

	"github.com/shopspring/decimal"
)

// Category DTO
type Category struct {
	CategoryID int       `json:"category_id"`
	Name       string    `json:"name"`
	Icon       string    `json:"icon"`
	Color      string    `json:"color"`
	IsSystem   bool      `json:"is_system"`
	UserID     *int      `json:"user_id,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

func (c Category) FromModel(model *CategoryModel) Category {
	return Category{
		CategoryID: model.CategoryID,
		Name:       model.Name,
		Icon:       model.Icon,
		Color:      model.Color,
		IsSystem:   model.IsSystem,
		UserID:     model.UserID,
		CreatedAt:  model.CreatedAt,
		UpdatedAt:  model.UpdatedAt,
	}
}

type Categories []Category

func (c Categories) FromModel(models []CategoryModel) Categories {
	categories := make(Categories, len(models))
	for i, model := range models {
		categories[i] = Category{}.FromModel(&model)
	}
	return categories
}

// Account DTO
type Account struct {
	AccountID      int
	UserID         int
	OrganizationID int
	Name           string
	AccountType    string
	BankName       string
	Balance        decimal.Decimal
	Currency       string
	IsActive       bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (a Account) FromModel(model *AccountModel) Account {
	return Account{
		AccountID:      model.AccountID,
		UserID:         model.UserID,
		OrganizationID: model.OrganizationID,
		Name:           model.Name,
		AccountType:    model.AccountType,
		BankName:       model.BankName,
		Balance:        model.Balance,
		Currency:       model.Currency,
		IsActive:       model.IsActive,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}
}

type Accounts []Account

func (a Accounts) FromModel(models []AccountModel) Accounts {
	accounts := make(Accounts, len(models))
	for i, model := range models {
		accounts[i] = Account{}.FromModel(&model)
	}
	return accounts
}

// Transaction DTO
type Transaction struct {
	TransactionID        int             `json:"transaction_id"`
	AccountID            int             `json:"account_id"`
	CategoryID           *int            `json:"category_id,omitempty"`
	Description          string          `json:"description"`
	OriginalDescription  *string         `json:"original_description,omitempty"` // Immutable OFX description
	Amount               decimal.Decimal `json:"amount"`
	TransactionDate      time.Time       `json:"transaction_date"`
	TransactionType      string          `json:"transaction_type"`
	OFXFitID             *string         `json:"ofx_fitid,omitempty"`
	OFXCheckNum          *string         `json:"ofx_check_number,omitempty"`
	OFXMemo              *string         `json:"ofx_memo,omitempty"`
	RawOFXData           *string         `json:"raw_ofx_data,omitempty"`
	IsClassified         bool            `json:"is_classified"`
	ClassificationRuleID *int            `json:"classification_rule_id,omitempty"`
	IsIgnored            bool            `json:"is_ignored"`
	Notes                *string         `json:"notes,omitempty"`
	Tags                 []string        `json:"tags"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
}

func (t Transaction) FromModel(model *TransactionModel) Transaction {
	return Transaction{
		TransactionID:        model.TransactionID,
		AccountID:            model.AccountID,
		CategoryID:           model.CategoryID,
		Description:          model.Description,
		OriginalDescription:  model.OriginalDescription,
		Amount:               model.Amount,
		TransactionDate:      model.TransactionDate,
		TransactionType:      model.TransactionType,
		OFXFitID:             model.OFXFitID,
		OFXCheckNum:          model.OFXCheckNum,
		OFXMemo:              model.OFXMemo,
		RawOFXData:           model.RawOFXData,
		IsClassified:         model.IsClassified,
		ClassificationRuleID: model.ClassificationRuleID,
		IsIgnored:            model.IsIgnored,
		Notes:                model.Notes,
		Tags:                 model.Tags,
		CreatedAt:            model.CreatedAt,
		UpdatedAt:            model.UpdatedAt,
	}
}

type Transactions []Transaction

func (t Transactions) FromModel(models []TransactionModel) Transactions {
	transactions := make(Transactions, len(models))
	for i, model := range models {
		transactions[i] = Transaction{}.FromModel(&model)
	}
	return transactions
}

// Budget DTO
type Budget struct {
	BudgetID       int
	UserID         int
	OrganizationID int
	Name           string
	Month          int
	Year           int
	BudgetType     string
	Amount         decimal.Decimal
	IsActive       bool
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

func (b Budget) FromModel(model *BudgetModel) Budget {
	return Budget{
		BudgetID:       model.BudgetID,
		UserID:         model.UserID,
		OrganizationID: model.OrganizationID,
		Name:           model.Name,
		Month:          model.Month,
		Year:           model.Year,
		BudgetType:     model.BudgetType,
		Amount:         model.Amount,
		IsActive:       model.IsActive,
		CreatedAt:      model.CreatedAt,
		UpdatedAt:      model.UpdatedAt,
	}
}

type Budgets []Budget

func (b Budgets) FromModel(models []BudgetModel) Budgets {
	budgets := make(Budgets, len(models))
	for i, model := range models {
		budgets[i] = Budget{}.FromModel(&model)
	}
	return budgets
}

// BudgetItem DTO
type BudgetItem struct {
	BudgetItemID  int
	BudgetID      int
	CategoryID    int
	PlannedAmount decimal.Decimal
	CreatedAt     time.Time
	UpdatedAt     time.Time
}

func (b BudgetItem) FromModel(model *BudgetItemModel) BudgetItem {
	return BudgetItem{
		BudgetItemID:  model.BudgetItemID,
		BudgetID:      model.BudgetID,
		CategoryID:    model.CategoryID,
		PlannedAmount: model.PlannedAmount,
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
	}
}

type BudgetItems []BudgetItem

func (b BudgetItems) FromModel(models []BudgetItemModel) BudgetItems {
	items := make(BudgetItems, len(models))
	for i, model := range models {
		items[i] = BudgetItem{}.FromModel(&model)
	}
	return items
}

// ClassificationRule DTO
type ClassificationRule struct {
	RuleID               int
	UserID               int
	CategoryID           int
	Name                 string
	Priority             int
	MatchDescription     *string
	MatchAmountMin       *decimal.Decimal
	MatchAmountMax       *decimal.Decimal
	MatchTransactionType *string
	IsActive             bool
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (c ClassificationRule) FromModel(model *ClassificationRuleModel) ClassificationRule {
	return ClassificationRule{
		RuleID:               model.RuleID,
		UserID:               model.UserID,
		CategoryID:           model.CategoryID,
		Name:                 model.Name,
		Priority:             model.Priority,
		MatchDescription:     model.MatchDescription,
		MatchAmountMin:       model.MatchAmountMin,
		MatchAmountMax:       model.MatchAmountMax,
		MatchTransactionType: model.MatchTransactionType,
		IsActive:             model.IsActive,
		CreatedAt:            model.CreatedAt,
		UpdatedAt:            model.UpdatedAt,
	}
}

type ClassificationRules []ClassificationRule

func (c ClassificationRules) FromModel(models []ClassificationRuleModel) ClassificationRules {
	rules := make(ClassificationRules, len(models))
	for i, model := range models {
		rules[i] = ClassificationRule{}.FromModel(&model)
	}
	return rules
}

// Budget with Items (composite)
type BudgetWithItems struct {
	Budget
	Items []BudgetItem
}

// CalculatedBudgetAmount calculates the effective budget amount based on type
func (b BudgetWithItems) CalculatedBudgetAmount() decimal.Decimal {
	switch b.BudgetType {
	case BudgetTypeFixed:
		return b.Amount
	case BudgetTypeCalculated:
		return b.sumBudgetItems()
	case BudgetTypeMaior:
		itemsSum := b.sumBudgetItems()
		if itemsSum.GreaterThan(b.Amount) {
			return itemsSum
		}
		return b.Amount
	default:
		return b.Amount
	}
}

func (b BudgetWithItems) sumBudgetItems() decimal.Decimal {
	sum := decimal.Zero
	for _, item := range b.Items {
		sum = sum.Add(item.PlannedAmount)
	}
	return sum
}

// CategoryBudget DTO
type CategoryBudget struct {
	CategoryBudgetID int
	UserID           int
	OrganizationID   int
	CategoryID       int
	Month            int
	Year             int
	BudgetType       string
	PlannedAmount    decimal.Decimal
	IsConsolidated   bool
	ConsolidatedAt   *time.Time
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

func (c CategoryBudget) FromModel(model *CategoryBudgetModel) CategoryBudget {
	return CategoryBudget{
		CategoryBudgetID: model.CategoryBudgetID,
		UserID:           model.UserID,
		OrganizationID:   model.OrganizationID,
		CategoryID:       model.CategoryID,
		Month:            model.Month,
		Year:             model.Year,
		BudgetType:       model.BudgetType,
		PlannedAmount:    model.PlannedAmount,
		IsConsolidated:   model.IsConsolidated,
		ConsolidatedAt:   model.ConsolidatedAt,
		CreatedAt:        model.CreatedAt,
		UpdatedAt:        model.UpdatedAt,
	}
}

type CategoryBudgets []CategoryBudget

func (c CategoryBudgets) FromModel(models []CategoryBudgetModel) CategoryBudgets {
	budgets := make(CategoryBudgets, len(models))
	for i, model := range models {
		budgets[i] = CategoryBudget{}.FromModel(&model)
	}
	return budgets
}

// PlannedEntry DTO - Enhanced for "Entrada Planejada" feature
type PlannedEntry struct {
	PlannedEntryID int
	UserID         int
	OrganizationID int
	CategoryID     int
	PatternID      *int            `json:",omitempty"`
	Description    string
	Amount         decimal.Decimal

	// Amount range for matching (budget uses AmountMax)
	AmountMin *decimal.Decimal `json:",omitempty"`
	AmountMax *decimal.Decimal `json:",omitempty"`

	// Expected day range
	ExpectedDayStart *int `json:",omitempty"`
	ExpectedDayEnd   *int `json:",omitempty"`
	ExpectedDay      *int `json:",omitempty"` // Legacy

	// Entry type: expense or income
	EntryType string

	IsRecurrent   bool
	ParentEntryID *int `json:",omitempty"`
	IsActive      bool

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (p PlannedEntry) FromModel(model *PlannedEntryModel) PlannedEntry {
	return PlannedEntry{
		PlannedEntryID:   model.PlannedEntryID,
		UserID:           model.UserID,
		OrganizationID:   model.OrganizationID,
		CategoryID:       model.CategoryID,
		PatternID:        model.PatternID,
		Description:      model.Description,
		Amount:           model.Amount,
		AmountMin:        model.AmountMin,
		AmountMax:        model.AmountMax,
		ExpectedDayStart: model.ExpectedDayStart,
		ExpectedDayEnd:   model.ExpectedDayEnd,
		ExpectedDay:      model.ExpectedDay,
		EntryType:        model.EntryType,
		IsRecurrent:   model.IsRecurrent,
		ParentEntryID: model.ParentEntryID,
		IsActive:      model.IsActive,
		CreatedAt:     model.CreatedAt,
		UpdatedAt:     model.UpdatedAt,
	}
}

type PlannedEntries []PlannedEntry

func (p PlannedEntries) FromModel(models []PlannedEntryModel) PlannedEntries {
	entries := make(PlannedEntries, len(models))
	for i, model := range models {
		entries[i] = PlannedEntry{}.FromModel(&model)
	}
	return entries
}

// PlannedEntryStatus DTO - Tracks monthly status of a planned entry
type PlannedEntryStatus struct {
	StatusID       int
	PlannedEntryID int
	Month          int
	Year           int
	Status         string // pending, matched, missed, dismissed

	// Matched transaction info
	MatchedTransactionID *int             `json:",omitempty"`
	MatchedAmount        *decimal.Decimal `json:",omitempty"`
	MatchedAt            *time.Time       `json:",omitempty"`

	// Dismissal info
	DismissedAt     *time.Time `json:",omitempty"`
	DismissalReason *string    `json:",omitempty"`

	CreatedAt time.Time
	UpdatedAt time.Time
}

func (s PlannedEntryStatus) FromModel(model *PlannedEntryStatusModel) PlannedEntryStatus {
	return PlannedEntryStatus{
		StatusID:             model.StatusID,
		PlannedEntryID:       model.PlannedEntryID,
		Month:                model.Month,
		Year:                 model.Year,
		Status:               model.Status,
		MatchedTransactionID: model.MatchedTransactionID,
		MatchedAmount:        model.MatchedAmount,
		MatchedAt:            model.MatchedAt,
		DismissedAt:          model.DismissedAt,
		DismissalReason:      model.DismissalReason,
		CreatedAt:            model.CreatedAt,
		UpdatedAt:            model.UpdatedAt,
	}
}

type PlannedEntryStatuses []PlannedEntryStatus

func (s PlannedEntryStatuses) FromModel(models []PlannedEntryStatusModel) PlannedEntryStatuses {
	statuses := make(PlannedEntryStatuses, len(models))
	for i, model := range models {
		statuses[i] = PlannedEntryStatus{}.FromModel(&model)
	}
	return statuses
}

// PlannedEntryWithStatus combines a planned entry with its current month status
type PlannedEntryWithStatus struct {
	PlannedEntry
	Status        string           // Current status for the month
	StatusColor   string           // green, yellow, red, gray
	MatchedAmount *decimal.Decimal `json:",omitempty"`

	// Matched transaction info (when status = matched)
	MatchedTransactionID *int    `json:",omitempty"`
	MatchedAt            *string `json:",omitempty"` // ISO 8601 format

	// Optional linked pattern info
	LinkedPattern *AdvancedPattern `json:",omitempty"`
}

// GetStatusColor returns the appropriate color for a status
func GetStatusColor(status string) string {
	switch status {
	case PlannedEntryStatusMatched:
		return "green"
	case PlannedEntryStatusPending:
		return "yellow"
	case PlannedEntryStatusMissed:
		return "red"
	case PlannedEntryStatusDismissed:
		return "gray"
	default:
		return "gray"
	}
}

// MonthlySnapshot DTO
type MonthlySnapshot struct {
	SnapshotID      int
	UserID          int
	OrganizationID  int
	CategoryID      int
	Month           int
	Year            int
	PlannedAmount   decimal.Decimal
	ActualAmount    decimal.Decimal
	VariancePercent decimal.Decimal
	BudgetType      string
	CreatedAt       time.Time
}

func (m MonthlySnapshot) FromModel(model *MonthlySnapshotModel) MonthlySnapshot {
	return MonthlySnapshot{
		SnapshotID:      model.SnapshotID,
		UserID:          model.UserID,
		OrganizationID:  model.OrganizationID,
		CategoryID:      model.CategoryID,
		Month:           model.Month,
		Year:            model.Year,
		PlannedAmount:   model.PlannedAmount,
		ActualAmount:    model.ActualAmount,
		VariancePercent: model.VariancePercent,
		BudgetType:      model.BudgetType,
		CreatedAt:       model.CreatedAt,
	}
}

type MonthlySnapshots []MonthlySnapshot

func (m MonthlySnapshots) FromModel(models []MonthlySnapshotModel) MonthlySnapshots {
	snapshots := make(MonthlySnapshots, len(models))
	for i, model := range models {
		snapshots[i] = MonthlySnapshot{}.FromModel(&model)
	}
	return snapshots
}

// AdvancedPattern DTO
type AdvancedPattern struct {
	PatternID          int
	UserID             int
	OrganizationID     int
	DescriptionPattern *string          `json:",omitempty"`
	DatePattern        *string          `json:",omitempty"`
	WeekdayPattern     *string          `json:",omitempty"`
	AmountMin          *decimal.Decimal `json:",omitempty"`
	AmountMax          *decimal.Decimal `json:",omitempty"`
	TargetDescription  string
	TargetCategoryID   int
	ApplyRetroactively bool
	IsActive           bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (a AdvancedPattern) FromModel(model *AdvancedPatternModel) AdvancedPattern {
	return AdvancedPattern{
		PatternID:          model.PatternID,
		UserID:             model.UserID,
		OrganizationID:     model.OrganizationID,
		DescriptionPattern: model.DescriptionPattern,
		DatePattern:        model.DatePattern,
		WeekdayPattern:     model.WeekdayPattern,
		AmountMin:          model.AmountMin,
		AmountMax:          model.AmountMax,
		TargetDescription:  model.TargetDescription,
		TargetCategoryID:   model.TargetCategoryID,
		ApplyRetroactively: model.ApplyRetroactively,
		IsActive:           model.IsActive,
		CreatedAt:          model.CreatedAt,
		UpdatedAt:          model.UpdatedAt,
	}
}

type AdvancedPatterns []AdvancedPattern

func (a AdvancedPatterns) FromModel(models []AdvancedPatternModel) AdvancedPatterns {
	patterns := make(AdvancedPatterns, len(models))
	for i, model := range models {
		patterns[i] = AdvancedPattern{}.FromModel(&model)
	}
	return patterns
}

// AmountRange helper struct for request parsing
type AmountRange struct {
	Min float64 `json:"min"`
	Max float64 `json:"max"`
}
