package accounts

import (
	"context"
	"database/sql"
	stderrors "errors"
	"fmt"
	"strings"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	pkgerrors "github.com/catrutech/celeiro/pkg/errors"
)

type OrganizationMergeInput struct {
	SourceUserEmail     string
	TargetUserEmail     string
	SourceOrganizationID int
	TargetOrganizationID int
	Role                 Role
	Execute              bool
}

type OrganizationMergeOutput struct {
	SourceUser           User
	TargetUser           User
	SourceOrganizationID int
	TargetOrganizationID int
	Role                 Role
	Execute              bool
	Counts               []OrganizationMergeCount
}

type OrganizationMergeCount struct {
	Name  string
	Count int
}

type organizationMembershipModel struct {
	UserID         int    `db:"user_id"`
	Name           string `db:"name"`
	Email          string `db:"email"`
	OrganizationID int    `db:"organization_id"`
	IsDefault      bool   `db:"is_default"`
}

type organizationMergeRepository struct {
	db database.Database
}

func (s *service) MergeOrganizations(ctx context.Context, params OrganizationMergeInput) (OrganizationMergeOutput, error) {
	return NewOrganizationMergeRepository(s.db).Merge(ctx, params)
}

func NewOrganizationMergeRepository(db database.Database) *organizationMergeRepository {
	return &organizationMergeRepository{db: db}
}

func (r *organizationMergeRepository) Merge(ctx context.Context, input OrganizationMergeInput) (OrganizationMergeOutput, error) {
	if input.Role == "" {
		input.Role = RoleRegularUser
	}
	if err := input.validate(); err != nil {
		return OrganizationMergeOutput{}, err
	}

	sourceMemberships, err := r.fetchMemberships(ctx, input.SourceUserEmail)
	if err != nil {
		return OrganizationMergeOutput{}, err
	}
	if len(sourceMemberships) == 0 {
		return OrganizationMergeOutput{}, pkgerrors.New("source user not found or has no organizations")
	}

	targetMemberships, err := r.fetchMemberships(ctx, input.TargetUserEmail)
	if err != nil {
		return OrganizationMergeOutput{}, err
	}
	if len(targetMemberships) == 0 {
		return OrganizationMergeOutput{}, pkgerrors.New("target user not found or has no organizations")
	}

	targetOrgID, err := pickTargetOrganization(targetMemberships, input.TargetOrganizationID)
	if err != nil {
		return OrganizationMergeOutput{}, err
	}

	sourceOrgID, err := pickSourceOrganization(sourceMemberships, targetOrgID, input.SourceOrganizationID)
	if err != nil {
		return OrganizationMergeOutput{}, err
	}

	sourceUser := sourceMemberships[0]
	targetUser := targetMemberships[0]

	counts, err := r.fetchCounts(ctx, sourceOrgID)
	if err != nil {
		return OrganizationMergeOutput{}, err
	}

	output := OrganizationMergeOutput{
		SourceUser: User{
			UserID: sourceUser.UserID,
			Name:   sourceUser.Name,
			Email:  sourceUser.Email,
		},
		TargetUser: User{
			UserID: targetUser.UserID,
			Name:   targetUser.Name,
			Email:  targetUser.Email,
		},
		SourceOrganizationID: sourceOrgID,
		TargetOrganizationID: targetOrgID,
		Role:                 input.Role,
		Execute:              input.Execute,
		Counts:               counts,
	}

	if !input.Execute {
		return output, nil
	}

	if err := r.ensureSafeToMove(ctx, sourceOrgID, targetOrgID, sourceUser.UserID); err != nil {
		return OrganizationMergeOutput{}, err
	}

	err = r.db.Tx(ctx, func(ctx context.Context) error {
		if err := r.ensureTargetMembership(ctx, sourceUser.UserID, targetOrgID, input.Role); err != nil {
			return err
		}
		if err := r.setDefaultOrganization(ctx, sourceUser.UserID, targetOrgID); err != nil {
			return err
		}
		if err := r.moveOrganizationData(ctx, sourceOrgID, targetOrgID); err != nil {
			return err
		}
		return r.removeSourceMembership(ctx, sourceUser.UserID, sourceOrgID)
	})
	if err != nil {
		return OrganizationMergeOutput{}, err
	}

	return output, nil
}

func (input OrganizationMergeInput) validate() error {
	if strings.TrimSpace(input.SourceUserEmail) == "" {
		return pkgerrors.New("source user email is required")
	}
	if strings.TrimSpace(input.TargetUserEmail) == "" {
		return pkgerrors.New("target user email is required")
	}
	if strings.EqualFold(input.SourceUserEmail, input.TargetUserEmail) {
		return pkgerrors.New("source and target users must be different")
	}
	if !input.Role.IsValid() {
		return pkgerrors.New("invalid role")
	}
	return nil
}

const fetchOrganizationMergeMembershipsQuery = `
	-- accounts.fetchOrganizationMergeMembershipsQuery
	SELECT
		u.user_id,
		u.name,
		u.email,
		uo.organization_id,
		uo.is_default
	FROM users u
	INNER JOIN user_organizations uo ON uo.user_id = u.user_id
	WHERE LOWER(u.email) = LOWER($1)
	ORDER BY uo.is_default DESC, uo.organization_id ASC;
`

func (r *organizationMergeRepository) fetchMemberships(ctx context.Context, email string) ([]organizationMembershipModel, error) {
	var memberships []organizationMembershipModel
	err := r.db.Query(ctx, &memberships, fetchOrganizationMergeMembershipsQuery, strings.TrimSpace(email))
	if err != nil {
		return nil, err
	}
	return memberships, nil
}

func pickTargetOrganization(memberships []organizationMembershipModel, requestedID int) (int, error) {
	if requestedID != 0 {
		for _, membership := range memberships {
			if membership.OrganizationID == requestedID {
				return requestedID, nil
			}
		}
		return 0, pkgerrors.New("target user does not belong to requested target organization")
	}

	for _, membership := range memberships {
		if membership.IsDefault {
			return membership.OrganizationID, nil
		}
	}
	return memberships[0].OrganizationID, nil
}

func pickSourceOrganization(memberships []organizationMembershipModel, targetOrgID int, requestedID int) (int, error) {
	if requestedID != 0 {
		for _, membership := range memberships {
			if membership.OrganizationID == requestedID {
				if requestedID == targetOrgID {
					return 0, pkgerrors.New("source organization must be different from target organization")
				}
				return requestedID, nil
			}
		}
		return 0, pkgerrors.New("source user does not belong to requested source organization")
	}

	var candidates []int
	for _, membership := range memberships {
		if membership.OrganizationID != targetOrgID {
			candidates = append(candidates, membership.OrganizationID)
		}
	}

	if len(candidates) == 0 {
		return 0, pkgerrors.New("source user has no separate organization to move")
	}
	if len(candidates) > 1 {
		return 0, pkgerrors.New("source user has multiple non-target organizations; pass --source-organization-id")
	}
	return candidates[0], nil
}

const fetchOrganizationMergeCountsQuery = `
	-- accounts.fetchOrganizationMergeCountsQuery
	SELECT 'accounts' AS name, COUNT(*) AS count FROM accounts WHERE organization_id = $1
	UNION ALL SELECT 'transactions', COUNT(*) FROM transactions t INNER JOIN accounts a ON a.account_id = t.account_id WHERE a.organization_id = $1
	UNION ALL SELECT 'categories', COUNT(*) FROM categories WHERE organization_id = $1
	UNION ALL SELECT 'tags', COUNT(*) FROM tags WHERE organization_id = $1
	UNION ALL SELECT 'category_budgets', COUNT(*) FROM category_budgets WHERE organization_id = $1
	UNION ALL SELECT 'planned_entries', COUNT(*) FROM planned_entries WHERE organization_id = $1
	UNION ALL SELECT 'planned_entry_statuses', COUNT(*) FROM planned_entry_statuses pes INNER JOIN planned_entries pe ON pe.planned_entry_id = pes.planned_entry_id WHERE pe.organization_id = $1
	UNION ALL SELECT 'monthly_snapshots', COUNT(*) FROM monthly_snapshots WHERE organization_id = $1
	UNION ALL SELECT 'patterns', COUNT(*) FROM patterns WHERE organization_id = $1
	UNION ALL SELECT 'savings_goals', COUNT(*) FROM savings_goals WHERE organization_id = $1
	UNION ALL SELECT 'budgets', COUNT(*) FROM budgets WHERE organization_id = $1
	UNION ALL SELECT 'budget_items', COUNT(*) FROM budget_items bi INNER JOIN budgets b ON b.budget_id = bi.budget_id WHERE b.organization_id = $1
	ORDER BY name;
`

func (r *organizationMergeRepository) fetchCounts(ctx context.Context, sourceOrgID int) ([]OrganizationMergeCount, error) {
	var counts []OrganizationMergeCount
	err := r.db.Query(ctx, &counts, fetchOrganizationMergeCountsQuery, sourceOrgID)
	if err != nil {
		return nil, err
	}
	return counts, nil
}

type organizationMergeSafetyResult struct {
	SourceMemberCount       int `db:"source_member_count"`
	OpenSavingsGoalConflict int `db:"open_savings_goal_conflict"`
	CategoryBudgetConflict  int `db:"category_budget_conflict"`
	MonthlySnapshotConflict int `db:"monthly_snapshot_conflict"`
}

const fetchOrganizationMergeSafetyQuery = `
	-- accounts.fetchOrganizationMergeSafetyQuery
	SELECT
		(SELECT COUNT(*) FROM user_organizations WHERE organization_id = $1) AS source_member_count,
		(
			SELECT COUNT(*)
			FROM savings_goals sg
			WHERE sg.organization_id = $1
				AND sg.is_active = true
				AND sg.is_completed = false
				AND EXISTS (
					SELECT 1
					FROM savings_goals target_sg
					WHERE target_sg.organization_id = $2
						AND target_sg.name = sg.name
						AND target_sg.is_active = true
						AND target_sg.is_completed = false
				)
		) AS open_savings_goal_conflict,
		(
			SELECT COUNT(*)
			FROM category_budgets cb
			WHERE cb.organization_id = $1
				AND EXISTS (
					SELECT 1
					FROM category_budgets target_cb
					WHERE target_cb.user_id = cb.user_id
						AND target_cb.organization_id = $2
						AND target_cb.category_id = cb.category_id
						AND target_cb.month = cb.month
						AND target_cb.year = cb.year
				)
		) AS category_budget_conflict,
		(
			SELECT COUNT(*)
			FROM monthly_snapshots ms
			WHERE ms.organization_id = $1
				AND EXISTS (
					SELECT 1
					FROM monthly_snapshots target_ms
					WHERE target_ms.user_id = ms.user_id
						AND target_ms.organization_id = $2
						AND target_ms.category_id = ms.category_id
						AND target_ms.month = ms.month
						AND target_ms.year = ms.year
				)
		) AS monthly_snapshot_conflict;
`

func (r *organizationMergeRepository) ensureSafeToMove(ctx context.Context, sourceOrgID, targetOrgID, sourceUserID int) error {
	var result organizationMergeSafetyResult
	if err := r.db.Query(ctx, &result, fetchOrganizationMergeSafetyQuery, sourceOrgID, targetOrgID); err != nil {
		return err
	}

	if result.SourceMemberCount != 1 {
		return fmt.Errorf("source organization has %d members; refusing to move shared organization data", result.SourceMemberCount)
	}
	if result.OpenSavingsGoalConflict > 0 {
		return fmt.Errorf("target organization already has %d open savings goal name conflicts", result.OpenSavingsGoalConflict)
	}
	if result.CategoryBudgetConflict > 0 {
		return fmt.Errorf("target organization already has %d category budget conflicts", result.CategoryBudgetConflict)
	}
	if result.MonthlySnapshotConflict > 0 {
		return fmt.Errorf("target organization already has %d monthly snapshot conflicts", result.MonthlySnapshotConflict)
	}

	var sourceMembership organizationMembershipModel
	err := r.db.Query(ctx, &sourceMembership, fetchOrganizationMembershipByUserAndOrgQuery, sourceUserID, sourceOrgID)
	if err != nil {
		return err
	}
	return nil
}

const fetchOrganizationMembershipByUserAndOrgQuery = `
	-- accounts.fetchOrganizationMembershipByUserAndOrgQuery
	SELECT
		u.user_id,
		u.name,
		u.email,
		uo.organization_id,
		uo.is_default
	FROM users u
	INNER JOIN user_organizations uo ON uo.user_id = u.user_id
	WHERE u.user_id = $1
		AND uo.organization_id = $2;
`

const ensureOrganizationMergeMembershipQuery = `
	-- accounts.ensureOrganizationMergeMembershipQuery
	INSERT INTO user_organizations (user_id, organization_id, user_role)
	VALUES ($1, $2, $3)
	ON CONFLICT (user_id, organization_id) DO NOTHING;
`

func (r *organizationMergeRepository) ensureTargetMembership(ctx context.Context, userID, organizationID int, role Role) error {
	return r.db.Run(ctx, ensureOrganizationMergeMembershipQuery, userID, organizationID, role)
}

const setOrganizationMergeDefaultQuery = `
	-- accounts.setOrganizationMergeDefaultQuery
	WITH clear_default AS (
		UPDATE user_organizations
		SET is_default = false
		WHERE user_id = $1
	)
	UPDATE user_organizations
	SET is_default = true
	WHERE user_id = $1
		AND organization_id = $2;
`

func (r *organizationMergeRepository) setDefaultOrganization(ctx context.Context, userID, organizationID int) error {
	return r.db.Run(ctx, setOrganizationMergeDefaultQuery, userID, organizationID)
}

const removeOrganizationMergeSourceMembershipQuery = `
	-- accounts.removeOrganizationMergeSourceMembershipQuery
	DELETE FROM user_organizations
	WHERE user_id = $1
		AND organization_id = $2;
`

func (r *organizationMergeRepository) removeSourceMembership(ctx context.Context, userID, organizationID int) error {
	return r.db.Run(ctx, removeOrganizationMergeSourceMembershipQuery, userID, organizationID)
}

func (r *organizationMergeRepository) moveOrganizationData(ctx context.Context, sourceOrgID, targetOrgID int) error {
	queries := []string{
		`UPDATE categories SET organization_id = $2 WHERE organization_id = $1 AND is_system = false;`,
		`UPDATE tags SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE savings_goals SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE accounts SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE category_budgets SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE planned_entries SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE monthly_snapshots SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE patterns SET organization_id = $2 WHERE organization_id = $1;`,
		`UPDATE budgets SET organization_id = $2 WHERE organization_id = $1;`,
	}

	for _, query := range queries {
		if err := r.db.Run(ctx, query, sourceOrgID, targetOrgID); err != nil {
			if stderrors.Is(err, sql.ErrNoRows) {
				continue
			}
			return err
		}
	}
	return nil
}
