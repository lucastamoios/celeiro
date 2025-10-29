package accounts

import (
	"context"
	"fmt"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/spf13/cobra"
)

// registerUserCmd represents the registerUser command
var registerUserCmd = &cobra.Command{
	Use:   "registerUser",
	Short: "Register a new user",
	Long:  "Register a new user",
	Run: func(cmd *cobra.Command, args []string) {
		Run(application.GetApplication(), cmd, args)
	},
}

func init() {
	AccountsRootCmd.AddCommand(registerUserCmd)

	registerUserCmd.Flags().StringP("name", "n", "", "Name of the user")
	registerUserCmd.MarkFlagRequired("name")

	registerUserCmd.Flags().StringP("email", "e", "", "Email of the user")
	registerUserCmd.MarkFlagRequired("email")

	registerUserCmd.Flags().StringP("organization-name", "o", "", "Name of the organization")
	registerUserCmd.MarkFlagRequired("organization-name")

	registerUserCmd.Flags().StringP("role", "r", "", "Role of the user")
	registerUserCmd.MarkFlagRequired("role")
}

func Run(application *application.Application, cmd *cobra.Command, args []string) {
	name, err := cmd.Flags().GetString("name")
	if err != nil {
		fmt.Println(err)
	}
	email, err := cmd.Flags().GetString("email")
	if err != nil {
		fmt.Println(err)
	}
	organizationName, err := cmd.Flags().GetString("organization-name")
	if err != nil {
		fmt.Println(err)
	}
	role, err := cmd.Flags().GetString("role")
	if err != nil {
		fmt.Println(err)
	}
	roleEnum := accounts.Role(role)
	if !roleEnum.IsValid() {
		fmt.Println("Invalid role: " + role)
		return
	}

	params := accounts.RegisterUserInput{
		Name:             name,
		Email:            email,
		OrganizationName: organizationName,
		Role:             roleEnum,
	}
	if err := params.Validate(); err != nil {
		fmt.Println(err)
		return
	}

	_, err = application.AccountsService.RegisterUser(context.Background(), params)
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println("User registered successfully")
}
