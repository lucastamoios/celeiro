package application

import (
	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/config"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/metrics"
	"github.com/catrutech/celeiro/pkg/system"

	"go.uber.org/fx"
)

type Application struct {
	AccountsService  accounts.Service
	FinancialService financial.Service
}

func NewApplication(
	accountsService accounts.Service,
	financialService financial.Service,
) *Application {
	return &Application{
		AccountsService:  accountsService,
		FinancialService: financialService,
	}
}

func GetApplicationProvider() fx.Option {
	return fx.Provide(
		// Common
		config.New,
		database.New,
		transientdb.NewRedisDB,
		mailer.GetMailerType,
		mailer.NewMailer,
		system.NewSystem,
		metrics.NewMetrics,
		// Accounts
		accounts.NewRepository,
		accounts.New,
		// Financial
		financial.NewRepository,
		financial.New,
		// Application
		NewApplication,
	)
}

func GetApplication() *Application {
	var application *Application

	app := fx.New(
		GetApplicationProvider(),
		fx.Provide(logging.NewStdoutLogger),
		fx.Populate(&application),
		fx.NopLogger,
	)

	if err := app.Err(); err != nil {
		panic(err)
	}

	return application
}
