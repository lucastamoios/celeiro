package web

import (
	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/application/accounts"
	accountsWeb "github.com/catrutech/celeiro/internal/web/accounts"
	financialWeb "github.com/catrutech/celeiro/internal/web/financial"
	"github.com/catrutech/celeiro/internal/web/middlewares"
	"github.com/catrutech/celeiro/pkg/logging"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

func NewRouter(application *application.Application, logger logging.Logger) *chi.Mux {
	r := chi.NewRouter()

	mw := middlewares.NewMiddleware(application, logger)
	ah := accountsWeb.NewHandler(application)
	fh := financialWeb.NewHandler(application)

	r.Use(mw.LogError)
	r.Use(mw.Session)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Active-Organization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Auth
	// Allow requesting a magic code for both existing and new users (auto-registration happens on validate)
	r.Post("/auth/request/", ah.RequestMagicLink)
	r.Post("/auth/validate/", ah.Authenticate)
	r.Post("/auth/google/", ah.AuthenticateWithGoogle)
	r.Post("/auth/password/", ah.AuthenticateWithPassword)

	r.Get("/accounts/me/", mw.RequireSession(ah.Me, []accounts.Permission{}))
	r.Post("/accounts/password/", mw.RequireSession(ah.SetPassword, []accounts.Permission{}))

	// Organization management
	r.Post("/organizations/default", mw.RequireSession(ah.SetDefaultOrganization, []accounts.Permission{}))
	r.Patch("/organizations/{orgId}", mw.RequireSession(ah.UpdateOrganization, []accounts.Permission{}))
	r.Get("/organizations/{orgId}/members", mw.RequireSession(ah.GetOrganizationMembers, []accounts.Permission{}))
	r.Get("/organizations/{orgId}/invites", mw.RequireSession(ah.GetPendingInvites, []accounts.Permission{}))
	r.Post("/organizations/{orgId}/invites", mw.RequireSession(ah.CreateOrganizationInvite, []accounts.Permission{accounts.PermissionCreateRegularUsers}))
	r.Delete("/organizations/{orgId}/invites/{inviteId}", mw.RequireSession(ah.CancelOrganizationInvite, []accounts.Permission{}))

	// Public invite acceptance (token-based auth)
	r.Post("/invites/accept", ah.AcceptOrganizationInvite)

	// Backoffice (requires super_admin permissions)
	r.Route("/backoffice", func(r chi.Router) {
		r.Get("/users", mw.RequireSession(ah.GetAllUsers, []accounts.Permission{accounts.PermissionViewAllUsers}))
		r.Get("/invites", mw.RequireSession(ah.GetPendingSystemInvites, []accounts.Permission{accounts.PermissionCreateSystemInvites}))
		r.Post("/invites", mw.RequireSession(ah.CreateSystemInvite, []accounts.Permission{accounts.PermissionCreateSystemInvites}))
	})

	// Public system invite acceptance (token-based auth)
	r.Post("/system-invites/accept", ah.AcceptSystemInvite)

	// Financial endpoints (all require authentication)
	r.Route("/financial", func(r chi.Router) {
		// Categories
		r.Get("/categories", mw.RequireSession(fh.ListCategories, []accounts.Permission{}))
		r.Post("/categories", mw.RequireSession(fh.CreateCategory, []accounts.Permission{}))
		r.Patch("/categories/{id}", mw.RequireSession(fh.UpdateCategory, []accounts.Permission{}))
		r.Delete("/categories/{id}", mw.RequireSession(fh.DeleteCategory, []accounts.Permission{}))

		// Accounts
		r.Get("/accounts", mw.RequireSession(fh.ListAccounts, []accounts.Permission{}))
		r.Post("/accounts", mw.RequireSession(fh.CreateAccount, []accounts.Permission{}))
		r.Get("/accounts/{accountId}", mw.RequireSession(fh.GetAccount, []accounts.Permission{}))

		// Transactions
		r.Get("/accounts/{accountId}/transactions", mw.RequireSession(fh.ListTransactions, []accounts.Permission{}))
		r.Get("/transactions/uncategorized", mw.RequireSession(fh.ListUncategorizedTransactions, []accounts.Permission{}))
		r.Post("/accounts/{accountId}/transactions", mw.RequireSession(fh.CreateTransaction, []accounts.Permission{}))
		r.Post("/accounts/{accountId}/transactions/import", mw.RequireSession(fh.ImportOFX, []accounts.Permission{}))
		r.Patch("/accounts/{accountId}/transactions/{transactionId}", mw.RequireSession(fh.UpdateTransaction, []accounts.Permission{}))

		// Budgets
		r.Get("/budgets", mw.RequireSession(fh.ListBudgets, []accounts.Permission{}))
		r.Post("/budgets", mw.RequireSession(fh.CreateBudget, []accounts.Permission{}))
		r.Get("/budgets/{budgetId}", mw.RequireSession(fh.GetBudgetByID, []accounts.Permission{}))
		r.Get("/budgets/{budgetId}/spending", mw.RequireSession(fh.GetBudgetSpending, []accounts.Permission{}))
		r.Get("/budgets/{budgetId}/progress", mw.RequireSession(fh.GetBudgetProgress, []accounts.Permission{}))

		// Budget Items
		r.Post("/budgets/{budgetId}/items", mw.RequireSession(fh.CreateBudgetItem, []accounts.Permission{}))
		r.Patch("/budgets/{budgetId}/items/{itemId}", mw.RequireSession(fh.UpdateBudgetItem, []accounts.Permission{}))
		r.Delete("/budgets/{budgetId}/items/{itemId}", mw.RequireSession(fh.DeleteBudgetItem, []accounts.Permission{}))

		// Category Budgets
		r.Get("/budgets/categories", mw.RequireSession(fh.ListCategoryBudgets, []accounts.Permission{}))
		r.Post("/budgets/categories", mw.RequireSession(fh.CreateCategoryBudget, []accounts.Permission{}))
		r.Get("/budgets/categories/{id}", mw.RequireSession(fh.GetCategoryBudget, []accounts.Permission{}))
		r.Put("/budgets/categories/{id}", mw.RequireSession(fh.UpdateCategoryBudget, []accounts.Permission{}))
		r.Delete("/budgets/categories/{id}", mw.RequireSession(fh.DeleteCategoryBudget, []accounts.Permission{}))
		r.Post("/budgets/categories/{id}/consolidate", mw.RequireSession(fh.ConsolidateCategoryBudget, []accounts.Permission{}))
		r.Post("/budgets/categories/copy", mw.RequireSession(fh.CopyCategoryBudgetsFromMonth, []accounts.Permission{}))

		// Planned Entries
		r.Get("/planned-entries", mw.RequireSession(fh.ListPlannedEntries, []accounts.Permission{}))
		r.Post("/planned-entries", mw.RequireSession(fh.CreatePlannedEntry, []accounts.Permission{}))
		r.Get("/planned-entries/patterns", mw.RequireSession(fh.GetSavedPatterns, []accounts.Permission{}))
		r.Get("/planned-entries/month", mw.RequireSession(fh.GetPlannedEntriesForMonth, []accounts.Permission{}))
		r.Get("/planned-entries/{id}", mw.RequireSession(fh.GetPlannedEntry, []accounts.Permission{}))
		r.Put("/planned-entries/{id}", mw.RequireSession(fh.UpdatePlannedEntry, []accounts.Permission{}))
		r.Delete("/planned-entries/{id}", mw.RequireSession(fh.DeletePlannedEntry, []accounts.Permission{}))
		r.Post("/planned-entries/{id}/generate", mw.RequireSession(fh.GenerateMonthlyInstances, []accounts.Permission{}))
		r.Post("/planned-entries/{id}/match", mw.RequireSession(fh.MatchPlannedEntry, []accounts.Permission{}))
		r.Delete("/planned-entries/{id}/match", mw.RequireSession(fh.UnmatchPlannedEntry, []accounts.Permission{}))
		r.Post("/planned-entries/{id}/dismiss", mw.RequireSession(fh.DismissPlannedEntry, []accounts.Permission{}))
		r.Delete("/planned-entries/{id}/dismiss", mw.RequireSession(fh.UndismissPlannedEntry, []accounts.Permission{}))

		// Monthly Snapshots
		r.Get("/snapshots", mw.RequireSession(fh.ListMonthlySnapshots, []accounts.Permission{}))
		r.Get("/snapshots/{id}", mw.RequireSession(fh.GetMonthlySnapshot, []accounts.Permission{}))

		// Transaction Planned Entry
		r.Get("/transactions/{id}/planned-entry", mw.RequireSession(fh.GetTransactionPlannedEntry, []accounts.Permission{}))

		// Income Planning
		r.Get("/income-planning", mw.RequireSession(fh.GetIncomePlanning, []accounts.Permission{}))

		// Patterns (formerly Advanced Patterns)
		r.Post("/patterns", mw.RequireSession(fh.CreateAdvancedPattern, []accounts.Permission{}))
		r.Get("/patterns", mw.RequireSession(fh.GetAdvancedPatterns, []accounts.Permission{}))
		r.Get("/patterns/{id}", mw.RequireSession(fh.GetAdvancedPattern, []accounts.Permission{}))
		r.Put("/patterns/{id}", mw.RequireSession(fh.UpdateAdvancedPattern, []accounts.Permission{}))
		r.Delete("/patterns/{id}", mw.RequireSession(fh.DeleteAdvancedPattern, []accounts.Permission{}))
		r.Post("/patterns/{id}/apply-retroactively", mw.RequireSession(fh.ApplyPatternRetroactively, []accounts.Permission{}))

		// Savings Goals
		r.Get("/savings-goals", mw.RequireSession(fh.ListSavingsGoals, []accounts.Permission{}))
		r.Post("/savings-goals", mw.RequireSession(fh.CreateSavingsGoal, []accounts.Permission{}))
		r.Get("/savings-goals/{id}", mw.RequireSession(fh.GetSavingsGoal, []accounts.Permission{}))
		r.Get("/savings-goals/{id}/progress", mw.RequireSession(fh.GetSavingsGoalProgress, []accounts.Permission{}))
		r.Get("/savings-goals/{id}/summary", mw.RequireSession(fh.GetSavingsGoalSummary, []accounts.Permission{}))
		r.Put("/savings-goals/{id}", mw.RequireSession(fh.UpdateSavingsGoal, []accounts.Permission{}))
		r.Delete("/savings-goals/{id}", mw.RequireSession(fh.DeleteSavingsGoal, []accounts.Permission{}))
		r.Post("/savings-goals/{id}/complete", mw.RequireSession(fh.CompleteSavingsGoal, []accounts.Permission{}))
		r.Post("/savings-goals/{id}/reopen", mw.RequireSession(fh.ReopenSavingsGoal, []accounts.Permission{}))
		r.Post("/savings-goals/{id}/contribute", mw.RequireSession(fh.AddContribution, []accounts.Permission{}))

		// Amazon Sync (Chrome Extension)
		r.Post("/amazon/sync", mw.RequireSession(fh.SyncAmazonOrders, []accounts.Permission{}))

		// Tags
		r.Get("/tags", mw.RequireSession(fh.ListTags, []accounts.Permission{}))
		r.Post("/tags", mw.RequireSession(fh.CreateTag, []accounts.Permission{}))
		r.Get("/tags/{id}", mw.RequireSession(fh.GetTag, []accounts.Permission{}))
		r.Patch("/tags/{id}", mw.RequireSession(fh.UpdateTag, []accounts.Permission{}))
		r.Delete("/tags/{id}", mw.RequireSession(fh.DeleteTag, []accounts.Permission{}))

		// Transaction Tags
		r.Get("/transactions/{id}/tags", mw.RequireSession(fh.GetTransactionTags, []accounts.Permission{}))
		r.Put("/transactions/{id}/tags", mw.RequireSession(fh.SetTransactionTags, []accounts.Permission{}))
	})

	return r
}
