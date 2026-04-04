package financial

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// ============================================================================
// Input/Output Structures
// ============================================================================

type GetSavingsGoalsInput struct {
	UserID         int
	OrganizationID int
	IsActive       *bool
	IsCompleted    *bool
	GoalType       *string
}

type GetSavingsGoalByIDInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type GetSavingsGoalProgressInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type CreateSavingsGoalInput struct {
	UserID              int
	OrganizationID      int
	Name                string
	GoalType            string // "reserva" or "investimento"
	TargetAmount        decimal.Decimal
	InitialAmount       decimal.Decimal // Pre-existing balance when goal is created
	DueDate             *string         // Format: "2006-01-02"
	StartDate           *string         // Format: "2006-01-02"
	Icon                *string
	Color               *string
	Notes               *string
	CategoryID          *int
	MonthlyContribution *decimal.Decimal
}

type UpdateSavingsGoalInput struct {
	SavingsGoalID       int
	UserID              int
	OrganizationID      int
	Name                *string
	TargetAmount        *decimal.Decimal
	DueDate             *string // Format: "2006-01-02", use empty string to clear
	StartDate           *string // Format: "2006-01-02", use empty string to clear
	Icon                *string
	Color               *string
	Notes               *string
	CategoryID          *int
	MonthlyContribution *decimal.Decimal
}

type DeleteSavingsGoalInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type CompleteSavingsGoalInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type ReopenSavingsGoalInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type GetGoalSummaryInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
}

type AddContributionInput struct {
	SavingsGoalID  int
	UserID         int
	OrganizationID int
	Amount         decimal.Decimal // Positive = add, Negative = subtract
}

// ============================================================================
// Service Implementation
// ============================================================================

func (s *service) GetSavingsGoals(ctx context.Context, input GetSavingsGoalsInput) ([]SavingsGoal, error) {
	models, err := s.Repository.FetchSavingsGoals(ctx, fetchSavingsGoalsParams{
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsActive:       input.IsActive,
		IsCompleted:    input.IsCompleted,
		GoalType:       input.GoalType,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to fetch savings goals: %w", err)
	}

	return SavingsGoals{}.FromModel(models), nil
}

func (s *service) GetSavingsGoalByID(ctx context.Context, input GetSavingsGoalByIDInput) (SavingsGoal, error) {
	model, err := s.Repository.FetchSavingsGoalByID(ctx, fetchSavingsGoalByIDParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoal{}, fmt.Errorf("failed to fetch savings goal: %w", err)
	}

	return SavingsGoal{}.FromModel(&model), nil
}

func (s *service) GetSavingsGoalProgress(ctx context.Context, input GetSavingsGoalProgressInput) (SavingsGoalProgress, error) {
	// 1. Get the goal
	goal, err := s.Repository.FetchSavingsGoalByID(ctx, fetchSavingsGoalByIDParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalProgress{}, fmt.Errorf("failed to fetch savings goal: %w", err)
	}

	// 2. Get contributions (transactions linked to this goal)
	transactions, err := s.Repository.FetchGoalContributions(ctx, fetchGoalContributionsParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalProgress{}, fmt.Errorf("failed to fetch goal contributions: %w", err)
	}

	// 3. Calculate current amount (initial amount + sum of transaction amounts)
	currentAmount := goal.InitialAmount
	for _, tx := range transactions {
		// Credits add to savings, debits subtract
		if tx.TransactionType == TransactionTypeCredit {
			currentAmount = currentAmount.Add(tx.Amount)
		} else {
			currentAmount = currentAmount.Sub(tx.Amount)
		}
	}

	// 4. Calculate progress percentage
	progressPercent := decimal.Zero
	if goal.TargetAmount.GreaterThan(decimal.Zero) {
		progressPercent = currentAmount.Div(goal.TargetAmount).Mul(decimal.NewFromInt(100))
	}

	// 5. Get monthly contributions
	monthlyContribs, err := s.Repository.FetchGoalMonthlyContributions(ctx, fetchGoalMonthlyContributionsParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalProgress{}, fmt.Errorf("failed to fetch monthly contributions: %w", err)
	}

	contributions := make([]MonthlyContribution, len(monthlyContribs))
	for i, mc := range monthlyContribs {
		contributions[i] = MonthlyContribution{
			Month:  mc.Month,
			Year:   mc.Year,
			Amount: mc.Amount,
		}
	}

	progress := SavingsGoalProgress{
		Goal:                 SavingsGoal{}.FromModel(&goal),
		CurrentAmount:        currentAmount,
		ProgressPercent:      progressPercent,
		MonthlyContributions: contributions,
	}

	// 6. Calculate additional metrics for "reserva" type goals
	if goal.GoalType == SavingsGoalTypeReserva && goal.DueDate != nil {
		now := s.system.Time.Now()
		monthsRemaining := calculateMonthsRemaining(now, *goal.DueDate)
		progress.MonthsRemaining = &monthsRemaining

		// Calculate monthly target needed to reach goal
		remaining := goal.TargetAmount.Sub(currentAmount)
		if monthsRemaining > 0 && remaining.GreaterThan(decimal.Zero) {
			monthlyTarget := remaining.Div(decimal.NewFromInt(int64(monthsRemaining)))
			progress.MonthlyTarget = &monthlyTarget
		}

		// Calculate on-track status
		isOnTrack := calculateOnTrackStatus(now, goal.CreatedAt, *goal.DueDate, goal.TargetAmount, currentAmount)
		progress.IsOnTrack = &isOnTrack
	}

	return progress, nil
}

func (s *service) CreateSavingsGoal(ctx context.Context, input CreateSavingsGoalInput) (SavingsGoal, error) {
	// Validate goal type
	if input.GoalType != SavingsGoalTypeReserva && input.GoalType != SavingsGoalTypeInvestimento {
		return SavingsGoal{}, fmt.Errorf("invalid goal_type: must be 'reserva' or 'investimento'")
	}

	// Validate that reserva goals require a due date
	if input.GoalType == SavingsGoalTypeReserva && (input.DueDate == nil || *input.DueDate == "") {
		return SavingsGoal{}, fmt.Errorf("due_date is required for 'reserva' type goals")
	}

	// Validate due date format if provided
	if input.DueDate != nil && *input.DueDate != "" {
		if _, err := time.Parse("2006-01-02", *input.DueDate); err != nil {
			return SavingsGoal{}, fmt.Errorf("invalid due_date format: %w", err)
		}
	}

	// Validate start date format if provided
	if input.StartDate != nil && *input.StartDate != "" {
		if _, err := time.Parse("2006-01-02", *input.StartDate); err != nil {
			return SavingsGoal{}, fmt.Errorf("invalid start_date format: %w", err)
		}
	}

	// Validate target amount
	if input.TargetAmount.LessThanOrEqual(decimal.Zero) {
		return SavingsGoal{}, fmt.Errorf("target_amount must be greater than zero")
	}

	model, err := s.Repository.InsertSavingsGoal(ctx, insertSavingsGoalParams{
		UserID:              input.UserID,
		OrganizationID:      input.OrganizationID,
		Name:                input.Name,
		GoalType:            input.GoalType,
		TargetAmount:        input.TargetAmount,
		InitialAmount:       input.InitialAmount,
		DueDate:             input.DueDate,
		StartDate:           input.StartDate,
		Icon:                input.Icon,
		Color:               input.Color,
		Notes:               input.Notes,
		CategoryID:          input.CategoryID,
		MonthlyContribution: input.MonthlyContribution,
	})
	if err != nil {
		return SavingsGoal{}, fmt.Errorf("failed to create savings goal: %w", err)
	}

	return SavingsGoal{}.FromModel(&model), nil
}

func (s *service) UpdateSavingsGoal(ctx context.Context, input UpdateSavingsGoalInput) (SavingsGoal, error) {
	// Validate due date format if provided (empty string is valid - means clear)
	if input.DueDate != nil && *input.DueDate != "" {
		if _, err := time.Parse("2006-01-02", *input.DueDate); err != nil {
			return SavingsGoal{}, fmt.Errorf("invalid due_date format: %w", err)
		}
	}

	// Validate start date format if provided (empty string is valid - means clear)
	if input.StartDate != nil && *input.StartDate != "" {
		if _, err := time.Parse("2006-01-02", *input.StartDate); err != nil {
			return SavingsGoal{}, fmt.Errorf("invalid start_date format: %w", err)
		}
	}

	// Validate target amount if provided
	if input.TargetAmount != nil && input.TargetAmount.LessThanOrEqual(decimal.Zero) {
		return SavingsGoal{}, fmt.Errorf("target_amount must be greater than zero")
	}

	model, err := s.Repository.ModifySavingsGoal(ctx, modifySavingsGoalParams{
		SavingsGoalID:       input.SavingsGoalID,
		UserID:              input.UserID,
		OrganizationID:      input.OrganizationID,
		Name:                input.Name,
		TargetAmount:        input.TargetAmount,
		DueDate:             input.DueDate,    // Empty string clears, nil leaves unchanged
		StartDate:           input.StartDate, // Empty string clears, nil leaves unchanged
		Icon:                input.Icon,
		Color:               input.Color,
		Notes:               input.Notes,
		CategoryID:          input.CategoryID,
		MonthlyContribution: input.MonthlyContribution,
	})
	if err != nil {
		return SavingsGoal{}, fmt.Errorf("failed to update savings goal: %w", err)
	}

	return SavingsGoal{}.FromModel(&model), nil
}

func (s *service) DeleteSavingsGoal(ctx context.Context, input DeleteSavingsGoalInput) error {
	err := s.Repository.RemoveSavingsGoal(ctx, removeSavingsGoalParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return fmt.Errorf("failed to delete savings goal: %w", err)
	}
	return nil
}

func (s *service) CompleteSavingsGoal(ctx context.Context, input CompleteSavingsGoalInput) (SavingsGoal, error) {
	isCompleted := true

	// The repository query automatically sets completed_at when is_completed changes to true
	model, err := s.Repository.ModifySavingsGoal(ctx, modifySavingsGoalParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsCompleted:    &isCompleted,
	})
	if err != nil {
		return SavingsGoal{}, fmt.Errorf("failed to complete savings goal: %w", err)
	}

	return SavingsGoal{}.FromModel(&model), nil
}

func (s *service) ReopenSavingsGoal(ctx context.Context, input ReopenSavingsGoalInput) (SavingsGoal, error) {
	isCompleted := false

	// The repository query automatically clears completed_at when is_completed changes to false
	model, err := s.Repository.ModifySavingsGoal(ctx, modifySavingsGoalParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		IsCompleted:    &isCompleted,
	})
	if err != nil {
		return SavingsGoal{}, fmt.Errorf("failed to reopen savings goal: %w", err)
	}

	return SavingsGoal{}.FromModel(&model), nil
}

func (s *service) GetGoalSummary(ctx context.Context, input GetGoalSummaryInput) (SavingsGoalDetail, error) {
	// Get progress (includes goal, current amount, etc.)
	progress, err := s.GetSavingsGoalProgress(ctx, GetSavingsGoalProgressInput{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalDetail{}, err
	}

	// Get transactions linked to this goal
	transactions, err := s.Repository.FetchGoalContributions(ctx, fetchGoalContributionsParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalDetail{}, fmt.Errorf("failed to fetch goal contributions: %w", err)
	}

	return SavingsGoalDetail{
		Progress:     progress,
		Transactions: Transactions{}.FromModel(transactions),
	}, nil
}

func (s *service) AddContribution(ctx context.Context, input AddContributionInput) (SavingsGoalProgress, error) {
	// 1. Get the current goal to get the current initial_amount
	goal, err := s.Repository.FetchSavingsGoalByID(ctx, fetchSavingsGoalByIDParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
	if err != nil {
		return SavingsGoalProgress{}, fmt.Errorf("failed to fetch savings goal: %w", err)
	}

	// 2. Calculate new initial_amount
	newInitialAmount := goal.InitialAmount.Add(input.Amount)

	// 3. Prevent negative initial_amount
	if newInitialAmount.LessThan(decimal.Zero) {
		return SavingsGoalProgress{}, fmt.Errorf("contribution would result in negative balance")
	}

	// 4. Update the goal's initial_amount
	_, err = s.Repository.AddContribution(ctx, addContributionParams{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
		Amount:         input.Amount,
	})
	if err != nil {
		return SavingsGoalProgress{}, fmt.Errorf("failed to add contribution: %w", err)
	}

	// 5. Return updated progress
	return s.GetSavingsGoalProgress(ctx, GetSavingsGoalProgressInput{
		SavingsGoalID:  input.SavingsGoalID,
		UserID:         input.UserID,
		OrganizationID: input.OrganizationID,
	})
}

// ============================================================================
// Helper Functions
// ============================================================================

func calculateMonthsRemaining(now time.Time, dueDate time.Time) int {
	if dueDate.Before(now) {
		return 0
	}

	months := 0
	current := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	due := time.Date(dueDate.Year(), dueDate.Month(), 1, 0, 0, 0, 0, time.UTC)

	for current.Before(due) || current.Equal(due) {
		months++
		current = current.AddDate(0, 1, 0)
	}

	return months
}

func calculateOnTrackStatus(now, createdAt, dueDate time.Time, targetAmount, currentAmount decimal.Decimal) bool {
	// Calculate expected progress based on time elapsed
	totalMonths := calculateMonthsBetween(createdAt, dueDate)
	elapsedMonths := calculateMonthsBetween(createdAt, now)

	if totalMonths <= 0 {
		return currentAmount.GreaterThanOrEqual(targetAmount)
	}

	// Expected amount = (target / total months) * elapsed months
	expectedAmount := targetAmount.Div(decimal.NewFromInt(int64(totalMonths))).
		Mul(decimal.NewFromInt(int64(elapsedMonths)))

	return currentAmount.GreaterThanOrEqual(expectedAmount)
}

// generateSavingsGoalEntries creates planned entries for savings goals that don't
// have one for the given month yet. Called lazily when budget page loads.
func (s *service) generateSavingsGoalEntries(ctx context.Context, userID, orgID, month, year int) error {
	isActive := true
	isCompleted := false

	// 1. Fetch all active, non-completed savings goals
	goals, err := s.Repository.FetchSavingsGoals(ctx, fetchSavingsGoalsParams{
		UserID:         userID,
		OrganizationID: orgID,
		IsActive:       &isActive,
		IsCompleted:    &isCompleted,
	})
	if err != nil {
		return fmt.Errorf("fetch savings goals: %w", err)
	}

	// 2. Fetch non-recurrent entries with savings_goal_id to check for duplicates
	isNotRecurrent := false
	existingEntries, err := s.Repository.FetchPlannedEntries(ctx, fetchPlannedEntriesParams{
		UserID:         userID,
		OrganizationID: orgID,
		IsActive:       &isActive,
		IsRecurrent:    &isNotRecurrent,
	})
	if err != nil {
		return fmt.Errorf("fetch planned entries: %w", err)
	}

	// Build set of savings_goal_id that already have an entry this month
	existingGoalIDs := make(map[int]bool)
	for _, entry := range existingEntries {
		if entry.SavingsGoalID != nil {
			if int(entry.CreatedAt.Month()) == month && entry.CreatedAt.Year() == year {
				existingGoalIDs[*entry.SavingsGoalID] = true
			}
		}
	}

	now := s.system.Time.Now()
	requestedMonth := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)

	fmt.Printf("[GOAL-ENTRIES] generating entries for %d/%d - goals_found=%d existing_goal_entries=%d\n", month, year, len(goals), len(existingGoalIDs))

	for _, goal := range goals {
		// Skip goals without a category
		if goal.CategoryID == nil {
			fmt.Printf("[GOAL-ENTRIES] skip goal %d (%s): no category\n", goal.SavingsGoalID, goal.Name)
			continue
		}

		// Skip if before start date
		if goal.StartDate != nil {
			startMonth := time.Date(goal.StartDate.Year(), goal.StartDate.Month(), 1, 0, 0, 0, 0, time.UTC)
			if requestedMonth.Before(startMonth) {
				fmt.Printf("[GOAL-ENTRIES] skip goal %d (%s): before start date %v\n", goal.SavingsGoalID, goal.Name, goal.StartDate)
				continue
			}
		}

		// Skip if already has an entry for this month
		if existingGoalIDs[goal.SavingsGoalID] {
			fmt.Printf("[GOAL-ENTRIES] skip goal %d (%s): entry already exists\n", goal.SavingsGoalID, goal.Name)
			continue
		}

		// Calculate the amount for this month
		amount, ok := s.calculateGoalMonthlyAmount(ctx, goal, now, requestedMonth)
		if !ok {
			fmt.Printf("[GOAL-ENTRIES] skip goal %d (%s): amount calc returned false (type=%s)\n", goal.SavingsGoalID, goal.Name, goal.GoalType)
			continue
		}

		fmt.Printf("[GOAL-ENTRIES] creating entry for goal %d (%s): amount=%s category=%d\n", goal.SavingsGoalID, goal.Name, amount.String(), *goal.CategoryID)

		// Create the planned entry
		goalID := goal.SavingsGoalID
		_, err := s.Repository.InsertPlannedEntry(ctx, insertPlannedEntryParams{
			UserID:         userID,
			OrganizationID: orgID,
			CategoryID:     *goal.CategoryID,
			SavingsGoalID:  &goalID,
			Description:    goal.Name,
			Amount:         amount,
			EntryType:      PlannedEntryTypeExpense,
			IsRecurrent:    false,
		})
		if err != nil {
			// Duplicate key errors are expected during parallel requests - silently skip
			if strings.Contains(err.Error(), "duplicate key") || strings.Contains(err.Error(), "unique constraint") {
				fmt.Printf("[GOAL-ENTRIES] skip goal %d (%s): already exists (concurrent create)\n", goal.SavingsGoalID, goal.Name)
			} else {
				fmt.Printf("[GOAL-ENTRIES] ERROR creating entry for goal %d (%s): %v\n", goal.SavingsGoalID, goal.Name, err)
			}
			continue
		}

		fmt.Printf("[GOAL-ENTRIES] created entry for goal %d (%s)\n", goal.SavingsGoalID, goal.Name)
	}

	return nil
}

// calculateGoalMonthlyAmount returns the amount for a savings goal planned entry.
// Returns (amount, true) if an entry should be created, or (zero, false) to skip.
func (s *service) calculateGoalMonthlyAmount(ctx context.Context, goal SavingsGoalModel, now time.Time, requestedMonth time.Time) (decimal.Decimal, bool) {
	// Calculate current amount (initial + transactions)
	transactions, err := s.Repository.FetchGoalContributions(ctx, fetchGoalContributionsParams{
		SavingsGoalID:  goal.SavingsGoalID,
		UserID:         goal.UserID,
		OrganizationID: goal.OrganizationID,
	})
	if err != nil {
		return decimal.Zero, false
	}

	currentAmount := goal.InitialAmount
	for _, tx := range transactions {
		if tx.TransactionType == TransactionTypeCredit {
			currentAmount = currentAmount.Add(tx.Amount)
		} else {
			currentAmount = currentAmount.Sub(tx.Amount)
		}
	}

	// Skip if goal already reached
	if currentAmount.GreaterThanOrEqual(goal.TargetAmount) {
		return decimal.Zero, false
	}

	remaining := goal.TargetAmount.Sub(currentAmount)

	switch goal.GoalType {
	case SavingsGoalTypeReserva:
		if goal.DueDate == nil {
			return decimal.Zero, false
		}
		if goal.DueDate.Before(requestedMonth) {
			return decimal.Zero, false
		}
		monthsRemaining := calculateMonthsRemaining(requestedMonth, *goal.DueDate)
		if monthsRemaining <= 0 {
			return remaining, true
		}
		return remaining.Div(decimal.NewFromInt(int64(monthsRemaining))), true

	case SavingsGoalTypeInvestimento:
		if goal.MonthlyContribution == nil || goal.MonthlyContribution.IsZero() {
			return decimal.Zero, false
		}
		if goal.MonthlyContribution.GreaterThan(remaining) {
			return remaining, true
		}
		return *goal.MonthlyContribution, true

	default:
		return decimal.Zero, false
	}
}

func calculateMonthsBetween(start, end time.Time) int {
	if end.Before(start) {
		return 0
	}

	months := 0
	current := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.UTC)
	target := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, time.UTC)

	for current.Before(target) {
		months++
		current = current.AddDate(0, 1, 0)
	}

	return months
}
