package metrics

import (
	"github.com/catrutech/celeiro/internal/config"
	celeiroOtel "github.com/catrutech/celeiro/pkg/otel"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/metric"
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
}

// NewMetrics creates a new metrics instance using the centralized OTel provider.
func NewMetrics(cfg *config.Config, provider *celeiroOtel.Provider) (*Metrics, error) {
	if !cfg.OTELEnabled {
		return NewNoOpMetrics(), nil
	}

	// Use the centralized meter provider (set as global by pkg/otel)
	meter := otel.GetMeterProvider().Meter("github.com/catrutech/celeiro/financial")

	m := &Metrics{meter: meter}
	var err error

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

	return m, nil
}

// NewNoOpMetrics creates a no-op metrics instance for tests and disabled OTel.
func NewNoOpMetrics() *Metrics {
	return &Metrics{}
}
