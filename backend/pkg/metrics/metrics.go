package metrics

import (
	"context"
	"fmt"
	"time"

	"github.com/catrutech/celeiro/internal/config"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/metric"
	sdkmetric "go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.30.0"
)

// Metrics provides access to application metrics
type Metrics struct {
	meter metric.Meter

	// OFX Import Metrics
	OFXImportTotal       metric.Int64Counter
	OFXImportSuccess     metric.Int64Counter
	OFXImportFailure     metric.Int64Counter
	OFXParseErrors       metric.Int64Counter
	OFXTransactionCount  metric.Int64Histogram
	OFXParseDuration     metric.Float64Histogram
	OFXImportDuration    metric.Float64Histogram

	// Budget Calculation Metrics
	BudgetCalculationTotal    metric.Int64Counter
	BudgetCalculationDuration metric.Float64Histogram
	BudgetCalculationErrors   metric.Int64Counter

	// Classification Rule Metrics
	ClassificationRuleExecutions metric.Int64Counter
	ClassificationRuleMatches    metric.Int64Counter
	ClassificationRuleDuration   metric.Float64Histogram

	// Transaction Matching Metrics
	AutoMatchAttempts  metric.Int64Counter
	AutoMatchSuccesses metric.Int64Counter
	AutoMatchDuration  metric.Float64Histogram
	MatchScore         metric.Float64Histogram
}

// NewMetrics creates a new metrics instance with OpenTelemetry
func NewMetrics(cfg *config.Config) (*Metrics, error) {
	// If OTEL is disabled, return no-op metrics
	if !cfg.OTELEnabled {
		return NewNoOpMetrics(), nil
	}

	// Set resource attributes (without schema URL to avoid conflicts)
	res := resource.NewWithAttributes(
		"",
		semconv.ServiceName(cfg.ServiceName),
		semconv.ServiceInstanceID(cfg.ServiceInstanceID),
		semconv.ServiceVersion(cfg.ServiceVersion),
	)

	// Create OTLP HTTP exporter
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	metricExporter, err := otlpmetrichttp.New(
		ctx,
		otlpmetrichttp.WithInsecure(),
		otlpmetrichttp.WithEndpoint(cfg.OTELEndpoint),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create metric exporter: %w", err)
	}

	// Create meter provider
	meterProvider := sdkmetric.NewMeterProvider(
		sdkmetric.WithResource(res),
		sdkmetric.WithReader(sdkmetric.NewPeriodicReader(metricExporter,
			sdkmetric.WithInterval(10*time.Second),
		)),
	)

	// Set global meter provider
	otel.SetMeterProvider(meterProvider)

	// Create meter
	meter := meterProvider.Meter("github.com/catrutech/celeiro/financial")

	// Initialize all metrics
	m := &Metrics{meter: meter}

	// OFX Import Metrics
	m.OFXImportTotal, err = meter.Int64Counter(
		"financial.ofx.import.total",
		metric.WithDescription("Total number of OFX import attempts"),
		metric.WithUnit("{imports}"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXImportSuccess, err = meter.Int64Counter(
		"financial.ofx.import.success",
		metric.WithDescription("Number of successful OFX imports"),
		metric.WithUnit("{imports}"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXImportFailure, err = meter.Int64Counter(
		"financial.ofx.import.failure",
		metric.WithDescription("Number of failed OFX imports"),
		metric.WithUnit("{imports}"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXParseErrors, err = meter.Int64Counter(
		"financial.ofx.parse.errors",
		metric.WithDescription("Number of OFX parsing errors"),
		metric.WithUnit("{errors}"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXTransactionCount, err = meter.Int64Histogram(
		"financial.ofx.transaction.count",
		metric.WithDescription("Number of transactions per OFX import"),
		metric.WithUnit("{transactions}"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXParseDuration, err = meter.Float64Histogram(
		"financial.ofx.parse.duration",
		metric.WithDescription("Duration of OFX parsing in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return nil, err
	}

	m.OFXImportDuration, err = meter.Float64Histogram(
		"financial.ofx.import.duration",
		metric.WithDescription("Duration of complete OFX import in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return nil, err
	}

	// Budget Calculation Metrics
	m.BudgetCalculationTotal, err = meter.Int64Counter(
		"financial.budget.calculation.total",
		metric.WithDescription("Total number of budget calculations"),
		metric.WithUnit("{calculations}"),
	)
	if err != nil {
		return nil, err
	}

	m.BudgetCalculationDuration, err = meter.Float64Histogram(
		"financial.budget.calculation.duration",
		metric.WithDescription("Duration of budget calculations in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return nil, err
	}

	m.BudgetCalculationErrors, err = meter.Int64Counter(
		"financial.budget.calculation.errors",
		metric.WithDescription("Number of budget calculation errors"),
		metric.WithUnit("{errors}"),
	)
	if err != nil {
		return nil, err
	}

	// Classification Rule Metrics
	m.ClassificationRuleExecutions, err = meter.Int64Counter(
		"financial.classification.rule.executions",
		metric.WithDescription("Number of classification rule executions"),
		metric.WithUnit("{executions}"),
	)
	if err != nil {
		return nil, err
	}

	m.ClassificationRuleMatches, err = meter.Int64Counter(
		"financial.classification.rule.matches",
		metric.WithDescription("Number of classification rule matches"),
		metric.WithUnit("{matches}"),
	)
	if err != nil {
		return nil, err
	}

	m.ClassificationRuleDuration, err = meter.Float64Histogram(
		"financial.classification.rule.duration",
		metric.WithDescription("Duration of classification rule execution in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return nil, err
	}

	// Transaction Matching Metrics
	m.AutoMatchAttempts, err = meter.Int64Counter(
		"financial.transaction.automatch.attempts",
		metric.WithDescription("Number of auto-match attempts"),
		metric.WithUnit("{attempts}"),
	)
	if err != nil {
		return nil, err
	}

	m.AutoMatchSuccesses, err = meter.Int64Counter(
		"financial.transaction.automatch.successes",
		metric.WithDescription("Number of successful auto-matches"),
		metric.WithUnit("{matches}"),
	)
	if err != nil {
		return nil, err
	}

	m.AutoMatchDuration, err = meter.Float64Histogram(
		"financial.transaction.automatch.duration",
		metric.WithDescription("Duration of auto-match operations in seconds"),
		metric.WithUnit("s"),
	)
	if err != nil {
		return nil, err
	}

	m.MatchScore, err = meter.Float64Histogram(
		"financial.transaction.match.score",
		metric.WithDescription("Match confidence scores"),
		metric.WithUnit("{score}"),
	)
	if err != nil {
		return nil, err
	}

	return m, nil
}

// NoOpMetrics creates a metrics instance that does nothing (for tests)
type NoOpMetrics struct{}

func (n *NoOpMetrics) OFXImportTotal() metric.Int64Counter       { return nil }
func (n *NoOpMetrics) OFXImportSuccess() metric.Int64Counter     { return nil }
func (n *NoOpMetrics) OFXImportFailure() metric.Int64Counter     { return nil }
func (n *NoOpMetrics) OFXParseErrors() metric.Int64Counter       { return nil }
func (n *NoOpMetrics) OFXTransactionCount() metric.Int64Histogram { return nil }
func (n *NoOpMetrics) OFXParseDuration() metric.Float64Histogram { return nil }
func (n *NoOpMetrics) OFXImportDuration() metric.Float64Histogram { return nil }

// NewNoOpMetrics creates a no-op metrics instance for tests
func NewNoOpMetrics() *Metrics {
	return &Metrics{}
}
