/*
Copyright © 2025 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"os"

	"github.com/catrutech/celeiro/cmd/cli/cmd/accounts"
	"github.com/spf13/cobra"
)

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "cli",
	Short: "CLI commands",
	Long:  "CLI commands",
}

func Execute() {
	rootCmd.AddCommand(accounts.AccountsRootCmd)
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}
