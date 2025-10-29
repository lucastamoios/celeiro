package accounts

import (
	"os"

	"github.com/spf13/cobra"
)

var AccountsRootCmd = &cobra.Command{
	Use:   "accounts",
	Short: "Accounts commands",
	Long:  "Accounts commands",
}

func Execute() {
	err := AccountsRootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}
