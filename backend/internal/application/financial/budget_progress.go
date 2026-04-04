package financial

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
)

// ============================================================================
// Controllable Category Pacing
// ============================================================================

// CategoryPacingStatus represents pace status for a controllable category
type CategoryPacingStatus string

const (
	PaceStatusUnderPace CategoryPacingStatus = "under_pace" // Spending less than expected
	PaceStatusOnPace    CategoryPacingStatus = "on_pace"    // Spending as expected (within 5%)
	PaceStatusOverPace  CategoryPacingStatus = "over_pace"  // Spending more than expected
	PaceStatusNoBudget  CategoryPacingStatus = "no_budget"  // No budget set for this category
)

// CategoryPacing represents pacing data for a single controllable category
type CategoryPacing struct {
	CategoryID   int                  `json:"category_id"`
	CategoryName string               `json:"category_name"`
	CategoryIcon string               `json:"category_icon"`
	Budget       decimal.Decimal      `json:"budget"`   // Monthly budget for this category
	Spent        decimal.Decimal      `json:"spent"`    // Actual spent so far
	Expected     decimal.Decimal      `json:"expected"` // Expected spend at current day
	Variance     decimal.Decimal      `json:"variance"` // Spent - Expected (positive = over pace)
	Status       CategoryPacingStatus `json:"status"`
}

// ControllableCategoryPacing contains pacing data for all controllable categories
type ControllableCategoryPacing struct {
	Month              int              `json:"month"`
	Year               int              `json:"year"`
	CurrentDay         int              `json:"current_day"`
	DaysInMonth        int              `json:"days_in_month"`
	ProgressPercentage float64          `json:"progress_percentage"` // % of month elapsed
	Categories         []CategoryPacing `json:"categories"`
}

// GetControllableCategoryPacingInput contains params for getting pacing data
type GetControllableCategoryPacingInput struct {
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

// GetControllableCategoryPacing calculates pacing data for all controllable categories
func (s *service) GetControllableCategoryPacing(ctx context.Context, input GetControllableCategoryPacingInput) (*ControllableCategoryPacing, error) {
	// Calculate time-based values
	now := s.system.Time.Now()
	currentDay := now.Day()
	daysInMonth := time.Date(input.Year, time.Month(input.Month+1), 0, 0, 0, 0, 0, time.UTC).Day()
	progressPercentage := float64(currentDay) / float64(daysInMonth) * 100

	// Fetch all categories for the organization
	categories, err := s.Repository.FetchCategories(ctx, fetchCategoriesParams{
		OrganizationID: &input.OrganizationID,
		IncludeSystem:  false,
	})
	if err != nil {
		return nil, err
	}

	// Fetch category budgets for the month
	categoryBudgets, err := s.Repository.FetchCategoryBudgets(ctx, fetchCategoryBudgetsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Month:          &input.Month,
		Year:           &input.Year,
	})
	if err != nil {
		return nil, err
	}

	// Create map of category ID -> controlled amount
	// Include all categories that have a non-zero controlled amount
	budgetMap := make(map[int]decimal.Decimal)
	for _, b := range categoryBudgets {
		if !b.ControlledAmount.IsZero() {
			budgetMap[b.CategoryID] = b.ControlledAmount
		}
	}

	// Build controllable categories from those with non-zero controlled amounts
	categoryMap := make(map[int]CategoryModel)
	for _, cat := range categories {
		categoryMap[cat.CategoryID] = cat
	}

	controllableCategories := []CategoryModel{}
	for catID := range budgetMap {
		if cat, ok := categoryMap[catID]; ok {
			controllableCategories = append(controllableCategories, cat)
		}
	}

	if len(controllableCategories) == 0 {
		return &ControllableCategoryPacing{
			Month:              input.Month,
			Year:               input.Year,
			CurrentDay:         currentDay,
			DaysInMonth:        daysInMonth,
			ProgressPercentage: progressPercentage,
			Categories:         []CategoryPacing{},
		}, nil
	}

	// Fetch transactions for the month to calculate spending
	transactions, err := s.Repository.FetchTransactionsByMonth(ctx, fetchTransactionsByMonthParams{
		OrganizationID: input.OrganizationID,
		Month:          input.Month,
		Year:           input.Year,
	})
	if err != nil {
		return nil, err
	}

	// Calculate spending by category
	spendingByCategory := make(map[int]decimal.Decimal)
	for _, tx := range transactions {
		if tx.TransactionType == TransactionTypeDebit && tx.CategoryID != nil && !tx.IsIgnored {
			catID := *tx.CategoryID
			current := spendingByCategory[catID]
			spendingByCategory[catID] = current.Add(tx.Amount)
		}
	}

	// Build pacing data for each controllable category
	categoryPacingList := make([]CategoryPacing, 0, len(controllableCategories))
	for _, cat := range controllableCategories {
		budget := budgetMap[cat.CategoryID]
		spent := spendingByCategory[cat.CategoryID]
		if spent.IsZero() {
			spent = decimal.Zero
		}

		// Calculate expected spend: budget * (current_day / days_in_month)
		var expected decimal.Decimal
		var variance decimal.Decimal
		var status CategoryPacingStatus

		if budget.IsZero() {
			expected = decimal.Zero
			variance = decimal.Zero
			status = PaceStatusNoBudget
		} else {
			expected = budget.Mul(decimal.NewFromInt(int64(currentDay))).Div(decimal.NewFromInt(int64(daysInMonth)))
			variance = spent.Sub(expected)

			// Determine status
			// Within 5% of expected = on pace
			// Below expected - 5% = under pace
			// Above expected + 5% = over pace
			threshold := expected.Mul(decimal.NewFromFloat(0.05))

			if variance.LessThan(threshold.Neg()) {
				status = PaceStatusUnderPace
			} else if variance.GreaterThan(threshold) {
				status = PaceStatusOverPace
			} else {
				status = PaceStatusOnPace
			}
		}

		categoryPacingList = append(categoryPacingList, CategoryPacing{
			CategoryID:   cat.CategoryID,
			CategoryName: cat.Name,
			CategoryIcon: cat.Icon,
			Budget:       budget,
			Spent:        spent,
			Expected:     expected,
			Variance:     variance,
			Status:       status,
		})
	}

	return &ControllableCategoryPacing{
		Month:              input.Month,
		Year:               input.Year,
		CurrentDay:         currentDay,
		DaysInMonth:        daysInMonth,
		ProgressPercentage: progressPercentage,
		Categories:         categoryPacingList,
	}, nil
}
