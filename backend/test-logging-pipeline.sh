#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="scaffold"
CONFIG_ROOT="/tmp/scaffold"
OTEL_COLLECTOR_HTTP_PORT=4318
LOKI_HTTP_PORT=3100
GRAFANA_PORT=3000

echo -e "${BLUE}🧪 Logging Pipeline Test Script${NC}"
echo "========================================"

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be ready..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            print_success "$service_name is ready!"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    print_error "$service_name is not ready after $((max_attempts * 2)) seconds"
    return 1
}

# Function to check if container is running
check_container() {
    local container_name=$1
    if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        return 0
    else
        return 1
    fi
}

# Step 1: Setup environment
print_status "Setting up environment..."

if [ ! -f ".env.dev" ]; then
    print_status "Creating .env.dev from .envrc..."
    cp .envrc .env.dev
fi

# Source environment variables
source .env.dev

# Step 2: Wait for services to be ready
print_status "Checking service readiness..."

# Wait for Loki
if ! wait_for_service "Loki" "http://localhost:$LOKI_HTTP_PORT/ready"; then
    print_error "Loki failed to start"
    exit 1
fi

# # Wait for OTel Collector (check if it's accepting HTTP requests)
# if ! wait_for_service "OTel Collector" "http://localhost:$OTEL_COLLECTOR_HTTP_PORT"; then
#     print_warning "OTel Collector health check failed, but continuing..."
# fi

# Wait for Grafana
if ! wait_for_service "Grafana" "http://localhost:$GRAFANA_PORT/api/health"; then
    print_error "Grafana failed to start"
    exit 1
fi

# Step 3: Build and start the application in background
print_status "Starting the application..."

# Start the application in background using air for live reload
air &
APP_PID=$!

# Wait for air to compile and start the application
print_status "Waiting for application to compile and start..."
sleep 8

# Step 5: Generate test logs
print_status "Generating test logs..."

# Send some HTTP requests to generate logs
for i in {1..5}; do
    echo "Sending test request $i..."
    curl -s "http://localhost:8080/hello" > /dev/null || true
    sleep 1
done

# Generate some error logs by hitting non-existent endpoints
for i in {1..3}; do
    echo "Sending error request $i..."
    curl -s "http://localhost:8080/nonexistent" > /dev/null || true
    sleep 1
done

print_success "Test logs generated!"

# Step 6: Wait for logs to propagate
print_status "Waiting for logs to propagate through the pipeline..."
sleep 10

# Step 7: Verify logs in Loki
print_status "Checking logs in Loki..."

# Query Loki for our service logs
LOKI_QUERY_URL="http://localhost:$LOKI_HTTP_PORT/loki/api/v1/query_range"
QUERY='{service_name="scaffold"}'
START_TIME=$(date -u -v-5M '+%Y-%m-%dT%H:%M:%SZ')
END_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

echo "Querying Loki for logs..."
# Use URL encoding approach that we know works
ENCODED_QUERY="http://localhost:$LOKI_HTTP_PORT/loki/api/v1/query_range?query=%7Bservice_name%3D%22scaffold%22%7D&start=$START_TIME&end=$END_TIME"
LOKI_RESPONSE=$(curl -s "$ENCODED_QUERY")

if echo "$LOKI_RESPONSE" | jq -e '.data.result | length > 0' >/dev/null 2>&1; then
    LOG_COUNT=$(echo "$LOKI_RESPONSE" | jq '.data.result | length')
    print_success "Found $LOG_COUNT log streams in Loki!"
    
    # Show a sample of the logs
    echo -e "\n${BLUE}Sample logs from Loki:${NC}"
    echo "$LOKI_RESPONSE" | jq -r '.data.result[0].values[0:3][] | .[1]' 2>/dev/null || echo "No log values found"
else
    print_warning "No logs found in Loki. This might indicate an issue with the pipeline."
fi

# Step 8: Test OTel Collector health endpoint
print_status "Checking OTel Collector health..."
OTEL_METRICS=$(curl -s "http://localhost:8888/metrics" || echo "Failed to get metrics")
if echo "$OTEL_METRICS" | grep -q "otelcol_receiver"; then
    print_success "OTel Collector is receiving telemetry data!"
    LOGS_RECEIVED=$(echo "$OTEL_METRICS" | grep "otelcol_receiver_accepted_log_records" | tail -1 || echo "0")
    print_status "Logs received by OTel Collector: $LOGS_RECEIVED"
else
    print_warning "OTel Collector metrics not found or collector not responding"
fi

# Step 9: Show verification commands
echo ""
echo -e "${BLUE}🔍 Manual Verification Commands:${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}1. Check Loki logs directly:${NC}"
echo "   curl -s 'http://localhost:$LOKI_HTTP_PORT/loki/api/v1/query_range?query=%7Bservice_name%3D%22scaffold%22%7D&start=$(date -u -v-10M '+%Y-%m-%dT%H:%M:%SZ')&end=$(date -u '+%Y-%m-%dT%H:%M:%SZ')' | jq '.data.result'"
echo ""
echo -e "${YELLOW}2. View logs in Grafana:${NC}"
echo "   Open: http://localhost:$GRAFANA_PORT"
echo "   Login: admin/admin"
echo "   Go to Explore > Loki > {service_name=\"scaffold\"}"
echo ""
echo -e "${YELLOW}3. Check OTel Collector metrics:${NC}"
echo "   curl http://localhost:8888/metrics | grep otelcol"
echo ""
echo -e "${YELLOW}4. Check container logs:${NC}"
echo "   docker logs ${PROJECT_NAME}_loki"
echo "   docker logs ${PROJECT_NAME}_otelcol"
echo ""
echo -e "${YELLOW}5. Direct log query with more details:${NC}"
echo "   curl -s 'http://localhost:$LOKI_HTTP_PORT/loki/api/v1/query_range?query=%7Bservice_name%3D%22scaffold%22%7D&start=$(date -u -v-30M '+%Y-%m-%dT%H:%M:%SZ')&end=$(date -u '+%Y-%m-%dT%H:%M:%SZ')' | jq ."

# Step 10: Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill air and the Go application processes
    echo "Stopping application processes..."
    pkill -f "air" 2>/dev/null || true
    pkill -f "backend/cmd/web/main.go" 2>/dev/null || true
    pkill -f "tmp/main" 2>/dev/null || true
    
    # Kill the specific PID we captured (make process)
    if [ ! -z "$APP_PID" ]; then
        kill $APP_PID 2>/dev/null || true
    fi
    
    # Kill docker compose if running
    if [ ! -z "$COMPOSE_PID" ]; then
        kill $COMPOSE_PID 2>/dev/null || true
    fi
    
    # Stop docker services
    make down
    
    # Clean up any leftover files
    rm -f tmp/main
}

# Set up trap for cleanup on script exit
trap cleanup EXIT

# Step 11: Interactive mode
echo ""
echo -e "${BLUE}🎯 Test Results Summary:${NC}"
echo "========================="
echo "- Infrastructure: Started"
echo "- Application: Running on http://localhost:8080"
echo "- Loki: http://localhost:$LOKI_HTTP_PORT"
echo "- Grafana: http://localhost:$GRAFANA_PORT (admin/admin)"
echo "- OTel Collector: http://localhost:$OTEL_COLLECTOR_HTTP_PORT"
echo "- OTel Metrics: http://localhost:8888/metrics"
echo ""
print_status "Test environment is ready! Press Ctrl+C to cleanup and exit."

# Keep the script running until user interrupts
while true; do
    sleep 10
    # Optionally generate more test logs periodically
    curl -s "http://localhost:8080/hello" > /dev/null || true
done 