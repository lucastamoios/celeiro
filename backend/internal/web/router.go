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
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Auth
	r.Post("/auth/request/", ah.RequestMagicLinkForExistingUser)
	r.Post("/auth/validate/", ah.Authenticate)

	r.Get("/accounts/me/", mw.RequireSession(ah.Me, []accounts.Permission{}))

	// Financial endpoints (all require authentication)
	r.Route("/financial", func(r chi.Router) {
		// Categories
		r.Get("/categories", mw.RequireSession(fh.ListCategories, []accounts.Permission{}))
		r.Post("/categories", mw.RequireSession(fh.CreateCategory, []accounts.Permission{}))

		// Accounts
		r.Get("/accounts", mw.RequireSession(fh.ListAccounts, []accounts.Permission{}))
		r.Post("/accounts", mw.RequireSession(fh.CreateAccount, []accounts.Permission{}))
		r.Get("/accounts/{accountId}", mw.RequireSession(fh.GetAccount, []accounts.Permission{}))

		// Transactions
		r.Get("/accounts/{accountId}/transactions", mw.RequireSession(fh.ListTransactions, []accounts.Permission{}))
		r.Post("/accounts/{accountId}/transactions/import", mw.RequireSession(fh.ImportOFX, []accounts.Permission{}))

		// Budgets
		r.Get("/budgets", mw.RequireSession(fh.ListBudgets, []accounts.Permission{}))
		r.Post("/budgets", mw.RequireSession(fh.CreateBudget, []accounts.Permission{}))
		r.Get("/budgets/{budgetId}", mw.RequireSession(fh.GetBudgetByID, []accounts.Permission{}))
	})

	return r
}
