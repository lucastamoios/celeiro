package otel

import (
	"context"
	"fmt"
	"net/http"

	"github.com/catrutech/celeiro/internal/config"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/trace"
)

// Provider manages OpenTelemetry tracing, metrics, and logging providers.
type Provider struct {
	tracerProvider *sdktrace.TracerProvider
	meterProvider  *sdkmetric.MeterProvider
	loggerProvider *sdklog.LoggerProvider

	tracer trace.Tracer
}

// InitProvider initializes the OpenTelemetry provider with traces, metrics, and logs.
func InitProvider(ctx context.Context, cfg *config.Config) (*Provider, error) {
	if !cfg.OTELEnabled {
		return &Provider{
			tracer: otel.Tracer(cfg.ServiceName),
		}, nil
	}

	res, err := createResource(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("creating resource: %w", err)
	}

	p := &Provider{}

	// Traces
	spanExporter, err := newSpanExporter(ctx, cfg.OTELEndpoint)
	if err != nil {
		return nil, fmt.Errorf("creating span exporter: %w", err)
	}
	p.tracerProvider = sdktrace.NewTracerProvider(
		sdktrace.WithSampler(sdktrace.ParentBased(sdktrace.AlwaysSample())),
		sdktrace.WithResource(res),
		sdktrace.WithBatcher(spanExporter),
	)
	otel.SetTracerProvider(p.tracerProvider)
	p.tracer = p.tracerProvider.Tracer(cfg.ServiceName)

	// Metrics
	metricExporter, err := newMetricExporter(ctx, cfg.OTELEndpoint)
	if err != nil {
		return nil, fmt.Errorf("creating metric exporter: %w", err)
	}
	p.meterProvider = sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter)),
	)
	otel.SetMeterProvider(p.meterProvider)

	// Logs
	logExporter, err := newLogExporter(ctx, cfg.OTELEndpoint)
	if err != nil {
		return nil, fmt.Errorf("creating log exporter: %w", err)
	}
	p.loggerProvider = sdklog.NewLoggerProvider(
		sdklog.WithResource(res),
		sdklog.WithProcessor(sdklog.NewBatchProcessor(logExporter)),
	)

	// Propagation
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	return p, nil
}

// StartTrace starts a new trace span.
func (p *Provider) StartTrace(ctx context.Context, spanName string, opts ...trace.SpanStartOption) (context.Context, trace.Span) {
	return p.tracer.Start(ctx, spanName, opts...)
}

// ExtractContext extracts trace context from HTTP headers.
func (p *Provider) ExtractContext(ctx context.Context, headers http.Header) context.Context {
	return otel.GetTextMapPropagator().Extract(ctx, propagation.HeaderCarrier(headers))
}

// GetLoggerProvider returns the logger provider for creating OTel-bridged loggers.
func (p *Provider) GetLoggerProvider() *sdklog.LoggerProvider {
	return p.loggerProvider
}

// GetMeterProvider returns the meter provider for creating domain-specific meters.
func (p *Provider) GetMeterProvider() *sdkmetric.MeterProvider {
	return p.meterProvider
}

// Stop shuts down all OpenTelemetry providers.
func (p *Provider) Stop(ctx context.Context) error {
	if p.tracerProvider != nil {
		if err := p.tracerProvider.Shutdown(ctx); err != nil {
			return fmt.Errorf("stopping tracer: %w", err)
		}
	}
	if p.meterProvider != nil {
		if err := p.meterProvider.Shutdown(ctx); err != nil {
			return fmt.Errorf("stopping meter: %w", err)
		}
	}
	if p.loggerProvider != nil {
		if err := p.loggerProvider.Shutdown(ctx); err != nil {
			return fmt.Errorf("stopping logger: %w", err)
		}
	}
	return nil
}
