package main

import (
	"context"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/catrutech/celeiro/internal/application"
	"github.com/catrutech/celeiro/internal/web"
	"github.com/catrutech/celeiro/pkg/logging"
	"go.uber.org/fx"
)

func main() {
	done := make(chan bool, 1)
	app := fx.New(
		application.GetApplicationProvider(),
		fx.Provide(
			logging.NewStdoutLogger,
			web.NewRouter,
			web.NewHTTPServer,
		),
		fx.Invoke(func(*http.Server) {}),
	)
	go gracefulShutdown(app, done)

	app.Run()
	<-done
	log.Println("Graceful shutdown complete.")
}

func gracefulShutdown(f *fx.App, done chan bool) {
	// Create context that listens for the interrupt signal from the OS.
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Listen for the interrupt signal.
	<-ctx.Done()

	log.Println("shutting down gracefully, press Ctrl+C again to force")
	stop() // Allow Ctrl+C to force shutdown

	// The context is used to inform the server it has 5 seconds to finish
	// the request it is currently handling
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := f.Stop(ctx); err != nil {
		log.Printf("Server forced to shutdown with error: %v", err)
	}

	log.Println("Server exiting")

	// Notify the main goroutine that the shutdown is complete
	done <- true
}
