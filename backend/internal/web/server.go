package web

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"github.com/catrutech/celeiro/pkg/logging"

	"github.com/go-chi/chi/v5"
	_ "github.com/joho/godotenv/autoload"
	"go.uber.org/fx"
)

func NewHTTPServer(lc fx.Lifecycle, router *chi.Mux, config *config.Config, logger logging.Logger) *http.Server {
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", config.Port),
		Handler:      router,
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
	lc.Append(fx.Hook{
		OnStart: func(ctx context.Context) error {
			ln, err := net.Listen("tcp", srv.Addr)
			if err != nil {
				return err
			}
			logger.Info(ctx, "Starting HTTP server", "addr", srv.Addr)
			go srv.Serve(ln)
			return nil

		},
		OnStop: func(ctx context.Context) error {
			logger.Info(ctx, "Stopping HTTP server")
			return srv.Shutdown(ctx)
		},
	})

	return srv
}
