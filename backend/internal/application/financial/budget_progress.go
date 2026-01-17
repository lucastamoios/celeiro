package financial

import (
	"context"
	"time"

	"github.com/shopspring/decimal"
)

// BudgetProgress represents the tracking state of a budget
type BudgetProgress struct {
	BudgetID                int                    `json:"budget_id"`
	BudgetType              string                 `json:"budget_type"`
	TotalBudget             decimal.Decimal        `json:"total_budget"`
	CurrentDay              int                    `json:"current_day"`
	DaysInMonth             int                    `json:"days_in_month"`
	ProgressPercentage      float64                `json:"progress_percentage"` // % of month elapsed
	ExpectedAtCurrentDay    decimal.Decimal        `json:"expected_at_current_day"`
	ActualSpent             decimal.Decimal        `json:"actual_spent"`
	Variance                decimal.Decimal        `json:"variance"` // positive = over budget
	Status                  string                 `json:"status"`   // "on_track", "over_budget", "warning"
	Categories              []CategoryProgress     `json:"categories,omitempty"`
	ProjectionEndOfMonth    decimal.Decimal        `json:"projection_end_of_month"`
	ProjectedVarianceAtEnd  decimal.Decimal        `json:"projected_variance_at_end"`
}

// CategoryProgress represents tracking for a single category
type CategoryProgress struct {
	CategoryID            int             `json:"category_id"`
	CategoryName          string          `json:"category_name"`
	PlannedAmount         decimal.Decimal `json:"planned_amount"`
	ExpectedAtCurrentDay  decimal.Decimal `json:"expected_at_current_day,omitempty"` // only for fixed budgets
	ActualSpent           decimal.Decimal `json:"actual_spent"`
	Variance              decimal.Decimal `json:"variance"`
	Status                string          `json:"status"`
}

// CalculateBudgetProgressInput contains params for calculating budget progress
type CalculateBudgetProgressInput struct {
	BudgetID       int
	UserID         int
	OrganizationID int
}

// CalculateBudgetProgress calculates current budget tracking/forecast
func (s *service) CalculateBudgetProgress(ctx context.Context, input CalculateBudgetProgressInput) (*BudgetProgress, error) {
	// Start metrics tracking
	calcStart := s.system.Time.Now()
	if s.metrics != nil && s.metrics.BudgetCalculationTotal != nil {
		s.metrics.BudgetCalculationTotal.Add(ctx, 1)
	}

	// Record duration on function exit
	defer func() {
		if s.metrics != nil && s.metrics.BudgetCalculationDuration != nil {
			duration := s.system.Time.Now().Sub(calcStart).Seconds()
			s.metrics.BudgetCalculationDuration.Record(ctx, duration)
		}
	}()

	// Get budget
	budgetModel, err := s.Repository.FetchBudgetByID(ctx, fetchBudgetByIDParams{
		BudgetID:       input.BudgetID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		if s.metrics != nil && s.metrics.BudgetCalculationErrors != nil {
			s.metrics.BudgetCalculationErrors.Add(ctx, 1)
		}
		return nil, err
	}

	// Get budget items
	itemsModels, err := s.Repository.FetchBudgetItems(ctx, fetchBudgetItemsParams{
		BudgetID:       input.BudgetID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	// Combine into BudgetWithItems
	budget := BudgetWithItems{
		Budget: Budget{}.FromModel(&budgetModel),
		Items:  BudgetItems{}.FromModel(itemsModels),
	}

	// Get transactions for this month
	transactions, err := s.Repository.FetchTransactionsByMonth(ctx, fetchTransactionsByMonthParams{
		OrganizationID: input.OrganizationID,
		Month:          budget.Month,
		Year:           budget.Year,
	})
	if err != nil {
		return nil, err
	}

	// Calculate days
	now := time.Now()
	currentDay := now.Day()
	daysInMonth := time.Date(budget.Year, time.Month(budget.Month)+1, 0, 0, 0, 0, 0, time.UTC).Day()
	progressPercentage := float64(currentDay) / float64(daysInMonth) * 100

	// Calculate based on budget type
	switch budget.BudgetType {
	case BudgetTypeFixed:
		return s.calculateFixedBudgetProgress(&budget, transactions, currentDay, daysInMonth, progressPercentage)
	case BudgetTypeCalculated:
		return s.calculateCalculatedBudgetProgress(&budget, transactions, currentDay, daysInMonth, progressPercentage)
	case BudgetTypeMaior:
		return s.calculateMaiorBudgetProgress(&budget, transactions, currentDay, daysInMonth, progressPercentage)
	default:
		return s.calculateFixedBudgetProgress(&budget, transactions, currentDay, daysInMonth, progressPercentage)
	}
}

func (s *service) calculateFixedBudgetProgress(
	budget *BudgetWithItems,
	transactions []TransactionModel,
	currentDay, daysInMonth int,
	progressPercentage float64,
) (*BudgetProgress, error) {
	totalBudget := budget.Amount

	// Expected spending up to current day (linear prorating)
	expectedAtCurrentDay := totalBudget.Mul(decimal.NewFromInt(int64(currentDay))).Div(decimal.NewFromInt(int64(daysInMonth)))

	// Actual spending (sum all debit transactions)
	actualSpent := s.sumTransactions(transactions, TransactionTypeDebit)

	// Variance (positive = over budget)
	variance := actualSpent.Sub(expectedAtCurrentDay)

	// Project end of month based on current spending rate
	var projectionEndOfMonth decimal.Decimal
	if currentDay > 0 {
		projectionEndOfMonth = actualSpent.Mul(decimal.NewFromInt(int64(daysInMonth))).Div(decimal.NewFromInt(int64(currentDay)))
	} else {
		projectionEndOfMonth = decimal.Zero
	}

	projectedVarianceAtEnd := projectionEndOfMonth.Sub(totalBudget)

	// Determine status with variance thresholds
	// - on_track: variance <= 1% of budget
	// - warning: variance between 1% and 10% of budget
	// - over_budget: variance > 10% of budget
	status := "on_track"
	if variance.GreaterThan(decimal.Zero) && !totalBudget.IsZero() {
		variancePercent := variance.Div(totalBudget).Mul(decimal.NewFromInt(100))

		if variancePercent.GreaterThan(decimal.NewFromFloat(10.0)) {
			status = "over_budget"
		} else if variancePercent.GreaterThan(decimal.NewFromFloat(1.0)) {
			status = "warning"
		}
		// else remains "on_track"
	}

	return &BudgetProgress{
		BudgetID:               budget.BudgetID,
		BudgetType:             budget.BudgetType,
		TotalBudget:            totalBudget,
		CurrentDay:             currentDay,
		DaysInMonth:            daysInMonth,
		ProgressPercentage:     progressPercentage,
		ExpectedAtCurrentDay:   expectedAtCurrentDay,
		ActualSpent:            actualSpent,
		Variance:               variance,
		Status:                 status,
		ProjectionEndOfMonth:   projectionEndOfMonth,
		ProjectedVarianceAtEnd: projectedVarianceAtEnd,
	}, nil
}

func (s *service) calculateCalculatedBudgetProgress(
	budget *BudgetWithItems,
	transactions []TransactionModel,
	currentDay, daysInMonth int,
	progressPercentage float64,
) (*BudgetProgress, error) {
	categoryProgress := []CategoryProgress{}
	totalPlanned := decimal.Zero
	totalActual := decimal.Zero

	// Create map of planned categories
	plannedCategories := make(map[int]BudgetItem)
	for _, item := range budget.Items {
		plannedCategories[item.CategoryID] = item
		totalPlanned = totalPlanned.Add(item.PlannedAmount)
	}

	// Group transactions by category (exclude ignored transactions)
	spendingByCategory := make(map[int]decimal.Decimal)
	for _, tx := range transactions {
		if tx.TransactionType == TransactionTypeDebit && tx.CategoryID != nil && !tx.IsIgnored {
			catID := *tx.CategoryID
			current := spendingByCategory[catID]
			spendingByCategory[catID] = current.Add(tx.Amount)
		}
	}

	// Calculate progress for planned categories
	for catID, item := range plannedCategories {
		actualSpent := spendingByCategory[catID]
		if actualSpent.IsZero() {
			actualSpent = decimal.Zero
		}
		totalActual = totalActual.Add(actualSpent)

		variance := actualSpent.Sub(item.PlannedAmount)
		status := "on_track"
		if variance.GreaterThan(decimal.Zero) && !item.PlannedAmount.IsZero() {
			variancePercent := variance.Div(item.PlannedAmount).Mul(decimal.NewFromInt(100))

			if variancePercent.GreaterThan(decimal.NewFromFloat(10.0)) {
				status = "over_budget"
			} else if variancePercent.GreaterThan(decimal.NewFromFloat(1.0)) {
				status = "warning"
			}
		}

		// Get category name
		catName := ""
		if cat, err := s.Repository.FetchCategoryByID(context.Background(), fetchCategoryByIDParams{
			CategoryID:     catID,
			OrganizationID: budget.OrganizationID,
		}); err == nil {
			catName = cat.Name
		}

		categoryProgress = append(categoryProgress, CategoryProgress{
			CategoryID:    catID,
			CategoryName:  catName,
			PlannedAmount: item.PlannedAmount,
			ActualSpent:   actualSpent,
			Variance:      variance,
			Status:        status,
		})
	}

	// Find unplanned spending (categories not in budget items)
	for catID, spent := range spendingByCategory {
		if _, planned := plannedCategories[catID]; !planned && spent.GreaterThan(decimal.Zero) {
			totalActual = totalActual.Add(spent)

			catName := ""
			if cat, err := s.Repository.FetchCategoryByID(context.Background(), fetchCategoryByIDParams{
				CategoryID:     catID,
				OrganizationID: budget.OrganizationID,
			}); err == nil {
				catName = cat.Name
			}

			categoryProgress = append(categoryProgress, CategoryProgress{
				CategoryID:    catID,
				CategoryName:  catName,
				PlannedAmount: decimal.Zero,
				ActualSpent:   spent,
				Variance:      spent, // all spending is variance
				Status:        "over_budget",
			})
		}
	}

	// Overall status with variance thresholds
	variance := totalActual.Sub(totalPlanned)
	status := "on_track"
	if variance.GreaterThan(decimal.Zero) && !totalPlanned.IsZero() {
		variancePercent := variance.Div(totalPlanned).Mul(decimal.NewFromInt(100))

		if variancePercent.GreaterThan(decimal.NewFromFloat(10.0)) {
			status = "over_budget"
		} else if variancePercent.GreaterThan(decimal.NewFromFloat(1.0)) {
			status = "warning"
		}
	}

	return &BudgetProgress{
		BudgetID:               budget.BudgetID,
		BudgetType:             budget.BudgetType,
		TotalBudget:            totalPlanned,
		CurrentDay:             currentDay,
		DaysInMonth:            daysInMonth,
		ProgressPercentage:     progressPercentage,
		ExpectedAtCurrentDay:   totalPlanned, // no prorating for calculated
		ActualSpent:            totalActual,
		Variance:               variance,
		Status:                 status,
		Categories:             categoryProgress,
		ProjectionEndOfMonth:   totalActual, // no projection for calculated
		ProjectedVarianceAtEnd: variance,
	}, nil
}

func (s *service) calculateMaiorBudgetProgress(
	budget *BudgetWithItems,
	transactions []TransactionModel,
	currentDay, daysInMonth int,
	progressPercentage float64,
) (*BudgetProgress, error) {
	// Calculate both fixed and calculated
	fixedProgress, err := s.calculateFixedBudgetProgress(budget, transactions, currentDay, daysInMonth, progressPercentage)
	if err != nil {
		return nil, err
	}

	calculatedProgress, err := s.calculateCalculatedBudgetProgress(budget, transactions, currentDay, daysInMonth, progressPercentage)
	if err != nil {
		return nil, err
	}

	// Use the stricter of the two (more restrictive = smaller budget = less to spend)
	if calculatedProgress.TotalBudget.LessThan(fixedProgress.TotalBudget) {
		calculatedProgress.BudgetType = BudgetTypeMaior
		return calculatedProgress, nil
	}

	fixedProgress.BudgetType = BudgetTypeMaior
	return fixedProgress, nil
}

func (s *service) sumTransactions(transactions []TransactionModel, txType string) decimal.Decimal {
	sum := decimal.Zero
	for _, tx := range transactions {
		if tx.TransactionType == txType && !tx.IsIgnored {
			sum = sum.Add(tx.Amount)
		}
	}
	return sum
}

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
	Month              int               `json:"month"`
	Year               int               `json:"year"`
	CurrentDay         int               `json:"current_day"`
	DaysInMonth        int               `json:"days_in_month"`
	ProgressPercentage float64           `json:"progress_percentage"` // % of month elapsed
	Categories         []CategoryPacing  `json:"categories"`
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

	// Filter controllable categories
	controllableCategories := []CategoryModel{}
	for _, cat := range categories {
		if cat.IsControllable {
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

	// Create map of category ID -> budget
	budgetMap := make(map[int]decimal.Decimal)
	for _, b := range categoryBudgets {
		budgetMap[b.CategoryID] = b.PlannedAmount
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
