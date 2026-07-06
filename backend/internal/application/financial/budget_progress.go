package financial

import (
	"context"
	"math"
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
	CategoryID        int                  `json:"category_id"`
	CategoryName      string               `json:"category_name"`
	CategoryIcon      string               `json:"category_icon"`
	Budget            decimal.Decimal      `json:"budget"`   // Monthly budget for this category
	Spent             decimal.Decimal      `json:"spent"`    // Actual spent so far
	Expected          decimal.Decimal      `json:"expected"` // Expected spend at current day
	Variance          decimal.Decimal      `json:"variance"` // Spent - Expected (positive = over pace)
	Granularity       int                  `json:"granularity"`
	GranularitySource string               `json:"granularity_source"` // configured, previous_month, or minimum
	Status            CategoryPacingStatus `json:"status"`
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

	// Fetch all categories for the organization, including system ones: budgets
	// are routinely set on system categories (Transporte, Moradia, Dívida), and
	// excluding them silently dropped those from the pacing widget no matter how
	// large their budget was. Only the 1% threshold below decides visibility.
	categories, err := s.Repository.FetchCategories(ctx, fetchCategoriesParams{
		OrganizationID: &input.OrganizationID,
		IncludeSystem:  true,
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

	// Create map of category ID -> category budget
	// Include all categories that have a non-zero controlled amount
	budgetMap := make(map[int]CategoryBudgetModel)
	needsPreviousGranularity := false
	for _, b := range categoryBudgets {
		if !b.ControlledAmount.IsZero() {
			budgetMap[b.CategoryID] = b
			if b.Granularity == nil {
				needsPreviousGranularity = true
			}
		}
	}

	// Build controllable categories from those with non-zero controlled amounts
	categoryMap := make(map[int]CategoryModel)
	for _, cat := range categories {
		categoryMap[cat.CategoryID] = cat
	}

	// Income categories (Receita) also carry controlled amounts but pacing is
	// about expense control; previously they were only excluded by the accident
	// of being system categories.
	controllableCategories := []CategoryModel{}
	for catID := range budgetMap {
		if cat, ok := categoryMap[catID]; ok && cat.CategoryType != "income" {
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

	// The pacing budget is the controlled amount only; planned entries are
	// budgeted separately. Spending matched to a planned entry is therefore
	// excluded, so the pace compares unplanned (controlled) spending against the
	// controlled budget.
	matchedIDs, err := s.Repository.FetchMatchedTransactionIDs(ctx, fetchMatchedTransactionIDsParams{
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return nil, err
	}
	matchedSet := make(map[int]struct{}, len(matchedIDs))
	for _, id := range matchedIDs {
		matchedSet[id] = struct{}{}
	}

	granularityByCategory := make(map[int]int)
	if needsPreviousGranularity {
		previousMonth, previousYear := previousMonth(input.Month, input.Year)
		previousTransactions, err := s.Repository.FetchTransactionsByMonth(ctx, fetchTransactionsByMonthParams{
			OrganizationID: input.OrganizationID,
			Month:          previousMonth,
			Year:           previousYear,
		})
		if err != nil {
			return nil, err
		}
		granularityByCategory = countControlledTransactionsByCategory(previousTransactions, matchedSet)
	}

	// Calculate unplanned spending by category
	spendingByCategory := sumControlledSpendingByCategory(transactions, matchedSet)

	// Build pacing data for each controllable category
	categoryPacingList := make([]CategoryPacing, 0, len(controllableCategories))
	for _, cat := range controllableCategories {
		budget := budgetMap[cat.CategoryID].ControlledAmount
		spent := spendingByCategory[cat.CategoryID]
		if spent.IsZero() {
			spent = decimal.Zero
		}

		// Calculate expected spend: budget * (current_day / days_in_month)
		var expected decimal.Decimal
		var variance decimal.Decimal
		var status CategoryPacingStatus
		var granularity int
		var granularitySource string

		if budget.IsZero() {
			expected = decimal.Zero
			variance = decimal.Zero
			granularity = 0
			granularitySource = "minimum"
			status = PaceStatusNoBudget
		} else {
			granularity, granularitySource = effectiveGranularity(
				budgetMap[cat.CategoryID].Granularity,
				granularityByCategory[cat.CategoryID],
			)
			expected = expectedSpendForGranularity(budget, currentDay, daysInMonth, granularity)
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
			CategoryID:        cat.CategoryID,
			CategoryName:      cat.Name,
			CategoryIcon:      cat.Icon,
			Budget:            budget,
			Spent:             spent,
			Expected:          expected,
			Variance:          variance,
			Granularity:       granularity,
			GranularitySource: granularitySource,
			Status:            status,
		})
	}

	// Hide trivial categories: keep only those whose budget is at least 1% of the
	// month's planned income. Planned income is the controlled amount of
	// income-type category budgets (the same "Receita Estimado" figure the budget
	// dashboard shows). If there is no planned income we have no basis to filter,
	// so everything is kept.
	plannedIncome, err := s.Repository.FetchIncomeBudgetForMonth(ctx, fetchIncomeBudgetForMonthParams{
		OrganizationID: input.OrganizationID,
		Month:          input.Month,
		Year:           input.Year,
	})
	if err != nil {
		return nil, err
	}
	if plannedIncome.IsPositive() {
		threshold := plannedIncome.Mul(decimal.NewFromFloat(0.01))
		filtered := make([]CategoryPacing, 0, len(categoryPacingList))
		for _, cp := range categoryPacingList {
			if cp.Budget.GreaterThanOrEqual(threshold) {
				filtered = append(filtered, cp)
			}
		}
		categoryPacingList = filtered
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

func previousMonth(month int, year int) (int, int) {
	if month == 1 {
		return 12, year - 1
	}
	return month - 1, year
}

func effectiveGranularity(configured *int, fallbackCount int) (int, string) {
	if configured != nil && *configured >= 2 {
		return *configured, "configured"
	}
	if fallbackCount >= 2 {
		return fallbackCount, "previous_month"
	}
	return 2, "minimum"
}

func expectedSpendForGranularity(budget decimal.Decimal, currentDay int, daysInMonth int, granularity int) decimal.Decimal {
	if budget.IsZero() {
		return decimal.Zero
	}
	if daysInMonth <= 0 {
		return budget
	}
	granularity, _ = effectiveGranularity(&granularity, 0)
	daysPerChunk := float64(daysInMonth) / float64(granularity)
	currentChunk := int(math.Ceil(float64(currentDay) / daysPerChunk))
	if currentChunk < 1 {
		currentChunk = 1
	}
	expected := budget.Mul(decimal.NewFromInt(int64(currentChunk))).Div(decimal.NewFromInt(int64(granularity - 1)))
	if expected.GreaterThan(budget) {
		return budget
	}
	return expected
}

func countControlledTransactionsByCategory(transactions []TransactionModel, matchedSet map[int]struct{}) map[int]int {
	counts := make(map[int]int)
	for _, tx := range transactions {
		if _, isPlanned := matchedSet[tx.TransactionID]; isPlanned {
			continue
		}
		if tx.TransactionType == TransactionTypeDebit && tx.CategoryID != nil && !tx.IsIgnored {
			counts[*tx.CategoryID]++
		}
	}
	return counts
}

func sumControlledSpendingByCategory(transactions []TransactionModel, matchedSet map[int]struct{}) map[int]decimal.Decimal {
	spendingByCategory := make(map[int]decimal.Decimal)
	for _, tx := range transactions {
		if _, isPlanned := matchedSet[tx.TransactionID]; isPlanned {
			continue
		}
		if tx.TransactionType == TransactionTypeDebit && tx.CategoryID != nil && !tx.IsIgnored {
			catID := *tx.CategoryID
			current := spendingByCategory[catID]
			spendingByCategory[catID] = current.Add(tx.Amount)
		}
	}
	return spendingByCategory
}
