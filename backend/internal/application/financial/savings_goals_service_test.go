package financial

import (
	"context"
	"testing"
	"time"

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSavingsGoalService_CalculateGoalMonthlyAmount_DebitContributionReducesRemainingBudget(t *testing.T) {
	ctx := context.Background()
	repository := new(MockRepository)
	svc := &service{Repository: repository}
	dueDate := time.Date(2027, time.February, 1, 0, 0, 0, 0, time.UTC)
	requestedMonth := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	goal := SavingsGoalModel{
		SavingsGoalID:  4,
		UserID:         10,
		OrganizationID: 3,
		GoalType:       SavingsGoalTypeReserva,
		TargetAmount:   decimal.NewFromInt(30000),
		InitialAmount:  decimal.Zero,
		DueDate:        &dueDate,
	}

	repository.On("FetchGoalContributions", ctx, fetchGoalContributionsParams{
		SavingsGoalID:  goal.SavingsGoalID,
		UserID:         goal.UserID,
		OrganizationID: goal.OrganizationID,
	}).Return([]TransactionModel{{
		TransactionType: TransactionTypeDebit,
		Amount:          decimal.NewFromInt(7125),
	}}, nil).Once()

	amount, ok := svc.calculateGoalMonthlyAmount(ctx, goal, requestedMonth, requestedMonth)

	require.True(t, ok)
	assert.True(t, decimal.NewFromFloat(3812.50).Equal(amount), "expected 3812.50, got %s", amount)
	repository.AssertExpectations(t)
}

func TestSavingsGoalService_CalculateGoalMonthlyAmount_CreditWithdrawalIncreasesRemainingBudget(t *testing.T) {
	ctx := context.Background()
	repository := new(MockRepository)
	svc := &service{Repository: repository}
	dueDate := time.Date(2026, time.December, 1, 0, 0, 0, 0, time.UTC)
	requestedMonth := time.Date(2026, time.September, 1, 0, 0, 0, 0, time.UTC)
	goal := SavingsGoalModel{
		SavingsGoalID:  5,
		UserID:         10,
		OrganizationID: 3,
		GoalType:       SavingsGoalTypeReserva,
		TargetAmount:   decimal.NewFromInt(12000),
		InitialAmount:  decimal.NewFromInt(5000),
		DueDate:        &dueDate,
	}

	repository.On("FetchGoalContributions", ctx, fetchGoalContributionsParams{
		SavingsGoalID:  goal.SavingsGoalID,
		UserID:         goal.UserID,
		OrganizationID: goal.OrganizationID,
	}).Return([]TransactionModel{{
		TransactionType: TransactionTypeCredit,
		Amount:          decimal.NewFromInt(1000),
	}}, nil).Once()

	amount, ok := svc.calculateGoalMonthlyAmount(ctx, goal, requestedMonth, requestedMonth)

	require.True(t, ok)
	assert.True(t, decimal.NewFromInt(2000).Equal(amount), "expected 2000, got %s", amount)
	repository.AssertExpectations(t)
}
