#!/bin/bash

# Quick verification script for logging configuration

echo "🔍 Verifying Logging Configuration"
echo "================================="

# Check if required files exist
echo "✅ Checking required files..."
files=(".envrc" "docker-compose.yml" "infra/loki/config.yml" "infra/otelcol/config.yml" "backend/cmd/web/main.go" "backend/pkg/logging/logging.go")

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file exists"
    else
        echo "  ❌ $file missing"
        exit 1
    fi
done

# Check environment setup
echo ""
echo "🔧 Checking environment configuration..."

# Source environment if .env.dev exists, otherwise use .envrc
if [ -f ".env.dev" ]; then
    source .env.dev
    echo "  ✅ Using .env.dev"
else
    source .envrc
    echo "  ⚠️  Using .envrc (consider creating .env.dev)"
fi

# Verify key environment variables
vars=("OTEL_COLLECTOR_HTTP_PORT" "LOKI_HTTP_PORT" "GRAFANA_PORT")
for var in "${vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo "  ✅ $var=${!var}"
    else
        echo "  ❌ $var not set"
        exit 1
    fi
done

# Check endpoint configuration in main.go
echo ""
echo "🔍 Checking endpoint configuration..."
endpoint=$(grep -o 'localhost:[0-9]*' backend/cmd/web/main.go)
expected_endpoint="localhost:${OTEL_COLLECTOR_HTTP_PORT}"

if [ "$endpoint" = "$expected_endpoint" ]; then
    echo "  ✅ Endpoint correctly configured: $endpoint"
else
    echo "  ❌ Endpoint mismatch:"
    echo "     Found: $endpoint"
    echo "     Expected: $expected_endpoint"
fi

# Check OTel collector configuration
echo ""
echo "🔍 Checking OTel collector configuration..."
if grep -q "endpoint: 0.0.0.0:\${OTEL_COLLECTOR_HTTP_PORT:-4318}" infra/otelcol/config.yml; then
    echo "  ✅ OTel collector HTTP endpoint configured"
else
    echo "  ❌ OTel collector HTTP endpoint not found or misconfigured"
fi

if grep -q "endpoint: http://loki:\${LOKI_HTTP_PORT:-3100}/otlp" infra/otelcol/config.yml; then
    echo "  ✅ Loki endpoint configured in OTel collector"
else
    echo "  ❌ Loki endpoint not found or misconfigured in OTel collector"
fi

# Check if pipeline is configured
if grep -q "logs:" infra/otelcol/config.yml && grep -q "receivers: \[otlp\]" infra/otelcol/config.yml; then
    echo "  ✅ Logs pipeline configured"
else
    echo "  ❌ Logs pipeline not properly configured"
fi

echo ""
echo "📋 Configuration Summary:"
echo "========================"
echo "Application logs → OTel Collector (port ${OTEL_COLLECTOR_HTTP_PORT}) → Loki (port ${LOKI_HTTP_PORT}) → Grafana (port ${GRAFANA_PORT})"
echo ""
echo "🚀 Ready to test! Run: ./test-logging-pipeline.sh" 