package accounts

import (
	"context"
	"fmt"
	"strings"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/spf13/cobra"
)

var mergeOrganizationsCmd = &cobra.Command{
	Use:   "mergeOrganizations",
	Short: "Move one user's personal organization data into another user's organization",
	Long: strings.TrimSpace(`
Move one user's personal organization data into another user's organization.

By default this command is a dry run. Pass --execute to add the source user to
the target organization, set that organization as their default, and move the
source organization's financial data into the target organization.
`),
	Run: func(cmd *cobra.Command, args []string) {
		RunMergeOrganizations(application.GetApplication(), cmd, args)
	},
}

func init() {
	AccountsRootCmd.AddCommand(mergeOrganizationsCmd)

	mergeOrganizationsCmd.Flags().String("source-email", "", "Email of the user whose separate organization should be moved")
	mergeOrganizationsCmd.MarkFlagRequired("source-email")

	mergeOrganizationsCmd.Flags().String("target-email", "", "Email of the user whose organization should receive the data")
	mergeOrganizationsCmd.MarkFlagRequired("target-email")

	mergeOrganizationsCmd.Flags().Int("source-organization-id", 0, "Source organization ID; required if the source user has multiple non-target organizations")
	mergeOrganizationsCmd.Flags().Int("target-organization-id", 0, "Target organization ID; defaults to the target user's default organization")
	mergeOrganizationsCmd.Flags().String("role", string(accounts.RoleRegularUser), "Role to grant the source user in the target organization")
	mergeOrganizationsCmd.Flags().Bool("execute", false, "Actually perform the merge; omitted means dry run")
}

func RunMergeOrganizations(application *application.Application, cmd *cobra.Command, args []string) {
	sourceEmail, _ := cmd.Flags().GetString("source-email")
	targetEmail, _ := cmd.Flags().GetString("target-email")
	sourceOrganizationID, _ := cmd.Flags().GetInt("source-organization-id")
	targetOrganizationID, _ := cmd.Flags().GetInt("target-organization-id")
	role, _ := cmd.Flags().GetString("role")
	execute, _ := cmd.Flags().GetBool("execute")

	roleEnum := accounts.Role(role)
	if !roleEnum.IsValid() {
		fmt.Println("Invalid role: " + role)
		return
	}

	output, err := application.AccountsService.MergeOrganizations(context.Background(), accounts.OrganizationMergeInput{
		SourceUserEmail:     sourceEmail,
		TargetUserEmail:     targetEmail,
		SourceOrganizationID: sourceOrganizationID,
		TargetOrganizationID: targetOrganizationID,
		Role:                 roleEnum,
		Execute:              execute,
	})
	if err != nil {
		fmt.Println("Merge failed:", err)
		return
	}

	if execute {
		fmt.Println("Organization merge executed.")
	} else {
		fmt.Println("Dry run only. Re-run with --execute to apply these changes.")
	}
	fmt.Printf("Source user: %s (%d)\n", output.SourceUser.Email, output.SourceUser.UserID)
	fmt.Printf("Target user: %s (%d)\n", output.TargetUser.Email, output.TargetUser.UserID)
	fmt.Printf("Source organization: %d\n", output.SourceOrganizationID)
	fmt.Printf("Target organization: %d\n", output.TargetOrganizationID)
	fmt.Printf("Role in target organization: %s\n", output.Role)
	fmt.Println("Rows in source organization:")
	for _, count := range output.Counts {
		fmt.Printf("- %s: %d\n", count.Name, count.Count)
	}
}
