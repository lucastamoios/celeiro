package financial

import (
	"time"

	"github.com/shopspring/decimal"
)

// Category DTO
type Category struct {
	CategoryID int
	Name       string
	Icon       string
	IsSystem   bool
	UserID     *int
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

func (c Category) FromModel(model *CategoryModel) Category {
	return Category{
		CategoryID: model.CategoryID,
		Name:       model.Name,
		Icon:       model.Icon,
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
	TransactionID        int
	AccountID            int
	CategoryID           *int
	Description          string
	Amount               decimal.Decimal
	TransactionDate      time.Time
	TransactionType      string
	OFXFitID             *string
	OFXCheckNum          *string
	OFXMemo              *string
	RawOFXData           *string
	IsClassified         bool
	ClassificationRuleID *int
	Notes                *string
	Tags                 []string
	CreatedAt            time.Time
	UpdatedAt            time.Time
}

func (t Transaction) FromModel(model *TransactionModel) Transaction {
	return Transaction{
		TransactionID:        model.TransactionID,
		AccountID:            model.AccountID,
		CategoryID:           model.CategoryID,
		Description:          model.Description,
		Amount:               model.Amount,
		TransactionDate:      model.TransactionDate,
		TransactionType:      model.TransactionType,
		OFXFitID:             model.OFXFitID,
		OFXCheckNum:          model.OFXCheckNum,
		OFXMemo:              model.OFXMemo,
		RawOFXData:           model.RawOFXData,
		IsClassified:         model.IsClassified,
		ClassificationRuleID: model.ClassificationRuleID,
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
	case BudgetTypeHybrid:
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
