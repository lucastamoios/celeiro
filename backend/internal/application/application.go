package application

import (
	"context"

	"github.com/catrutech/celeiro/internal/application/accounts"
	"github.com/catrutech/celeiro/internal/application/financial"
	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/internal/integrations/pluggy"
	database "github.com/catrutech/celeiro/pkg/database/persistent"
	transientdb "github.com/catrutech/celeiro/pkg/database/transient"
	"github.com/catrutech/celeiro/pkg/logging"
	"github.com/catrutech/celeiro/pkg/mailer"
	"github.com/catrutech/celeiro/pkg/metrics"
	celeiroOtel "github.com/catrutech/celeiro/pkg/otel"
	"github.com/catrutech/celeiro/pkg/system"

	"go.uber.org/fx"
)

type Application struct {
	AccountsService  accounts.Service
	FinancialService financial.Service
	Mailer           mailer.Mailer
	PluggyClient     *pluggy.Client
}

func NewApplication(
	accountsService accounts.Service,
	financialService financial.Service,
	m mailer.Mailer,
	pluggyClient *pluggy.Client,
) *Application {
	return &Application{
		AccountsService:  accountsService,
		FinancialService: financialService,
		Mailer:           m,
		PluggyClient:     pluggyClient,
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
		pluggy.New,
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
		fx.Provide(
			logging.NewStdoutLogger,
			provideDefaultOTelProvider,
		),
		fx.Populate(&application),
		fx.NopLogger,
	)

	if err := app.Err(); err != nil {
		panic(err)
	}

	return application
}

// provideDefaultOTelProvider creates an OTel provider for non-web contexts (CLI, tests).
func provideDefaultOTelProvider(cfg *config.Config) *celeiroOtel.Provider {
	provider, _ := celeiroOtel.InitProvider(context.Background(), cfg)
	return provider
}
