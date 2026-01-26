package integration

import (
	"context"
	"testing"

	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/stretchr/testify/suite"
)

func TestFinancialTestSuite(t *testing.T) {
	suite.Run(t, new(FinancialTestSuite))
}

type FinancialTestSuite struct {
	BaseTestSuite
	financialRepo financial.Repository
}

func (test *FinancialTestSuite) SetupSuite() {
	test.SetupBaseSuite()
	test.financialRepo = financial.NewRepository(test.DB)
}

func (test *FinancialTestSuite) SetupTest() {
	test.SetupBaseTest()
}

func (test *FinancialTestSuite) TestPlannedEntry_ClearPatternID_UsingSentinel() {
	ctx := context.Background()

	auth := test.CreateUserAndAuthenticate("pattern-test@example.com", "Pattern Test User", "Pattern Test Org")
	userID := auth.GetUserID()
	orgID := auth.GetOrganizationID()

	var categoryID int
	err := test.DB.Query(ctx, &categoryID, `
		INSERT INTO categories (organization_id, name, icon, category_type)
		VALUES ($1, 'Test Category', '🏷️', 'expense')
		RETURNING category_id
	`, orgID)
	test.Require().NoError(err)

	var patternID int
	err = test.DB.Query(ctx, &patternID, `
		INSERT INTO patterns (user_id, organization_id, description_pattern, target_description, target_category_id)
		VALUES ($1, $2, '.*TEST.*', 'Test Pattern', $3)
		RETURNING pattern_id
	`, userID, orgID, categoryID)
	test.Require().NoError(err)

	var entryID int
	err = test.DB.Query(ctx, &entryID, `
		INSERT INTO planned_entries (user_id, organization_id, category_id, pattern_id, description, amount, entry_type, is_recurrent)
		VALUES ($1, $2, $3, $4, 'Test Entry with Pattern', 100.00, 'expense', false)
		RETURNING planned_entry_id
	`, userID, orgID, categoryID, patternID)
	test.Require().NoError(err)

	var patternIDBefore *int
	err = test.DB.Query(ctx, &patternIDBefore, `
		SELECT pattern_id FROM planned_entries WHERE planned_entry_id = $1
	`, entryID)
	test.Require().NoError(err)
	test.Require().NotNil(patternIDBefore, "pattern_id should be set initially")
	test.Require().Equal(patternID, *patternIDBefore)

	var updatedEntry financial.PlannedEntryModel
	err = test.DB.Query(ctx, &updatedEntry, `
		UPDATE planned_entries
		SET
			pattern_id = CASE
				WHEN $4::int = -1 THEN NULL
				WHEN $4::int IS NOT NULL THEN $4
				ELSE pattern_id
			END,
			updated_at = CURRENT_TIMESTAMP
		WHERE planned_entry_id = $1
			AND user_id = $2
			AND organization_id = $3
		RETURNING
			planned_entry_id, created_at, updated_at, user_id, organization_id,
			category_id, pattern_id, savings_goal_id, description, amount,
			amount_min, amount_max, expected_day_start, expected_day_end,
			expected_day, entry_type, is_recurrent, parent_entry_id, is_active
	`, entryID, userID, orgID, -1)
	test.Require().NoError(err)

	test.Nil(updatedEntry.PatternID, "pattern_id should be NULL after sentinel update")

	var patternIDAfter *int
	err = test.DB.Query(ctx, &patternIDAfter, `
		SELECT pattern_id FROM planned_entries WHERE planned_entry_id = $1
	`, entryID)
	test.Require().NoError(err)
	test.Nil(patternIDAfter, "pattern_id should be NULL in database after sentinel update")
}

func (test *FinancialTestSuite) TestPlannedEntry_UpdatePatternID_PreservesExisting() {
	ctx := context.Background()

	auth := test.CreateUserAndAuthenticate("pattern-preserve@example.com", "Pattern Preserve User", "Pattern Preserve Org")
	userID := auth.GetUserID()
	orgID := auth.GetOrganizationID()

	var categoryID int
	err := test.DB.Query(ctx, &categoryID, `
		INSERT INTO categories (organization_id, name, icon, category_type)
		VALUES ($1, 'Test Category', '🏷️', 'expense')
		RETURNING category_id
	`, orgID)
	test.Require().NoError(err)

	var patternID int
	err = test.DB.Query(ctx, &patternID, `
		INSERT INTO patterns (user_id, organization_id, description_pattern, target_description, target_category_id)
		VALUES ($1, $2, '.*PRESERVE.*', 'Preserve Pattern', $3)
		RETURNING pattern_id
	`, userID, orgID, categoryID)
	test.Require().NoError(err)

	var entryID int
	err = test.DB.Query(ctx, &entryID, `
		INSERT INTO planned_entries (user_id, organization_id, category_id, pattern_id, description, amount, entry_type, is_recurrent)
		VALUES ($1, $2, $3, $4, 'Test Entry with Pattern', 100.00, 'expense', false)
		RETURNING planned_entry_id
	`, userID, orgID, categoryID, patternID)
	test.Require().NoError(err)

	newDescription := "Updated Description"
	var updatedEntry financial.PlannedEntryModel
	err = test.DB.Query(ctx, &updatedEntry, `
		UPDATE planned_entries
		SET
			pattern_id = CASE
				WHEN $4::int = -1 THEN NULL
				WHEN $4::int IS NOT NULL THEN $4
				ELSE pattern_id
			END,
			description = COALESCE($5, description),
			updated_at = CURRENT_TIMESTAMP
		WHERE planned_entry_id = $1
			AND user_id = $2
			AND organization_id = $3
		RETURNING
			planned_entry_id, created_at, updated_at, user_id, organization_id,
			category_id, pattern_id, savings_goal_id, description, amount,
			amount_min, amount_max, expected_day_start, expected_day_end,
			expected_day, entry_type, is_recurrent, parent_entry_id, is_active
	`, entryID, userID, orgID, nil, newDescription)
	test.Require().NoError(err)

	test.Require().NotNil(updatedEntry.PatternID, "pattern_id should be preserved when not provided")
	test.Equal(patternID, *updatedEntry.PatternID)
	test.Equal("Updated Description", updatedEntry.Description)
}

func (test *FinancialTestSuite) TestPlannedEntry_SetPatternID_FromNull() {
	ctx := context.Background()

	auth := test.CreateUserAndAuthenticate("pattern-set@example.com", "Pattern Set User", "Pattern Set Org")
	userID := auth.GetUserID()
	orgID := auth.GetOrganizationID()

	var categoryID int
	err := test.DB.Query(ctx, &categoryID, `
		INSERT INTO categories (organization_id, name, icon, category_type)
		VALUES ($1, 'Test Category', '🏷️', 'expense')
		RETURNING category_id
	`, orgID)
	test.Require().NoError(err)

	var patternID int
	err = test.DB.Query(ctx, &patternID, `
		INSERT INTO patterns (user_id, organization_id, description_pattern, target_description, target_category_id)
		VALUES ($1, $2, '.*SETNEW.*', 'Set New Pattern', $3)
		RETURNING pattern_id
	`, userID, orgID, categoryID)
	test.Require().NoError(err)

	var entryID int
	err = test.DB.Query(ctx, &entryID, `
		INSERT INTO planned_entries (user_id, organization_id, category_id, pattern_id, description, amount, entry_type, is_recurrent)
		VALUES ($1, $2, $3, NULL, 'Test Entry without Pattern', 100.00, 'expense', false)
		RETURNING planned_entry_id
	`, userID, orgID, categoryID)
	test.Require().NoError(err)

	var patternIDBefore *int
	err = test.DB.Query(ctx, &patternIDBefore, `
		SELECT pattern_id FROM planned_entries WHERE planned_entry_id = $1
	`, entryID)
	test.Require().NoError(err)
	test.Nil(patternIDBefore, "pattern_id should be NULL initially")

	var updatedEntry financial.PlannedEntryModel
	err = test.DB.Query(ctx, &updatedEntry, `
		UPDATE planned_entries
		SET
			pattern_id = CASE
				WHEN $4::int = -1 THEN NULL
				WHEN $4::int IS NOT NULL THEN $4
				ELSE pattern_id
			END,
			updated_at = CURRENT_TIMESTAMP
		WHERE planned_entry_id = $1
			AND user_id = $2
			AND organization_id = $3
		RETURNING
			planned_entry_id, created_at, updated_at, user_id, organization_id,
			category_id, pattern_id, savings_goal_id, description, amount,
			amount_min, amount_max, expected_day_start, expected_day_end,
			expected_day, entry_type, is_recurrent, parent_entry_id, is_active
	`, entryID, userID, orgID, patternID)
	test.Require().NoError(err)

	test.Require().NotNil(updatedEntry.PatternID, "pattern_id should be set after update")
	test.Equal(patternID, *updatedEntry.PatternID)
}
