package financial

import (
	"context"

	"github.com/shopspring/decimal"
)

// Income planning threshold constant (0.25%)
const UnplannedIncomeThreshold = 0.0025

// IncomePlanningReport represents the income allocation status for a month
type IncomePlanningReport struct {
	Month              int             `json:"month"`
	Year               int             `json:"year"`
	TotalIncome        decimal.Decimal `json:"totalIncome"`
	TotalPlanned       decimal.Decimal `json:"totalPlanned"`
	Unallocated        decimal.Decimal `json:"unallocated"`
	UnallocatedPercent decimal.Decimal `json:"unallocatedPercent"` // as decimal (0.5 = 0.5%)
	Threshold          float64         `json:"threshold"`          // 0.25
	Status             string          `json:"status"`             // "OK" or "WARNING"
	Message            string          `json:"message"`
}

type GetIncomePlanningInput struct {
	UserID         int
	OrganizationID int
	Month          int
	Year           int
}

// GetIncomePlanning calculates the income planning report for a given month
func (s *service) GetIncomePlanning(ctx context.Context, input GetIncomePlanningInput) (*IncomePlanningReport, error) {
	// 1. Calculate total income for the month (sum of all credit transactions)
	totalIncome, err := s.calculateMonthlyIncome(ctx, input.UserID, input.OrganizationID, input.Month, input.Year)
	if err != nil {
		return nil, err
	}

	// 2. Get total planned amounts from category budgets
	budgets, err := s.GetCategoryBudgets(ctx, GetCategoryBudgetsInput{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Month:          &input.Month,
		Year:           &input.Year,
	})
	if err != nil {
		return nil, err
	}

	// Sum up all planned amounts
	totalPlanned := decimal.Zero
	for _, budget := range budgets {
		totalPlanned = totalPlanned.Add(budget.PlannedAmount)
	}

	// 3. Calculate unallocated amount and percentage
	unallocated := totalIncome.Sub(totalPlanned)

	var unallocatedPercent decimal.Decimal
	var status string
	var message string

	// Handle zero income gracefully
	if totalIncome.IsZero() {
		unallocatedPercent = decimal.Zero
		status = "OK"
		message = "No income for this month"
	} else {
		// Calculate percentage: (unallocated / totalIncome) * 100
		unallocatedPercent = unallocated.Div(totalIncome).Mul(decimal.NewFromInt(100))

		// Check threshold (0.25%)
		thresholdDecimal := decimal.NewFromFloat(UnplannedIncomeThreshold * 100) // 0.25%
		if unallocatedPercent.GreaterThan(thresholdDecimal) {
			status = "WARNING"
			message = unallocatedPercent.StringFixed(2) + "% of income unallocated (max: 0.25%)"
		} else {
			status = "OK"
			message = "Income properly allocated"
		}
	}

	return &IncomePlanningReport{
		Month:              input.Month,
		Year:               input.Year,
		TotalIncome:        totalIncome,
		TotalPlanned:       totalPlanned,
		Unallocated:        unallocated,
		UnallocatedPercent: unallocatedPercent,
		Threshold:          UnplannedIncomeThreshold * 100, // Return as percentage (0.25)
		Status:             status,
		Message:            message,
	}, nil
}

// calculateMonthlyIncome sums all credit transactions for a given month
func (s *service) calculateMonthlyIncome(ctx context.Context, userID, organizationID, month, year int) (decimal.Decimal, error) {
	// Use the repository to fetch transactions by month for the organization
	transactions, err := s.Repository.FetchTransactionsByMonth(ctx, fetchTransactionsByMonthParams{
		OrganizationID: organizationID,
		Month:          month,
		Year:           year,
	})
	if err != nil {
		return decimal.Zero, err
	}

	// Filter by credit type and sum amounts (month/year already filtered by query)
	total := decimal.Zero
	for _, tx := range transactions {
		// Only include credit transactions
		if tx.TransactionType != "credit" {
			continue
		}
		total = total.Add(tx.Amount)
	}

	return total, nil
}
