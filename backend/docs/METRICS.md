# Financial Operations Metrics

This document describes the OpenTelemetry metrics exposed by the financial service for monitoring in Grafana and other observability platforms.

## Setup

Metrics are automatically exported to the OpenTelemetry collector endpoint specified in the `OTEL_ENDPOINT` environment variable (default: `localhost:4317`).

### Environment Variables

```bash
OTEL_ENDPOINT=localhost:4317      # OTel collector endpoint
SERVICE_NAME=celeiro-backend      # Service name for metrics
SERVICE_VERSION=1.0.0             # Service version
SERVICE_INSTANCE_ID=instance-1    # Instance identifier
```

## Metrics Reference

### OFX Import Metrics

#### `financial.ofx.import.total`
- **Type**: Counter
- **Description**: Total number of OFX import attempts
- **Unit**: `{imports}`
- **Labels**: None
- **Usage**: Track overall import volume

#### `financial.ofx.import.success`
- **Type**: Counter
- **Description**: Number of successful OFX imports
- **Unit**: `{imports}`
- **Labels**: None
- **Usage**: Calculate success rate = success / total

#### `financial.ofx.import.failure`
- **Type**: Counter
- **Description**: Number of failed OFX imports
- **Unit**: `{imports}`
- **Labels**: None
- **Usage**: Alert on elevated failure rates

#### `financial.ofx.parse.errors`
- **Type**: Counter
- **Description**: Number of OFX parsing errors
- **Unit**: `{errors}`
- **Labels**: None
- **Usage**: Monitor data quality issues

#### `financial.ofx.transaction.count`
- **Type**: Histogram
- **Description**: Distribution of transaction counts per import
- **Unit**: `{transactions}`
- **Labels**: None
- **Usage**: Understand typical import sizes, detect anomalies

#### `financial.ofx.parse.duration`
- **Type**: Histogram
- **Description**: Time taken to parse OFX data
- **Unit**: `s` (seconds)
- **Labels**: None
- **Usage**: Monitor parser performance, detect slowdowns

#### `financial.ofx.import.duration`
- **Type**: Histogram
- **Description**: Total time for complete import (parse + DB + matching)
- **Unit**: `s` (seconds)
- **Labels**: None
- **Usage**: Track end-to-end latency, set SLOs

### Budget Calculation Metrics

#### `financial.budget.calculation.total`
- **Type**: Counter
- **Description**: Total number of budget calculations
- **Unit**: `{calculations}`
- **Labels**: None
- **Usage**: Track calculation frequency

#### `financial.budget.calculation.duration`
- **Type**: Histogram
- **Description**: Time taken to calculate budget progress
- **Unit**: `s` (seconds)
- **Labels**: None
- **Usage**: Monitor calculation performance

#### `financial.budget.calculation.errors`
- **Type**: Counter
- **Description**: Number of budget calculation errors
- **Unit**: `{errors}`
- **Labels**: None
- **Usage**: Alert on calculation failures

### Transaction Matching Metrics

#### `financial.transaction.automatch.attempts`
- **Type**: Counter
- **Description**: Number of auto-match attempts
- **Unit**: `{attempts}`
- **Labels**: None
- **Usage**: Track matching usage

#### `financial.transaction.automatch.successes`
- **Type**: Counter
- **Description**: Number of successful auto-matches
- **Unit**: `{matches}`
- **Labels**: None
- **Usage**: Calculate match rate = successes / attempts

#### `financial.transaction.automatch.duration`
- **Type**: Histogram
- **Description**: Time taken for auto-match operations
- **Unit**: `s` (seconds)
- **Labels**: None
- **Usage**: Monitor matching performance

#### `financial.transaction.match.score`
- **Type**: Histogram
- **Description**: Distribution of match confidence scores (0.0-1.0)
- **Unit**: `{score}`
- **Labels**: None
- **Usage**: Analyze matching accuracy, tune thresholds

## Grafana Dashboards

### Quick Start Dashboard

```json
{
  "dashboard": {
    "title": "Financial Operations",
    "panels": [
      {
        "title": "OFX Import Success Rate",
        "targets": [{
          "expr": "rate(financial_ofx_import_success[5m]) / rate(financial_ofx_import_total[5m])"
        }]
      },
      {
        "title": "Import Duration (P95)",
        "targets": [{
          "expr": "histogram_quantile(0.95, rate(financial_ofx_import_duration_bucket[5m]))"
        }]
      },
      {
        "title": "Auto-Match Success Rate",
        "targets": [{
          "expr": "rate(financial_transaction_automatch_successes[5m]) / rate(financial_transaction_automatch_attempts[5m])"
        }]
      }
    ]
  }
}
```

### Key Queries

#### OFX Import Success Rate (Last 5 minutes)
```promql
rate(financial_ofx_import_success[5m]) / rate(financial_ofx_import_total[5m]) * 100
```

#### Average Transactions Per Import
```promql
rate(financial_ofx_transaction_count_sum[5m]) / rate(financial_ofx_transaction_count_count[5m])
```

#### P95 Import Latency
```promql
histogram_quantile(0.95, rate(financial_ofx_import_duration_bucket[5m]))
```

#### Auto-Match Effectiveness
```promql
rate(financial_transaction_automatch_successes[5m]) / rate(financial_transaction_automatch_attempts[5m]) * 100
```

#### Parse Time as % of Total Import Time
```promql
(
  rate(financial_ofx_parse_duration_sum[5m]) / rate(financial_ofx_parse_duration_count[5m])
) / (
  rate(financial_ofx_import_duration_sum[5m]) / rate(financial_ofx_import_duration_count[5m])
) * 100
```

## Alerts

### Recommended Alert Rules

#### High Import Failure Rate
```yaml
- alert: HighOFXImportFailureRate
  expr: |
    rate(financial_ofx_import_failure[5m]) / rate(financial_ofx_import_total[5m]) > 0.10
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "OFX import failure rate above 10%"
```

#### Slow Import Performance
```yaml
- alert: SlowOFXImports
  expr: |
    histogram_quantile(0.95, rate(financial_ofx_import_duration_bucket[5m])) > 5
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "P95 import latency above 5 seconds"
```

#### Low Auto-Match Rate
```yaml
- alert: LowAutoMatchRate
  expr: |
    rate(financial_transaction_automatch_successes[15m]) / rate(financial_transaction_automatch_attempts[15m]) < 0.30
  for: 15m
  labels:
    severity: info
  annotations:
    summary: "Auto-match success rate below 30%"
```

#### Budget Calculation Errors
```yaml
- alert: BudgetCalculationErrors
  expr: |
    rate(financial_budget_calculation_errors[5m]) > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Budget calculations are failing"
```

## SLOs (Service Level Objectives)

### Suggested SLOs

| Metric | Target | Measurement Window |
|--------|--------|-------------------|
| OFX Import Success Rate | ≥ 99% | 30 days |
| Import P95 Latency | ≤ 2 seconds | 7 days |
| Parse P95 Latency | ≤ 100ms | 7 days |
| Budget Calc Success Rate | ≥ 99.9% | 30 days |
| Auto-Match Attempt Rate | ≥ 50% of imports | 30 days |

## Troubleshooting

### High Parse Errors
**Symptom**: `financial.ofx.parse.errors` increasing

**Possible Causes**:
- Malformed OFX files from banks
- Unsupported OFX versions
- Encoding issues

**Investigation**:
1. Check application logs for parse error details
2. Review OFX file samples causing errors
3. Validate against OFX schema

### High Import Latency
**Symptom**: `financial.ofx.import.duration` P95 > 5s

**Possible Causes**:
- Database connection pool exhaustion
- Large transaction volumes
- Slow auto-matching queries

**Investigation**:
1. Compare parse duration vs total duration
2. Check database query performance
3. Review auto-match pattern count
4. Monitor database connection pool metrics

### Low Auto-Match Rate
**Symptom**: `financial.transaction.automatch.successes` / `attempts` < 30%

**Possible Causes**:
- Insufficient saved patterns
- Pattern matching thresholds too strict
- Diverse transaction descriptions

**Investigation**:
1. Check pattern coverage per category
2. Review match score distribution
3. Analyze unmatched transaction patterns
4. Consider adjusting confidence thresholds

## Integration Examples

### Docker Compose with Grafana Stack

```yaml
version: '3.8'
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
    volumes:
      - ./otel-config.yaml:/etc/otel-config.yaml
    command: ["--config=/etc/otel-config.yaml"]

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana

  celeiro-backend:
    build: .
    environment:
      - OTEL_ENDPOINT=otel-collector:4317
      - SERVICE_NAME=celeiro-backend
    depends_on:
      - otel-collector
```

### OpenTelemetry Collector Config

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  logging:
    loglevel: debug

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus, logging]
```

## Performance Impact

Metrics collection has minimal performance overhead:
- **CPU**: < 1% additional CPU usage
- **Memory**: ~10MB for metric storage
- **Latency**: < 1ms per metric recording
- **Network**: ~1KB/s to OTel collector

Metrics are recorded asynchronously and do not block application logic.

## Future Enhancements

Planned metrics additions:
- **Classification Rules**: Rule execution count, match rate, duration
- **Category Analysis**: Transaction distribution by category
- **Budget Alerts**: Over-budget detection, threshold violations
- **Data Quality**: Duplicate detection rate, data consistency checks

For questions or feature requests, see the main project documentation.
