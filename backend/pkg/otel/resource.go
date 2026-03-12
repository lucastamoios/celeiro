package otel

import (
	"context"
	"errors"
	"fmt"

	"github.com/catrutech/celeiro/internal/config"

	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.30.0"
)

func createResource(ctx context.Context, cfg *config.Config) (*resource.Resource, error) {
	res, err := resource.New(ctx,
		resource.WithFromEnv(),
		resource.WithProcess(),
		resource.WithOS(),
		resource.WithContainer(),
		resource.WithHost(),
		resource.WithTelemetrySDK(),
		resource.WithAttributes(
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceInstanceID(cfg.ServiceInstanceID),
			semconv.ServiceVersion(cfg.ServiceVersion),
			semconv.DeploymentEnvironmentName(cfg.Environment),
		),
	)
	if errors.Is(err, resource.ErrPartialResource) || errors.Is(err, resource.ErrSchemaURLConflict) {
		fmt.Printf("partial resource creation: %v\n", err)
	} else if err != nil {
		return nil, fmt.Errorf("resource.New: %w", err)
	}

	return res, nil
}
