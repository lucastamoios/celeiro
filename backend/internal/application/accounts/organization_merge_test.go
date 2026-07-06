package accounts

import (
	"context"
	"testing"

	database "github.com/catrutech/celeiro/pkg/database/persistent"
	"github.com/stretchr/testify/require"
)

func TestOrganizationMergeRepository_Merge_DryRunReportsResolvedOrganizationsAndCounts(t *testing.T) {
	// ARRANGE
	db := database.NewMemoryDatabase()
	repo := NewOrganizationMergeRepository(db)

	db.ExpectQuery(fetchOrganizationMergeMembershipsQuery, "wife@example.com").
		WillReturn([]organizationMembershipModel{
			{UserID: 20, Name: "Wife", Email: "wife@example.com", OrganizationID: 200, IsDefault: true},
			{UserID: 20, Name: "Wife", Email: "wife@example.com", OrganizationID: 100, IsDefault: false},
		})
	db.ExpectQuery(fetchOrganizationMergeMembershipsQuery, "lucas@example.com").
		WillReturn([]organizationMembershipModel{
			{UserID: 10, Name: "Lucas", Email: "lucas@example.com", OrganizationID: 100, IsDefault: true},
		})
	db.ExpectQuery(fetchOrganizationMergeCountsQuery, 200).
		WillReturn([]OrganizationMergeCount{
			{Name: "accounts", Count: 2},
			{Name: "transactions", Count: 42},
		})

	// ACT
	output, err := repo.Merge(context.Background(), OrganizationMergeInput{
		SourceUserEmail: "wife@example.com",
		TargetUserEmail: "lucas@example.com",
		Role:            RoleRegularUser,
		Execute:         false,
	})

	// ASSERT
	require.NoError(t, err)
	require.Equal(t, 20, output.SourceUser.UserID)
	require.Equal(t, 10, output.TargetUser.UserID)
	require.Equal(t, 200, output.SourceOrganizationID)
	require.Equal(t, 100, output.TargetOrganizationID)
	require.False(t, output.Execute)
	require.Equal(t, []OrganizationMergeCount{
		{Name: "accounts", Count: 2},
		{Name: "transactions", Count: 42},
	}, output.Counts)
	require.NoError(t, db.ExpectationsWereMet())
}

func TestPickSourceOrganization_RequiresExplicitOrganizationWhenAmbiguous(t *testing.T) {
	// ARRANGE
	memberships := []organizationMembershipModel{
		{OrganizationID: 100, IsDefault: true},
		{OrganizationID: 200},
		{OrganizationID: 300},
	}

	// ACT
	_, err := pickSourceOrganization(memberships, 100, 0)

	// ASSERT
	require.ErrorContains(t, err, "multiple non-target organizations")
}
